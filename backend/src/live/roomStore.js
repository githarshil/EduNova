/**
 * In-memory active Live Class room registry.
 * Enforces:
 *  - 6-character uppercase room code without ambiguous characters (0/O/1/I/L excluded)
 *  - 1 teacher + up to 30 students per room
 *  - 60-minute maximum session duration
 *  - Last-5 segment replay buffer for reconnecting students
 */

const crypto = require('crypto');
const {
  persistSessionStart,
  persistSessionEnd,
  persistTranscriptSegment
} = require('./transcriptStore');

const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const MAX_STUDENTS_PER_ROOM = 30;
const MAX_SESSION_DURATION_MS = 60 * 60 * 1000;
const REPLAY_BUFFER_SIZE = 5;

const rooms = new Map(); // roomCode -> room object

function generateRoomCode() {
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = '';
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
      code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    }
    if (!rooms.has(code)) return code;
  }
  throw new Error('Could not allocate unique room code');
}

function normalizeRoomCode(raw) {
  return String(raw || '').trim().toUpperCase();
}

function sanitizeRoomPublic(room) {
  if (!room) return null;
  return {
    code: room.code,
    title: room.title,
    teacherId: room.teacherId,
    teacherName: room.teacherName,
    status: room.status,
    studentCount: room.students.size,
    maxStudents: MAX_STUDENTS_PER_ROOM,
    startedAt: new Date(room.startedAt).toISOString(),
    expiresAt: new Date(room.expiresAt).toISOString(),
    endedAt: room.endedAt ? new Date(room.endedAt).toISOString() : null
  };
}

async function createRoom({ title, teacherId, teacherName }) {
  const code = generateRoomCode();
  const now = Date.now();
  const expiresAt = now + MAX_SESSION_DURATION_MS;

  const sessionId = await persistSessionStart({
    roomCode: code,
    title,
    teacherId,
    teacherName,
    maxStudents: MAX_STUDENTS_PER_ROOM,
    expiresAt
  });

  const room = {
    code,
    sessionId,
    title,
    teacherId,
    teacherName,
    status: 'live',
    startedAt: now,
    expiresAt,
    endedAt: null,
    seq: 0,
    students: new Map(), // userId -> { id, name, joinedAt }
    wsClients: new Set(),
    teacherWs: null,
    sttSession: null,
    replayBuffer: [], // last 5 emitted events (including audio for instant replay)
    expiryTimer: null,
    onEndedCallback: null
  };

  room.expiryTimer = setTimeout(() => {
    endRoom(code, 'Session reached the 60-minute limit').catch(() => {});
  }, MAX_SESSION_DURATION_MS);
  if (typeof room.expiryTimer.unref === 'function') {
    room.expiryTimer.unref();
  }

  rooms.set(code, room);
  return room;
}

function getRoom(rawCode) {
  const code = normalizeRoomCode(rawCode);
  const room = rooms.get(code);
  if (!room) return null;
  if (room.status === 'live' && Date.now() >= room.expiresAt) {
    endRoom(code, 'Session reached the 60-minute limit').catch(() => {});
  }
  return room;
}

function registerStudent(room, { userId, name }) {
  if (!room || room.status !== 'live') {
    const err = new Error('This class has already ended.');
    err.statusCode = 410;
    throw err;
  }

  if (!room.students.has(userId) && room.students.size >= MAX_STUDENTS_PER_ROOM) {
    const err = new Error(`Room is full (maximum ${MAX_STUDENTS_PER_ROOM} students).`);
    err.statusCode = 403;
    throw err;
  }

  room.students.set(userId, {
    id: userId,
    name: name || 'Student',
    joinedAt: Date.now()
  });

  return room.students.size;
}

function nextSeq(room) {
  room.seq += 1;
  return room.seq;
}

async function recordEmittedSegment(room, eventPayload) {
  room.replayBuffer.push(eventPayload);
  if (room.replayBuffer.length > REPLAY_BUFFER_SIZE) {
    room.replayBuffer.shift();
  }
  await persistTranscriptSegment({
    sessionId: room.sessionId,
    roomCode: room.code,
    seq: eventPayload.seq,
    hindi: eventPayload.hindi,
    kannada: eventPayload.kannada,
    timestamp: eventPayload.timestamp
  });
}

async function endRoom(rawCode, reason = 'Teacher ended the class') {
  const code = normalizeRoomCode(rawCode);
  const room = rooms.get(code);
  if (!room || room.status === 'ended') return room;

  room.status = 'ended';
  room.endedAt = Date.now();
  if (room.expiryTimer) {
    clearTimeout(room.expiryTimer);
    room.expiryTimer = null;
  }

  if (room.sttSession) {
    try {
      room.sttSession.end();
    } catch (_) {}
    room.sttSession = null;
  }

  await persistSessionEnd(code);

  if (typeof room.onEndedCallback === 'function') {
    room.onEndedCallback(reason);
  }

  return room;
}

module.exports = {
  MAX_STUDENTS_PER_ROOM,
  MAX_SESSION_DURATION_MS,
  REPLAY_BUFFER_SIZE,
  normalizeRoomCode,
  sanitizeRoomPublic,
  createRoom,
  getRoom,
  registerStudent,
  nextSeq,
  recordEmittedSegment,
  endRoom
};
