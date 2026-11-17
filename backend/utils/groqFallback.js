/**
 * Groq OpenAI-compatible AI client & Gemini/Groq parallel race helpers.
 * Automatically hot-reloads backend/.env when modified on disk so newly added keys
 * work immediately without losing process.env test overrides.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ENV_PATH = path.join(__dirname, '..', '.env');
const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b'
];

let lastEnvMtimeMs = 0;

function syncEnvIfModified() {
  try {
    const stat = fs.statSync(ENV_PATH);
    if (stat.mtimeMs > lastEnvMtimeMs) {
      lastEnvMtimeMs = stat.mtimeMs;
      dotenv.config({ path: ENV_PATH, override: true });
    }
  } catch (_) {
    // No .env file on disk; rely on existing process.env
  }
}

function getGeminiApiKey() {
  syncEnvIfModified();
  const key = process.env.GEMINI_API_KEY;
  if (!key) return '';
  const trimmed = key.trim();
  if (!trimmed || trimmed === 'your_gemini_api_key_here') return '';
  return trimmed;
}

function getGroqApiKey() {
  syncEnvIfModified();
  const key = process.env.GROQ_API_KEY;
  if (!key) return '';
  const trimmed = key.trim();
  if (!trimmed || trimmed === 'your_groq_api_key_here') return '';
  return trimmed;
}

function isGroqConfigured() {
  return Boolean(getGroqApiKey());
}

function getGroqCandidateModels(hasImage = false) {
  syncEnvIfModified();
  if (hasImage) {
    const vision = (process.env.GROQ_VISION_MODEL || '').trim();
    return vision ? [vision] : [];
  }
  const configured = (process.env.GROQ_CHAT_MODEL || process.env.GROQ_MODEL || DEFAULT_GROQ_MODELS[0]).trim();
  const seen = new Set();
  return [configured, ...DEFAULT_GROQ_MODELS].filter((m) => {
    if (!m || seen.has(m)) return false;
    seen.add(m);
    return true;
  });
}

function cleanModelText(raw) {
  return String(raw || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();
}

function buildGroqMessages({ systemInstruction, history = [], userText = '', imageBase64, mimeType }) {
  const messages = [];

  if (systemInstruction && String(systemInstruction).trim()) {
    messages.push({ role: 'system', content: String(systemInstruction).trim() });
  }

  for (const item of history || []) {
    const text = Array.isArray(item?.parts)
      ? item.parts.map((p) => p?.text || '').join('\n').trim()
      : String(item?.content || '').trim();
    if (!text) continue;
    messages.push({
      role: item.role === 'model' || item.role === 'assistant' ? 'assistant' : 'user',
      content: text
    });
  }

  const promptText = String(userText || '').trim();
  if (imageBase64 && mimeType) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: promptText || 'Explain or solve this image.' },
        {
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${imageBase64}` }
        }
      ]
    });
  } else if (promptText) {
    messages.push({ role: 'user', content: promptText });
  }

  return messages;
}

async function generateGroqCompletion({
  systemInstruction,
  history = [],
  userText = '',
  imageBase64,
  mimeType,
  temperature = 0.6,
  maxTokens = 2048,
  timeoutMs = 20000
}) {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const hasImage = Boolean(imageBase64 && mimeType);
  const models = getGroqCandidateModels(hasImage);
  if (models.length === 0) {
    throw new Error('No Groq vision model configured for image inputs');
  }

  const messages = buildGroqMessages({ systemInstruction, history, userText, imageBase64, mimeType });
  let lastErr = null;

  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        throw new Error(`Groq API failed (${response.status}): ${errBody.slice(0, 200)}`);
      }

      const data = await response.json();
      const text = cleanModelText(data?.choices?.[0]?.message?.content);
      if (!text) {
        throw new Error(`Groq model "${model}" returned an empty response`);
      }

      return { text, model };
    } catch (err) {
      lastErr = err;
      console.warn(`Groq model "${model}" error:`, err.message);
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastErr || new Error('Groq completion failed');
}

/**
 * Opens a Groq SSE stream and yields text deltas via an async generator.
 */
async function* openGroqStream({
  systemInstruction,
  history = [],
  userText = '',
  temperature = 0.6,
  maxTokens = 2048,
  signal
}) {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const messages = buildGroqMessages({ systemInstruction, history, userText });
  const models = getGroqCandidateModels(false);
  let lastErr = null;

  for (const model of models) {
    try {
      const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: true
        }),
        signal
      });

      if (!response.ok || !response.body) {
        const errBody = await response.text().catch(() => '');
        throw new Error(`Groq streaming failed (${response.status}): ${errBody.slice(0, 200)}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let emittedAny = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;

          try {
            const parsed = JSON.parse(payload);
            const delta = parsed?.choices?.[0]?.delta?.content;
            if (delta) {
              emittedAny = true;
              yield delta;
            }
          } catch (_) {
            // Skip partial JSON frames
          }
        }
      }

      if (emittedAny) {
        return;
      }
      throw new Error(`Groq stream "${model}" produced empty output`);
    } catch (err) {
      if (signal?.aborted) throw err;
      lastErr = err;
      console.warn(`Groq streaming model "${model}" error:`, err.message);
    }
  }

  throw lastErr || new Error('Groq streaming failed');
}

async function streamGroqCompletion(options) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || 25000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let accumulated = '';
  try {
    for await (const delta of openGroqStream({ ...options, signal: controller.signal })) {
      accumulated += delta;
      if (typeof options.onChunk === 'function') {
        options.onChunk(delta);
      }
    }
    return { text: accumulated, model: 'groq' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fires Gemini and Groq in parallel and resolves with whichever responds first cleanly.
 */
async function raceAiProviders({ geminiFn, groqFn }) {
  const racers = [];
  const errors = [];

  if (typeof geminiFn === 'function') {
    racers.push(
      Promise.resolve()
        .then(() => geminiFn())
        .then((res) => {
          const text = String(res?.text || '').trim();
          if (!text) throw new Error('Gemini returned empty text');
          return { provider: 'gemini', model: res.model || 'gemini', text };
        })
        .catch((err) => {
          errors.push({ provider: 'gemini', error: err });
          throw err;
        })
    );
  }

  if (typeof groqFn === 'function') {
    racers.push(
      Promise.resolve()
        .then(() => groqFn())
        .then((res) => {
          const text = String(res?.text || '').trim();
          if (!text) throw new Error('Groq returned empty text');
          return { provider: 'groq', model: res.model || 'groq', text };
        })
        .catch((err) => {
          errors.push({ provider: 'groq', error: err });
          throw err;
        })
    );
  }

  if (racers.length === 0) {
    const err = new Error('Neither Gemini nor Groq API key is configured');
    err.code = 'NO_AI_PROVIDER';
    throw err;
  }

  // Prevent unhandled rejection warnings on losing/secondary promises
  racers.forEach((p) => p.catch(() => {}));

  try {
    return await Promise.any(racers);
  } catch (_) {
    const aggErr = new Error(errors.map((e) => `${e.provider}: ${e.error?.message || e.error}`).join(' | '));
    aggErr.providerErrors = errors;
    throw aggErr;
  }
}

module.exports = {
  getGeminiApiKey,
  getGroqApiKey,
  isGroqConfigured,
  generateGroqCompletion,
  openGroqStream,
  streamGroqCompletion,
  raceAiProviders
};
