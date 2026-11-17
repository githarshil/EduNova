/**
 * WebSocket relay for Live Class (/ws/live).
 *
 * Teacher connection:
 *  - Authenticates via Supabase JWT + room teacher ownership
 *  - Streams raw 16kHz mono linear16 PCM binary frames to server-side Sarvam STT
 *  - Receives partial Hindi transcripts + final translated Kannada segments & timings
 *
 * Student connection:
 *  - Authenticates via Supabase JWT
 *  - Receives last 5 segments replayed on join/reconnect
 *  - Receives one broadcast per finished sentence: { type: 'segment', seq, hindi, kannada, audio, mimeType, note, timings, timestamp }
 *  - Never sends audio
 */

const { WebSocketServer, WebSocket } = require('ws');
const { URL } = require('url');
const { supabaseAdmin } = require('../../utils/supabaseAdmin');
const {
  getRoom,
  registerStudent,
  nextSeq,
  recordEmittedSegment,
  normalizeRoomCode
} = require('./roomStore');
const {
  SarvamRealtimeSttSession,
  processFinishedSentence,
  isMockEnabled
} = require('./sarvamPipeline');
const { createDemoWsHandler } = require('./demoWsServer');

async function verifyWsToken(token) {
  if (!token || !supabaseAdmin) return null;
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return null;
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, role')
      .eq('id', data.user.id)
      .maybeSingle();

    return {
      id: data.user.id,
      name: profile?.full_name || data.user.user_metadata?.full_name || data.user.email || 'User',
      role: profile?.role || data.user.user_metadata?.role || 'student'
    };
  } catch {
    return null;
  }
}

function sendJson(ws, payload) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastToRoom(room, payload) {
  const serialized = JSON.stringify(payload);
  for (const client of room.wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(serialized);
    }
  }
}

async function ensureTeacherSttSession(room) {
  if (room.sttSession) return room.sttSession;

  const stt = new SarvamRealtimeSttSession({ mock: isMockEnabled() });
  room.sttSession = stt;

  stt.on('partial', ({ text }) => {
    broadcastToRoom(room, { type: 'partial', hindi: text });
  });

  stt.on('final', async ({ text, sttMs, mockFreq }) => {
    if (room.status !== 'live') return;
    const seq = nextSeq(room);
    try {
      const event = await processFinishedSentence({
        seq,
        hindi: text,
        sttMs,
        mock: isMockEnabled(),
        mockFreq
      });
      await recordEmittedSegment(room, event);
      broadcastToRoom(room, {
        type: 'segment',
        ...event
      });
    } catch (err) {
      console.error('Live sentence pipeline error:', err.message);
    }
  });

  stt.on('error', (err) => {
    console.warn(`Live STT warning [${room.code}]:`, err.message);
    if (room.teacherWs) {
      sendJson(room.teacherWs, {
        type: 'pipeline_warning',
        message: err.message
      });
    }
  });

  stt.on('close', () => {
    if (room.sttSession === stt) {
      room.sttSession = null;
    }
  });

  await stt.connect();
  return stt;
}

function attachLiveWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ noServer: true });
  const demoWs = createDemoWsHandler();

  httpServer.on('upgrade', async (request, socket, head) => {
    let parsedUrl;
    try {
      parsedUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    } catch {
      socket.destroy();
      return;
    }

    if (parsedUrl.pathname === '/ws/live/demo') {
      demoWs.handleUpgrade(request, socket, head);
      return;
    }

    if (parsedUrl.pathname !== '/ws/live') {
      return;
    }

    const token = parsedUrl.searchParams.get('token');
    const code = normalizeRoomCode(parsedUrl.searchParams.get('code'));
    const role = parsedUrl.searchParams.get('role') === 'teacher' ? 'teacher' : 'student';

    const user = await verifyWsToken(token);
    if (!user) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    const room = getRoom(code);
    if (!room) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }

    if (role === 'teacher' && room.teacherId !== user.id) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, { room, user, role });
    });
  });

  wss.on('connection', async (ws, { room, user, role }) => {
    if (room.status === 'ended') {
      sendJson(ws, { type: 'class_ended', reason: 'This class has ended.' });
      ws.close(1000);
      return;
    }

    room.wsClients.add(ws);

    room.onEndedCallback = (reason) => {
      broadcastToRoom(room, { type: 'class_ended', reason });
    };

    if (role === 'teacher') {
      room.teacherWs = ws;
      try {
        await ensureTeacherSttSession(room);
      } catch (err) {
        sendJson(ws, {
          type: 'pipeline_warning',
          message: `Speech recognition standby: ${err.message}`
        });
      }
    } else {
      try {
        const count = registerStudent(room, { userId: user.id, name: user.name });
        broadcastToRoom(room, { type: 'student_count', studentCount: count });
      } catch (err) {
        sendJson(ws, { type: 'error', message: err.message });
        ws.close(4003);
        return;
      }
    }

    sendJson(ws, {
      type: 'connected',
      role,
      roomCode: room.code,
      studentCount: room.students.size,
      mockMode: isMockEnabled(),
      expiresAt: new Date(room.expiresAt).toISOString()
    });

    // Replay last 5 segments on join/reconnect
    if (room.replayBuffer.length > 0) {
      sendJson(ws, {
        type: 'replay',
        segments: room.replayBuffer
      });
    }

    ws.on('message', async (data, isBinary) => {
      if (role !== 'teacher') {
        // Students are listen-only: ignore any non-control messages
        return;
      }

      if (isBinary) {
        if (room.status !== 'live') return;
        try {
          const stt = await ensureTeacherSttSession(room);
          stt.sendPcmChunk(data);
        } catch (err) {
          sendJson(ws, { type: 'pipeline_warning', message: err.message });
        }
        return;
      }

      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ping') {
          sendJson(ws, { type: 'pong' });
        } else if (msg.type === 'flush') {
          room.sttSession?.flush();
        } else if (msg.type === 'mock_speak' && isMockEnabled()) {
          // Allows deterministic demo trigger in LIVE_MOCK=1 mode even without mic hardware
          const stt = await ensureTeacherSttSession(room);
          stt.flush();
        }
      } catch (_) {}
    });

    ws.on('close', () => {
      room.wsClients.delete(ws);
      if (role === 'teacher' && room.teacherWs === ws) {
        room.teacherWs = null;
      }
      if (role === 'student') {
        room.students.delete(user.id);
        broadcastToRoom(room, { type: 'student_count', studentCount: room.students.size });
      }
    });
  });

  return wss;
}

module.exports = {
  attachLiveWebSocketServer
};
