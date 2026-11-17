const express = require('express');
const rateLimit = require('express-rate-limit');
const { DEMO_SENTENCES } = require('./demoScript');
const {
  processFinishedSentence,
  isMockEnabled,
  getSarvamApiKey
} = require('./sarvamPipeline');

const router = express.Router();
const MAX_SENTENCE_CHARS = 300;

function isDemoEnabled() {
  return process.env.DEMO_ENABLED === '1' || process.env.DEMO_ENABLED === 'true';
}

const demoIpRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // ~30 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => req.ip || 'anonymous',
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Demo rate limit reached (30 requests/minute). Please wait a moment and retry.'
    });
  }
});

function requireDemoEnabled(_req, res, next) {
  if (!isDemoEnabled()) {
    return res.status(403).json({
      success: false,
      enabled: false,
      message: 'Live translation demo is disabled (set DEMO_ENABLED=1 in backend/.env).'
    });
  }
  return next();
}

router.use(demoIpRateLimiter);

/**
 * GET /api/live/demo/health
 * Public readiness check used by "Before you present".
 */
router.get('/health', (_req, res) => {
  const enabled = isDemoEnabled();
  const mockMode = isMockEnabled();
  const sarvamConfigured = Boolean(getSarvamApiKey());
  res.status(enabled ? 200 : 503).json({
    success: enabled,
    enabled,
    mockMode,
    sarvamConfigured,
    ready: enabled && (sarvamConfigured || mockMode)
  });
});

/**
 * GET /api/live/demo/script
 * Returns the 6 Hindi sentences for Sample sentences mode.
 */
router.get('/script', requireDemoEnabled, (_req, res) => {
  res.json({
    success: true,
    sentences: DEMO_SENTENCES
  });
});

/**
 * POST /api/live/demo/translate-sentence
 * Runs a single Hindi sentence (max 300 chars) through real Sarvam Translate + Bulbul TTS (no STT).
 * Never stores audio or transcripts.
 */
router.post('/translate-sentence', requireDemoEnabled, async (req, res) => {
  try {
    const { index, text, seq } = req.body || {};
    let hindiText = '';

    if (typeof index === 'number' || (typeof index === 'string' && /^\d+$/.test(index))) {
      const idx = Number(index);
      const found = DEMO_SENTENCES.find((s) => s.id === idx);
      if (!found) {
        return res.status(400).json({
          success: false,
          message: `Invalid sample sentence index (${index}).`
        });
      }
      hindiText = found.hindi;
    } else if (typeof text === 'string') {
      hindiText = text.trim();
    }

    if (!hindiText) {
      return res.status(400).json({
        success: false,
        message: 'Provide a Hindi sentence or valid sample index.'
      });
    }

    if (hindiText.length > MAX_SENTENCE_CHARS) {
      return res.status(400).json({
        success: false,
        message: `Sentence exceeds the ${MAX_SENTENCE_CHARS}-character demo limit.`
      });
    }

    const mockMode = isMockEnabled();
    if (!mockMode && !getSarvamApiKey()) {
      return res.status(503).json({
        success: false,
        message: 'SARVAM_API_KEY is not configured on the server.'
      });
    }

    const result = await processFinishedSentence({
      seq: Number(seq) || 1,
      hindi: hindiText,
      sttMs: 0,
      mock: mockMode
    });

    res.json({
      success: true,
      seq: result.seq,
      hindi: result.hindi,
      kannada: result.kannada,
      needsReview: true,
      audio: result.audio,
      mimeType: result.mimeType,
      note: result.note,
      timings: result.timings,
      mockMode
    });
  } catch (err) {
    res.status(502).json({
      success: false,
      message: err?.message || 'Translation service error.'
    });
  }
});

module.exports = router;
