/**
 * Solo Live Translation Demo WebSocket (/ws/live/demo).
 *
 * - Public (no login required), gated by DEMO_ENABLED=1
 * - Per-IP rate-limiting (~30 utterances/min)
 * - Caps each sentence at 300 chars and caps each session at 10 minutes
 * - Replies ONLY to the single caller socket; never stores audio or transcripts
 */

const { WebSocketServer, WebSocket } = require('ws');
const {
  SarvamRealtimeSttSession,
  processFinishedSentence,
  isMockEnabled,
  getSarvamApiKey
} = require('./sarvamPipeline');

const MAX_DEMO_SESSION_MS = 10 * 60 * 1000;
const MAX_SENTENCE_CHARS = 300;
const MAX_UTTERANCES_PER_MIN = 30;

const ipCounters = new Map(); // ip -> { count, windowStart }

function isDemoEnabled() {
  return process.env.DEMO_ENABLED === '1' || process.env.DEMO_ENABLED === 'true';
}

function checkUtteranceRate(ip) {
  const now = Date.now();
  const key = ip || 'unknown';
  const entry = ipCounters.get(key);
  if (!entry || now - entry.windowStart >= 60 * 1000) {
    ipCounters.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= MAX_UTTERANCES_PER_MIN) {
    return false;
  }
  entry.count += 1;
  return true;
}

function sendJson(ws, payload) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function createDemoWsHandler() {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', async (ws, request) => {
    const clientIp =
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.socket?.remoteAddress ||
      'unknown';

    if (!isDemoEnabled()) {
      sendJson(ws, { type: 'error', message: 'Live demo is disabled on the server (DEMO_ENABLED!=1).' });
      ws.close(4003);
      return;
    }

    const mockMode = isMockEnabled();
    if (!mockMode && !getSarvamApiKey()) {
      sendJson(ws, { type: 'error', message: 'SARVAM_API_KEY is not configured on the server.' });
      ws.close(4003);
      return;
    }

    let seq = 0;
    let closed = false;
    let stt = null;
    let sttPromise = null;
    let sessionTimer = null;
    const pendingAudioChunks = [];
    let pendingFlush = false;

    const cleanup = () => {
      if (closed) return;
      closed = true;
      pendingAudioChunks.length = 0;
      if (sessionTimer) {
        clearTimeout(sessionTimer);
        sessionTimer = null;
      }
      if (stt) {
        try {
          stt.end();
        } catch (_) {}
        stt = null;
      }
    };

    sessionTimer = setTimeout(() => {
      sendJson(ws, {
        type: 'session_expired',
        message: '10-minute demo session limit reached. Click Start speaking to begin a new session.'
      });
      cleanup();
      ws.close(1000);
    }, MAX_DEMO_SESSION_MS);
    if (typeof sessionTimer.unref === 'function') {
      sessionTimer.unref();
    }

    const ensureStt = () => {
      if (stt && stt.connected) return Promise.resolve(stt);
      if (sttPromise) return sttPromise;

      const session = new SarvamRealtimeSttSession({ mock: mockMode });
      stt = session;

      session.on('partial', ({ text }) => {
        if (!closed) {
          sendJson(ws, { type: 'partial', hindi: String(text || '').slice(0, MAX_SENTENCE_CHARS) });
        }
      });

      session.on('final', async ({ text, sttMs, mockFreq }) => {
        if (closed) return;
        const cleanHindi = String(text || '').trim().slice(0, MAX_SENTENCE_CHARS);
        if (!cleanHindi) return;

        if (!checkUtteranceRate(clientIp)) {
          sendJson(ws, {
            type: 'error',
            message: 'Demo rate limit reached (30 sentences/minute). Wait a moment and retry.'
          });
          return;
        }

        seq += 1;
        // Inform client immediately that Hindi text finished so PipelineSteps pin 2 lights up
        sendJson(ws, {
          type: 'stt_final',
          seq,
          hindi: cleanHindi,
          sttMs
        });

        try {
          const event = await processFinishedSentence({
            seq,
            hindi: cleanHindi,
            sttMs,
            mock: mockMode,
            mockFreq
          });
          if (!closed) {
            sendJson(ws, {
              type: 'segment',
              seq: event.seq,
              hindi: event.hindi,
              kannada: event.kannada,
              needsReview: true,
              audio: event.audio,
              mimeType: event.mimeType,
              note: event.note,
              timings: event.timings
            });
          }
        } catch (err) {
          if (!closed) {
            sendJson(ws, {
              type: 'error',
              message: err?.message || 'Demo translation pipeline error.'
            });
          }
        }
      });

      session.on('error', (err) => {
        if (!closed) {
          sendJson(ws, { type: 'error', message: err?.message || 'Speech recognition error.' });
        }
      });

      session.on('close', () => {
        if (stt === session) {
          stt = null;
          sttPromise = null;
        }
      });

      sttPromise = session.connect().then(() => {
        while (pendingAudioChunks.length > 0 && !closed) {
          session.sendPcmChunk(pendingAudioChunks.shift());
        }
        if (pendingFlush && !closed) {
          pendingFlush = false;
          session.flush();
        }
        return session;
      }).catch((err) => {
        if (stt === session) {
          stt = null;
          sttPromise = null;
        }
        throw err;
      });

      return sttPromise;
    };

    // Attach listeners immediately so audio arriving while Sarvam STT connects is buffered cleanly
    ws.on('message', async (data, isBinary) => {
      if (closed) return;
      if (isBinary) {
        if (!stt || !stt.connected) {
          if (pendingAudioChunks.length < 60) {
            pendingAudioChunks.push(Buffer.from(data));
          }
          ensureStt().catch(() => {});
          return;
        }
        try {
          stt.sendPcmChunk(data);
        } catch (err) {
          sendJson(ws, { type: 'error', message: err?.message || 'STT stream error.' });
        }
        return;
      }

      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ping') {
          sendJson(ws, { type: 'pong' });
        } else if (msg.type === 'flush') {
          if (stt && stt.connected) {
            stt.flush();
          } else {
            pendingFlush = true;
          }
        }
      } catch (_) {}
    });

    ws.on('close', cleanup);
    ws.on('error', cleanup);

    try {
      await ensureStt();
      if (!closed) {
        sendJson(ws, {
          type: 'connected',
          mockMode,
          maxSessionMs: MAX_DEMO_SESSION_MS,
          maxSentenceChars: MAX_SENTENCE_CHARS
        });
      }
    } catch (err) {
      if (!closed) {
        sendJson(ws, { type: 'error', message: err?.message || 'Could not connect to Sarvam STT.' });
      }
      cleanup();
      ws.close(1011);
    }
  });

  function handleUpgrade(request, socket, head) {
    if (!isDemoEnabled()) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }

  return { handleUpgrade };
}

module.exports = {
  createDemoWsHandler
};
