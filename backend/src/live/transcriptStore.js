/**
 * Text-only transcript & session persistence.
 * Uses Supabase PostgreSQL (public.live_sessions + public.live_transcripts) with
 * graceful in-memory fallback if 007_live_classes.sql hasn't been applied yet.
 * Never persists audio bytes.
 */

const { supabaseAdmin } = require('../../utils/supabaseAdmin');

const memoryTranscripts = new Map(); // roomCode -> Array<{ seq, hindi, kannada, timestamp }>
let supabaseTablesAvailable = true;

function isMissingTableError(err) {
  if (!err) return false;
  return err.code === 'PGRST205' || err.code === '42P01' || String(err.message || '').includes('does not exist');
}

async function persistSessionStart({ roomCode, title, teacherId, teacherName, maxStudents, expiresAt }) {
  memoryTranscripts.set(roomCode, []);
  if (!supabaseAdmin || !supabaseTablesAvailable) return null;

  try {
    const { data, error } = await supabaseAdmin
      .from('live_sessions')
      .insert({
        room_code: roomCode,
        title,
        teacher_id: teacherId,
        teacher_name: teacherName,
        status: 'live',
        max_students: maxStudents,
        expires_at: new Date(expiresAt).toISOString()
      })
      .select('id')
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        supabaseTablesAvailable = false;
        console.warn('⚠️ live_sessions table not found; using in-memory transcript store until sql/007_live_classes.sql is applied.');
        return null;
      }
      console.warn('live_sessions insert warning:', error.message);
      return null;
    }
    return data?.id || null;
  } catch (err) {
    console.warn('persistSessionStart error:', err.message);
    return null;
  }
}

async function persistSessionEnd(roomCode) {
  if (!supabaseAdmin || !supabaseTablesAvailable) return;
  try {
    const { error } = await supabaseAdmin
      .from('live_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString()
      })
      .eq('room_code', roomCode);

    if (error && isMissingTableError(error)) {
      supabaseTablesAvailable = false;
    }
  } catch (err) {
    console.warn('persistSessionEnd error:', err.message);
  }
}

/**
 * Persists a single text-only transcript row (seq, hindi, kannada, timestamp).
 * Audio is explicitly excluded.
 */
async function persistTranscriptSegment({ sessionId, roomCode, seq, hindi, kannada, timestamp }) {
  const entry = {
    seq,
    hindi,
    kannada,
    timestamp: timestamp || new Date().toISOString()
  };

  if (!memoryTranscripts.has(roomCode)) {
    memoryTranscripts.set(roomCode, []);
  }
  const list = memoryTranscripts.get(roomCode);
  list.push(entry);
  if (list.length > 500) list.shift();

  if (!supabaseAdmin || !supabaseTablesAvailable || !sessionId) return;

  try {
    const { error } = await supabaseAdmin
      .from('live_transcripts')
      .insert({
        session_id: sessionId,
        room_code: roomCode,
        seq,
        hindi,
        kannada,
        created_at: entry.timestamp
      });

    if (error && isMissingTableError(error)) {
      supabaseTablesAvailable = false;
    }
  } catch (err) {
    console.warn('persistTranscriptSegment error:', err.message);
  }
}

async function getTranscriptsByRoomCode(roomCode) {
  const mem = memoryTranscripts.get(roomCode);
  if (mem && mem.length > 0) return mem;

  if (!supabaseAdmin || !supabaseTablesAvailable) return mem || [];

  try {
    const { data, error } = await supabaseAdmin
      .from('live_transcripts')
      .select('seq, hindi, kannada, created_at')
      .eq('room_code', roomCode)
      .order('seq', { ascending: true });

    if (error) {
      if (isMissingTableError(error)) supabaseTablesAvailable = false;
      return mem || [];
    }

    return (data || []).map((row) => ({
      seq: row.seq,
      hindi: row.hindi,
      kannada: row.kannada,
      timestamp: row.created_at
    }));
  } catch {
    return mem || [];
  }
}

module.exports = {
  persistSessionStart,
  persistSessionEnd,
  persistTranscriptSegment,
  getTranscriptsByRoomCode
};
