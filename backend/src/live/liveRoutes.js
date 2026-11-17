const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../../middleware/auth');
const {
  createRoom,
  getRoom,
  registerStudent,
  endRoom,
  sanitizeRoomPublic,
  normalizeRoomCode
} = require('./roomStore');
const { createLiveKitToken, getLiveKitConfig } = require('./livekitService');
const { getTranscriptsByRoomCode } = require('./transcriptStore');
const { isMockEnabled, getSarvamApiKey } = require('./sarvamPipeline');
const demoRoutes = require('./demoRoutes');

const router = express.Router();

// Mount public solo demo routes (/api/live/demo/*) before room-level rate limiter
router.use('/demo', demoRoutes);

const liveRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => (req.user && req.user.id) || req.ip || 'anonymous',
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many live-class requests. Please wait a few minutes and try again.'
    });
  }
});

const roomCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => (req.user && req.user.id) || req.ip || 'anonymous',
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Room creation limit reached. Please wait before starting another class.'
    });
  }
});

function timingSafeMatch(provided, expected) {
  const a = Buffer.from(String(provided || ''), 'utf8');
  const b = Buffer.from(String(expected || ''), 'utf8');
  if (a.length === 0 || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Checks whether the authenticated user can start a live class as a teacher.
 * Reuses existing auth; if no 'teacher' role exists on profiles, gates via TEACHER_CODE env passcode.
 */
function verifyTeacherAccess(req) {
  if (req.user?.role === 'teacher') {
    return { allowed: true };
  }

  const configuredCode = process.env.TEACHER_CODE || '';
  if (!configuredCode) {
    return {
      allowed: false,
      status: 403,
      message: 'Teacher passcode (TEACHER_CODE) is not configured on the server.'
    };
  }

  const providedCode = req.body?.teacherCode || req.headers['x-teacher-code'] || '';
  if (!timingSafeMatch(providedCode, configuredCode)) {
    return {
      allowed: false,
      status: 403,
      message: 'Invalid teacher passcode. Ask your school coordinator for the TEACHER_CODE.'
    };
  }

  return { allowed: true };
}

router.use(liveRateLimiter);

/**
 * GET /api/live/config
 * Public capabilities metadata for the lobby (never leaks keys/passcodes).
 */
router.get('/config', requireAuth, (req, res) => {
  const lk = getLiveKitConfig();
  res.json({
    success: true,
    mockMode: isMockEnabled(),
    sarvamConfigured: Boolean(getSarvamApiKey()),
    livekitConfigured: lk.configured,
    requiresTeacherCode: req.user?.role !== 'teacher',
    teacherCodeConfigured: Boolean(process.env.TEACHER_CODE)
  });
});

/**
 * POST /api/live/rooms
 * Teacher-only endpoint to create and start a new 60-minute live class room.
 */
router.post('/rooms', requireAuth, roomCreateLimiter, async (req, res, next) => {
  try {
    const authCheck = verifyTeacherAccess(req);
    if (!authCheck.allowed) {
      return res.status(authCheck.status).json({ success: false, message: authCheck.message });
    }

    const title = String(req.body?.title || '').trim();
    if (title.length < 3 || title.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Class title must be between 3 and 100 characters.'
      });
    }

    const room = await createRoom({
      title,
      teacherId: req.user.id,
      teacherName: req.user.name || req.user.email || 'Teacher'
    });

    res.status(201).json({
      success: true,
      room: sanitizeRoomPublic(room)
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/live/rooms/:code
 * Fetch live room metadata (status, title, teacherName, studentCount).
 */
router.get('/rooms/:code', requireAuth, (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) {
    return res.status(404).json({
      success: false,
      message: 'Class room not found. Check the 6-character code and try again.'
    });
  }
  res.json({
    success: true,
    room: sanitizeRoomPublic(room)
  });
});

/**
 * POST /api/live/rooms/:code/token
 * Issues a LiveKit token + room session metadata for either the room's teacher or a joining student.
 */
router.post('/rooms/:code/token', requireAuth, async (req, res, next) => {
  try {
    const code = normalizeRoomCode(req.params.code);
    const room = getRoom(code);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Class room not found. Check the 6-character code and try again.'
      });
    }

    if (room.status !== 'live') {
      return res.status(410).json({
        success: false,
        message: 'This live class has ended.',
        room: sanitizeRoomPublic(room)
      });
    }

    const isTeacher = room.teacherId === req.user.id;
    const displayName = String(req.body?.displayName || req.user.name || req.user.email || 'Student')
      .trim()
      .slice(0, 60);

    if (!isTeacher) {
      registerStudent(room, { userId: req.user.id, name: displayName });
    }

    const role = isTeacher ? 'teacher' : 'student';
    const lk = await createLiveKitToken({
      roomCode: code,
      identity: `${role}-${req.user.id}`,
      name: displayName,
      role
    });

    res.json({
      success: true,
      role,
      room: sanitizeRoomPublic(room),
      livekit: lk,
      mockMode: isMockEnabled()
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/live/rooms/:code/end
 * Teacher-only endpoint to end an active live class.
 */
router.post('/rooms/:code/end', requireAuth, async (req, res, next) => {
  try {
    const room = getRoom(req.params.code);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Class room not found.' });
    }

    if (room.teacherId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the teacher who started this class can end it.'
      });
    }

    const ended = await endRoom(room.code, 'Teacher ended the class');
    res.json({
      success: true,
      room: sanitizeRoomPublic(ended)
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/live/rooms/:code/transcripts
 * Returns text-only transcripts (seq, hindi, kannada, timestamp) for the session.
 */
router.get('/rooms/:code/transcripts', requireAuth, async (req, res, next) => {
  try {
    const code = normalizeRoomCode(req.params.code);
    const transcripts = await getTranscriptsByRoomCode(code);
    res.json({
      success: true,
      roomCode: code,
      transcripts
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
