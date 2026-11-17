const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
// Ensure dotenv is loaded from backend/.env
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { supabaseAdmin } = require('../utils/supabaseAdmin');
const { getSaarthiSystemPrompt } = require('../src/mentor/systemPrompt');
const { getStudentMemories, extractAndStoreFacts } = require('../src/mentor/memoryService');
const { retrieve } = require('../src/rag/retrieval');
const {
  getGeminiApiKey,
  generateGroqCompletion,
  openGroqStream,
  isGroqConfigured,
  raceAiProviders
} = require('../utils/groqFallback');

// Configure Gemini Model (defaults to gemini-2.5-flash)
const GEMINI_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';
const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-flash-latest'];

function getCandidateModels() {
  const configured = process.env.GEMINI_CHAT_MODEL || GEMINI_MODEL;
  const seen = new Set();
  return [configured, ...FALLBACK_MODELS].filter((m) => {
    const clean = String(m || '').trim();
    if (!clean || seen.has(clean)) return false;
    seen.add(clean);
    return true;
  });
}

function isRetryableModelError(err) {
  const msg = String(err?.message || '');
  return (
    err?.status === 503 ||
    err?.status === 404 ||
    /503|404|Service Unavailable|high demand|not found|is not supported/i.test(msg)
  );
}

/**
 * Helper to initialize Gemini Generative Model with active System Instructions
 */
function getGeminiModel(systemInstruction, modelName = GEMINI_MODEL) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return null;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: systemInstruction || undefined
  });
}

/**
 * Create a new chat session
 * POST /api/mentor/sessions
 */
exports.createSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title = 'New Conversation', mode = 'doubt', subject = 'physics' } = req.body;

    const { data, error } = await supabaseAdmin
      .from('chat_sessions')
      .insert({
        user_id: userId,
        title,
        mode,
        subject
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      data
    });
  } catch (err) {
    console.error('Create session error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create session', error: err.message });
  }
};

/**
 * List all sessions for the logged-in student (optional ?mode=mentor filter)
 * GET /api/mentor/sessions
 */
exports.getSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    let query = supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (req.query.mode) {
      query = query.eq('mode', req.query.mode);
    }

    const { data, error } = await query;
    if (error) throw error;

    return res.json({
      success: true,
      data: data || []
    });
  } catch (err) {
    console.error('Get sessions error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch sessions', error: err.message });
  }
};

/**
 * Get messages of a specific session
 * GET /api/mentor/sessions/:id
 */
exports.getSessionMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify session ownership
    const { data: session, error: sessErr } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (sessErr || !session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const { data: messages, error: msgErr } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('session_id', id)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (msgErr) throw msgErr;

    return res.json({
      success: true,
      session,
      messages: messages || []
    });
  } catch (err) {
    console.error('Get session messages error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch messages', error: err.message });
  }
};

/**
 * Rename/Update a session
 * PATCH /api/mentor/sessions/:id
 */
exports.updateSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('chat_sessions')
      .update({ title: title.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error('Update session error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update session', error: err.message });
  }
};

/**
 * Delete a session
 * DELETE /api/mentor/sessions/:id
 */
exports.deleteSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('chat_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    return res.json({
      success: true,
      message: 'Session deleted'
    });
  } catch (err) {
    console.error('Delete session error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete session', error: err.message });
  }
};

/**
 * Core internal handler to execute a Gemini chat turn with multi-turn memory, image support, & curriculum RAG
 */
async function processChatTurn({
  userId,
  userMetadata,
  sessionId,
  content,
  image,
  mimeType,
  mode,
  subject,
  classLevel,
  language,
  moduleTitle,
  currentTopic
}) {
  const activeMode = mode || 'doubt';
  const activeSubject = subject || 'physics';

  // 1. Process image if attached (Phase 14)
  let cleanBase64 = null;
  let cleanMimeType = mimeType || 'image/jpeg';
  const userSources = [];

  if (image && typeof image === 'string') {
    if (image.startsWith('data:')) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        cleanMimeType = match[1];
        cleanBase64 = match[2];
      } else {
        cleanBase64 = image.replace(/^data:[^;]+;base64,/, '');
      }
    } else {
      cleanBase64 = image;
    }

    // Size limit check (max ~10MB)
    if (cleanBase64.length > 14 * 1024 * 1024) {
      throw new Error('Image size exceeds 10MB limit. Please upload a smaller image.');
    }

    userSources.push({
      type: 'image_attachment',
      mimeType: cleanMimeType,
      dataUrl: image.startsWith('data:') ? image : `data:${cleanMimeType};base64,${image}`
    });
  }

  const effectiveContent = (content && content.trim()) || (cleanBase64 ? 'Please solve and explain the question in this image step-by-step.' : '');

  // 2. Record user message in chat_messages table
  const { data: userMsg, error: uErr } = await supabaseAdmin
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      user_id: userId,
      role: 'user',
      content: effectiveContent,
      sources: userSources
    })
    .select()
    .single();

  if (uErr) throw uErr;

  // 3. Update session title if default (Phase 13: meaningful conversation title)
  const { data: currentSession } = await supabaseAdmin
    .from('chat_sessions')
    .select('title')
    .eq('id', sessionId)
    .maybeSingle();

  if (currentSession && (currentSession.title.startsWith('New ') || currentSession.title === 'Untitled')) {
    let newTitle = effectiveContent;
    if (cleanBase64 && (!content || content.length < 5)) {
      newTitle = `${(moduleTitle || activeSubject).toUpperCase()} Diagram Question`;
    } else {
      newTitle = newTitle.replace(/^[#*>\s]+/, '').slice(0, 36) + (newTitle.length > 36 ? '...' : '');
    }
    await supabaseAdmin
      .from('chat_sessions')
      .update({ title: newTitle, updated_at: new Date().toISOString() })
      .eq('id', sessionId);
  }

  // 4. Retrieve recent conversation history from this session (up to 8 turns for context window)
  const { data: pastMsgs } = await supabaseAdmin
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(8);

  const chronologicalHistory = (pastMsgs || []).reverse();
  const priorHistory = chronologicalHistory.slice(0, -1);

  // Format history for Gemini SDK
  const geminiHistory = priorHistory.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  while (geminiHistory.length > 0 && geminiHistory[0].role !== 'user') {
    geminiHistory.shift();
  }

  // 5. Retrieve relevant CBSE textbook excerpts via RAG
  let retrievedChunks = [];
  try {
    retrievedChunks = await retrieve(
      effectiveContent,
      {
        board: 'CBSE',
        classLevel: Number(classLevel),
        subject: activeSubject,
        language,
        userId,
        minSimilarity: 0.15
      },
      3
    );
  } catch (ragErr) {
    console.warn('RAG retrieval warning:', ragErr.message);
  }

  // 6. Retrieve student knowledge base & past weaknesses
  let memories = [];
  try {
    memories = await getStudentMemories(userId, activeSubject);
  } catch (memErr) {
    console.warn('Memory retrieval warning:', memErr.message);
  }

  // 7. Build dynamic CBSE educational system instructions
  const systemPrompt = getSaarthiSystemPrompt({
    mode: activeMode,
    board: 'CBSE',
    classLevel: Number(classLevel),
    language,
    studentName: userMetadata?.full_name || 'Student',
    subject: activeSubject,
    moduleTitle,
    currentTopic
  });

  // 8. Enrich current prompt with retrieved context
  let userTurnText = effectiveContent;
  const contextSegments = [];
  if (moduleTitle || currentTopic) {
    contextSegments.push(`[ACTIVE STUDY MODULE: ${moduleTitle || currentTopic} in ${activeSubject.toUpperCase()}]`);
  }
  if (memories.length > 0) {
    contextSegments.push(`[STUDENT LEARNING CONTEXT & WEAKNESSES]:\n${memories.map((m) => `- ${m.text}`).join('\n')}`);
  }
  if (retrievedChunks.length > 0) {
    contextSegments.push(
      `[OFFICIAL NCERT / CBSE TEXTBOOK PASSAGES (Ground your answer on these facts)]:\n${retrievedChunks
        .map((c, i) => `[Source ${i + 1}] (${c.chapter}):\n${c.content}`)
        .join('\n\n')}`
    );
  }

  if (contextSegments.length > 0) {
    userTurnText = `${contextSegments.join('\n\n')}\n\n[STUDENT INQUIRY]:\n${effectiveContent}`;
  }

  // 9. Call BOTH Gemini and Groq in parallel and respond with whichever finishes first
  let replyText = '';
  const hasGeminiKey = Boolean(getGeminiApiKey());
  const canUseGroq = isGroqConfigured() && (!cleanBase64 || Boolean(process.env.GROQ_VISION_MODEL));

  let promptPayload = userTurnText;
  if (cleanBase64) {
    promptPayload = [
      {
        inlineData: {
          mimeType: cleanMimeType,
          data: cleanBase64
        }
      },
      userTurnText
    ];
  }

  const runGemini = async () => {
    const candidates = getCandidateModels();
    let lastErr = null;
    for (let i = 0; i < candidates.length; i++) {
      const modelName = candidates[i];
      try {
        const geminiModel = getGeminiModel(systemPrompt, modelName);
        const chat = geminiModel.startChat({ history: geminiHistory });
        const result = await chat.sendMessage(promptPayload);
        const text = (await result.response).text().trim();
        if (text) return { text, model: modelName };
      } catch (apiErr) {
        lastErr = apiErr;
        console.warn(`Gemini model "${modelName}" failed:`, apiErr.message);
        if (!isRetryableModelError(apiErr) || i === candidates.length - 1) {
          throw apiErr;
        }
      }
    }
    throw lastErr || new Error('Gemini returned empty response');
  };

  const runGroq = () =>
    generateGroqCompletion({
      systemInstruction: systemPrompt,
      history: geminiHistory,
      userText: userTurnText,
      imageBase64: cleanBase64,
      mimeType: cleanMimeType
    });

  try {
    const winner = await raceAiProviders({
      geminiFn: hasGeminiKey ? runGemini : null,
      groqFn: canUseGroq ? runGroq : null
    });
    replyText = winner.text;
    console.info(`[mentor] Answered first by ${winner.provider} (${winner.model})`);
  } catch (raceErr) {
    if (raceErr.code === 'NO_AI_PROVIDER') {
      replyText =
        '⚠️ **Saarthi AI Core Offline**: Neither `GEMINI_API_KEY` nor `GROQ_API_KEY` is configured in `backend/.env`. Please set at least one key to activate live AI.';
    } else {
      const details = raceErr.message || 'Both Gemini and Groq failed to respond.';
      console.error('All AI providers failed:', details);
      if (/API_KEY_INVALID|key not valid|Invalid API Key/i.test(details)) {
        replyText =
          '⚠️ **Saarthi Configuration Notice**: The configured AI API keys appear invalid. Please verify `GEMINI_API_KEY` and `GROQ_API_KEY` in `backend/.env`.';
      } else if (/429|quota|RESOURCE_EXHAUSTED|rate/i.test(details)) {
        replyText =
          '⏳ **High Traffic**: Both Gemini and Groq rate limits were hit. Please wait a few seconds before asking your next question.';
      } else {
        replyText = `I encountered an unexpected issue while communicating with the AI services (${details.slice(0, 120)}...). Please try asking your question again in a moment.`;
      }
    }
  }

  // 10. Citations metadata
  const sources = (retrievedChunks || []).map((c) => ({
    id: c.id,
    chapter: c.chapter,
    source: c.source,
    page: c.page || 1,
    similarity: c.similarity
  }));

  // 11. Save assistant message to Supabase
  const { data: assistantMsg, error: aErr } = await supabaseAdmin
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      user_id: userId,
      role: 'assistant',
      content: replyText,
      sources
    })
    .select()
    .single();

  if (aErr) throw aErr;

  // 12. Update session timestamp
  await supabaseAdmin
    .from('chat_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  // 13. Extract facts asynchronously for long-term memory
  extractAndStoreFacts(userId, effectiveContent, activeSubject).catch((err) =>
    console.warn('Fact extraction non-blocking error:', err)
  );

  return {
    assistantMsg,
    reply: replyText,
    sources
  };
}

/**
 * Send a message within a specific session
 * POST /api/mentor/sessions/:id/messages
 */
exports.sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: sessionId } = req.params;
    const {
      content,
      image,
      mimeType,
      mode: clientMode,
      subject: clientSubj,
      classLevel = 10,
      language = 'en',
      moduleTitle,
      currentTopic
    } = req.body;

    if ((!content || !content.trim()) && !image) {
      return res.status(400).json({ success: false, message: 'Message content or image is required' });
    }

    // Verify session
    const { data: session, error: sErr } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (sErr || !session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const result = await processChatTurn({
      userId,
      userMetadata: req.user.user_metadata,
      sessionId,
      content,
      image,
      mimeType,
      mode: clientMode || session.mode || 'doubt',
      subject: clientSubj || session.subject || 'physics',
      classLevel,
      language,
      moduleTitle,
      currentTopic
    });

    return res.json({
      success: true,
      message: result.assistantMsg,
      reply: result.reply,
      sources: result.sources
    });
  } catch (err) {
    console.error('Send message error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process message', error: err.message });
  }
};

/**
 * Direct chat endpoint (supports continuing existing session or starting fresh)
 * POST /api/mentor/chat
 */
exports.directChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      message,
      query,
      sessionId: requestedSessionId,
      newChat = false,
      image,
      mimeType,
      mode = 'doubt',
      subject = 'physics',
      classLevel = 10,
      language = 'en',
      moduleTitle,
      currentTopic
    } = req.body;

    const content = message || query;
    if ((!content || !content.trim()) && !image) {
      return res.status(400).json({ success: false, message: 'Message or image is required' });
    }

    let session = null;

    // 1. If explicit sessionId is requested and not newChat, verify and use it
    if (requestedSessionId && !newChat) {
      const { data: existingSess } = await supabaseAdmin
        .from('chat_sessions')
        .select('id, mode, subject')
        .eq('id', requestedSessionId)
        .eq('user_id', userId)
        .maybeSingle();
      if (existingSess) {
        session = existingSess;
      }
    }

    // 2. If newChat requested, or mode is 'mentor' without explicit session, create a clean session
    if (!session) {
      const titleSnippet = content
        ? content.trim().slice(0, 35) + (content.length > 35 ? '...' : '')
        : `${(moduleTitle || subject).toUpperCase()} Question Image`;

      const { data: newSess, error: createErr } = await supabaseAdmin
        .from('chat_sessions')
        .insert({
          user_id: userId,
          title: titleSnippet,
          mode,
          subject
        })
        .select('id, mode, subject')
        .single();
      if (createErr) throw createErr;
      session = newSess;
    }

    const result = await processChatTurn({
      userId,
      userMetadata: req.user.user_metadata,
      sessionId: session.id,
      content,
      image,
      mimeType,
      mode,
      subject,
      classLevel,
      language,
      moduleTitle,
      currentTopic
    });

    return res.json({
      success: true,
      sessionId: session.id,
      message: result.assistantMsg,
      reply: result.reply,
      sources: result.sources
    });
  } catch (err) {
    console.error('Direct chat error:', err);
    return res.status(500).json({ success: false, message: 'Direct chat failed', error: err.message });
  }
};

/**
 * Real-time Server-Sent Events (SSE) streaming chat endpoint
 * POST /api/mentor/chat/stream
 */
exports.streamChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      message,
      query,
      sessionId: requestedSessionId,
      newChat = false,
      mode = 'doubt',
      subject = 'physics',
      classLevel = 10,
      language = 'en',
      moduleTitle,
      currentTopic
    } = req.body;

    const content = message || query;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // Setup SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // 1. Session lookup or creation
    let session = null;
    if (requestedSessionId && !newChat) {
      const { data: existingSess } = await supabaseAdmin
        .from('chat_sessions')
        .select('id')
        .eq('id', requestedSessionId)
        .eq('user_id', userId)
        .maybeSingle();
      if (existingSess) session = existingSess;
    }

    if (!session) {
      const { data: newSess } = await supabaseAdmin
        .from('chat_sessions')
        .insert({
          user_id: userId,
          title: content.slice(0, 35),
          mode,
          subject
        })
        .select('id')
        .single();
      session = newSess;
    }

    const sessionId = session.id;

    // 2. Insert user message
    await supabaseAdmin.from('chat_messages').insert({
      session_id: sessionId,
      user_id: userId,
      role: 'user',
      content: content.trim(),
      sources: []
    });

    // 3. Load prior history
    const { data: pastMsgs } = await supabaseAdmin
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(8);

    const chronologicalHistory = (pastMsgs || []).reverse().slice(0, -1);
    const geminiHistory = chronologicalHistory.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
    while (geminiHistory.length > 0 && geminiHistory[0].role !== 'user') {
      geminiHistory.shift();
    }

    // 4. Build prompt
    const systemPrompt = getSaarthiSystemPrompt({
      mode,
      board: 'CBSE',
      classLevel: Number(classLevel),
      language,
      studentName: req.user.user_metadata?.full_name || 'Student',
      subject,
      moduleTitle,
      currentTopic
    });

    const hasGeminiKey = Boolean(getGeminiApiKey());
    const hasGroqKey = isGroqConfigured();
    let fullReply = '';

    // Open both Gemini & Groq streams in parallel; whichever yields the first token wins
    async function* openGeminiStream() {
      const candidates = getCandidateModels();
      let lastErr = null;
      for (let i = 0; i < candidates.length; i++) {
        const modelName = candidates[i];
        try {
          const geminiModel = getGeminiModel(systemPrompt, modelName);
          const chat = geminiModel.startChat({ history: geminiHistory });
          const resultStream = await chat.sendMessageStream(content.trim());
          let emittedAny = false;
          for await (const chunk of resultStream.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              emittedAny = true;
              yield chunkText;
            }
          }
          if (emittedAny) return;
        } catch (streamErr) {
          lastErr = streamErr;
          console.warn(`Gemini streaming model "${modelName}" failed:`, streamErr.message);
          if (!isRetryableModelError(streamErr) || i === candidates.length - 1) {
            throw streamErr;
          }
        }
      }
      throw lastErr || new Error('Gemini stream produced no output');
    }

    const streamRacers = [];
    const groqAbort = new AbortController();
    let geminiGen = null;
    let groqGen = null;

    if (hasGeminiKey) {
      geminiGen = openGeminiStream();
      const p = (async () => {
        while (true) {
          const step = await geminiGen.next();
          if (step.done) throw new Error('Gemini stream ended empty');
          if (step.value) return { provider: 'gemini', firstChunk: step.value, gen: geminiGen };
        }
      })();
      p.catch(() => {});
      streamRacers.push(p);
    }

    if (hasGroqKey) {
      groqGen = openGroqStream({
        systemInstruction: systemPrompt,
        history: geminiHistory,
        userText: content.trim(),
        signal: groqAbort.signal
      });
      const p = (async () => {
        while (true) {
          const step = await groqGen.next();
          if (step.done) throw new Error('Groq stream ended empty');
          if (step.value) return { provider: 'groq', firstChunk: step.value, gen: groqGen };
        }
      })();
      p.catch(() => {});
      streamRacers.push(p);
    }

    if (streamRacers.length === 0) {
      fullReply = '⚠️ Saarthi AI is offline: Neither GEMINI_API_KEY nor GROQ_API_KEY is configured in backend/.env.';
      res.write(`data: ${JSON.stringify({ text: fullReply })}\n\n`);
    } else {
      try {
        const winner = await Promise.any(streamRacers);
        console.info(`[mentor/stream] Winning first token from ${winner.provider}`);

        // Cancel loser stream cleanly
        if (winner.provider === 'gemini') {
          groqAbort.abort();
          groqGen?.return?.().catch(() => {});
        } else {
          geminiGen?.return?.().catch(() => {});
        }

        fullReply += winner.firstChunk;
        res.write(`data: ${JSON.stringify({ text: winner.firstChunk })}\n\n`);

        for await (const nextChunk of winner.gen) {
          fullReply += nextChunk;
          res.write(`data: ${JSON.stringify({ text: nextChunk })}\n\n`);
        }
      } catch (aggErr) {
        groqAbort.abort();
        console.error('All AI streams failed:', aggErr.message);
        if (!fullReply) {
          res.write(`data: ${JSON.stringify({ error: 'All AI services failed to stream a response.' })}\n\n`);
        }
      }
    }

    // 5. Store completed response in database
    if (fullReply) {
      await supabaseAdmin.from('chat_messages').insert({
        session_id: sessionId,
        user_id: userId,
        role: 'assistant',
        content: fullReply,
        sources: []
      });

      await supabaseAdmin
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('SSE Stream error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Streaming failed', error: err.message });
    } else {
      res.end();
    }
  }
};

/**
 * Get student's persistent memories
 * GET /api/mentor/memories
 */
exports.getMemories = async (req, res) => {
  try {
    const userId = req.user.id;
    const memories = await getStudentMemories(userId);
    return res.json({
      success: true,
      data: memories
    });
  } catch (err) {
    console.error('Get memories error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch memories', error: err.message });
  }
};

/**
 * Delete a memory fact
 * DELETE /api/mentor/memories/:id
 */
exports.deleteMemory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('memory_facts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    return res.json({
      success: true,
      message: 'Memory deleted'
    });
  } catch (err) {
    console.error('Delete memory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete memory', error: err.message });
  }
};
