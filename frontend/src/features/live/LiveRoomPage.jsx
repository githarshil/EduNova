import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Copy, Users, Volume2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  SectionHeader,
  PaperCard,
  Tape,
  Stamp,
  Tag,
  Button,
  StickyNote,
  Modal,
  EmptyState,
  Skeleton,
  useToast
} from '../../components/ui';
import {
  getLiveRoomToken,
  endLiveRoom,
  getLiveTranscripts,
  LiveWsClient
} from './liveClient';
import { connectToLiveKitRoom } from './livekitRoom';
import { KannadaAudioQueue } from './audioQueue';
import { ensureKannadaFontLoaded } from './kannadaFontLoader';
import StatusChip from './StatusChip';
import VideoTile from './VideoTile';
import CaptionSheet from './CaptionSheet';
import ControlBar from './ControlBar';
import PipelinePanel from './PipelinePanel';
import './live.css';

export default function LiveRoomPage() {
  const { code } = useParams();
  const roomCode = String(code || '').trim().toUpperCase();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState('');
  const [roomInfo, setRoomInfo] = useState(null);
  const [role, setRole] = useState('student');
  const [mockMode, setMockMode] = useState(false);

  // Connection & status
  const [wsStatus, setWsStatus] = useState('connecting');
  const [catchingUp, setCatchingUp] = useState(false);
  const [studentCount, setStudentCount] = useState(0);
  const [classEnded, setClassEnded] = useState(false);
  const [endedReason, setEndedReason] = useState('');
  const [warningNote, setWarningNote] = useState('');

  // Media controls
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [hasVideo, setHasVideo] = useState(false);
  const [teacherMuted, setTeacherMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Student controls
  const [channel, setChannel] = useState('kannada'); // 'kannada' | 'hindi'
  const [captionsOn, setCaptionsOn] = useState(true);
  const [audioOnly, setAudioOnly] = useState(false);
  const [listeningUnlocked, setListeningUnlocked] = useState(false);
  const [channelAnnouncement, setChannelAnnouncement] = useState('');

  // Captions & pipeline
  const [segments, setSegments] = useState([]);
  const [partialHindi, setPartialHindi] = useState('');
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [endingClass, setEndingClass] = useState(false);

  // Refs
  const videoElRef = useRef(null);
  const hindiAudioElRef = useRef(null);
  const localPreviewStreamRef = useRef(null);
  const wsClientRef = useRef(null);
  const lkHandleRef = useRef(null);
  const audioQueueRef = useRef(null);
  const workletCleanupRef = useRef(null);
  const workletNodeRef = useRef(null);
  const channelRef = useRef(channel);
  const roleRef = useRef(role);
  const mockModeRef = useRef(mockMode);

  channelRef.current = channel;
  roleRef.current = role;
  mockModeRef.current = mockMode;

  // Lazy-load Noto Sans Kannada ONLY when Kannada channel or captions are on
  useEffect(() => {
    if (channel === 'kannada' || captionsOn) {
      ensureKannadaFontLoaded();
    }
  }, [channel, captionsOn]);

  const appendSegments = useCallback((incoming) => {
    const list = Array.isArray(incoming) ? incoming : [incoming];
    setSegments((prev) => {
      const seen = new Set(prev.map((s) => s.seq));
      const merged = [...prev];
      for (const item of list) {
        if (item && typeof item.seq === 'number' && !seen.has(item.seq)) {
          seen.add(item.seq);
          merged.push(item);
        }
      }
      merged.sort((a, b) => a.seq - b.seq);
      return merged.slice(-200);
    });
  }, []);

  const setupTeacherAudioWorklet = useCallback(async (wsClient) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const workletUrl = new URL('./pcm-processor.js', import.meta.url);
      await ctx.audioWorklet.addModule(workletUrl);

      const source = ctx.createMediaStreamSource(stream);
      const node = new AudioWorkletNode(ctx, 'pcm-16k-processor');
      workletNodeRef.current = node;

      // Silent sink keeps AudioWorklet active without local mic echo
      const gain = ctx.createGain();
      gain.gain.value = 0;

      node.port.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          wsClient.sendPcm(event.data);
        }
      };

      source.connect(node);
      node.connect(gain);
      gain.connect(ctx.destination);

      workletCleanupRef.current = () => {
        try {
          node.disconnect();
          source.disconnect();
          gain.disconnect();
          stream.getTracks().forEach((t) => t.stop());
          ctx.close().catch(() => {});
        } catch (_) {}
      };
    } catch (err) {
      setWarningNote(
        mockModeRef.current
          ? 'Microphone unavailable — use "Emit sample Hindi sentence" in Pipeline timings for mock demo.'
          : `Microphone permission needed for Hindi speech translation (${err?.message || 'denied'}).`
      );
    }
  }, []);

  const setupTeacherLocalCameraFallback = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 360, frameRate: 15 },
        audio: false
      });
      localPreviewStreamRef.current = stream;
      if (videoElRef.current) {
        videoElRef.current.srcObject = stream;
      }
      setHasVideo(true);
      return () => {
        localPreviewStreamRef.current = null;
        stream.getTracks().forEach((t) => t.stop());
      };
    } catch {
      return () => {};
    }
  }, []);

  // Attach local camera fallback stream or LiveKit tracks once VideoTile mounts after loading completes
  useEffect(() => {
    if (loading) return;
    if (lkHandleRef.current) {
      lkHandleRef.current.attachElements(videoElRef.current, hindiAudioElRef.current);
      lkHandleRef.current.setHindiAudioMuted(channelRef.current === 'kannada');
    }
    if (videoElRef.current && localPreviewStreamRef.current) {
      if (videoElRef.current.srcObject !== localPreviewStreamRef.current) {
        videoElRef.current.srcObject = localPreviewStreamRef.current;
      }
    }
  }, [loading, hasVideo, camEnabled, audioOnly]);

  useEffect(() => {
    let active = true;
    let fallbackCamCleanup = () => {};

    const queue = new KannadaAudioQueue({
      onCatchingUp: (flag) => setCatchingUp(flag),
      onUnlockedChange: (unlocked) => setListeningUnlocked(unlocked)
    });
    audioQueueRef.current = queue;

    async function init() {
      setLoading(true);
      setFatalError('');
      try {
        const storedName = sessionStorage.getItem(`live_name_${roomCode}`) || user?.name || 'Student';
        const res = await getLiveRoomToken(roomCode, { displayName: storedName });
        if (!active) return;

        const assignedRole = res.role || 'student';
        setRole(assignedRole);
        roleRef.current = assignedRole;
        setRoomInfo(res.room);
        setStudentCount(res.room?.studentCount || 0);
        setMockMode(Boolean(res.mockMode));
        mockModeRef.current = Boolean(res.mockMode);

        // Fetch any prior text transcripts
        try {
          const hist = await getLiveTranscripts(roomCode);
          if (active && Array.isArray(hist?.transcripts) && hist.transcripts.length > 0) {
            appendSegments(hist.transcripts);
          }
        } catch (_) {}

        // Connect WebSocket relay
        const wsClient = new LiveWsClient({
          code: roomCode,
          role: assignedRole,
          onStatus: (st) => {
            if (active) setWsStatus(st);
          },
          onMessage: (msg) => {
            if (!active) return;
            if (msg.type === 'connected') {
              setWsStatus('live');
              setStudentCount(msg.studentCount ?? 0);
              setMockMode(Boolean(msg.mockMode));
            } else if (msg.type === 'student_count') {
              setStudentCount(msg.studentCount ?? 0);
            } else if (msg.type === 'partial') {
              setPartialHindi(msg.hindi || '');
            } else if (msg.type === 'replay' && Array.isArray(msg.segments)) {
              appendSegments(msg.segments);
              if (assignedRole === 'student' && channelRef.current === 'kannada') {
                for (const seg of msg.segments.slice(-2)) {
                  if (seg.audio) {
                    queue.enqueue({
                      seq: seg.seq,
                      audioBase64: seg.audio,
                      mockMode: Boolean(res.mockMode)
                    });
                  }
                }
              }
            } else if (msg.type === 'segment') {
              setPartialHindi('');
              appendSegments(msg);
              if (assignedRole === 'student' && msg.audio && channelRef.current === 'kannada') {
                queue.enqueue({
                  seq: msg.seq,
                  audioBase64: msg.audio,
                  mockMode: Boolean(res.mockMode)
                });
              }
              if (msg.note === 'translation_failed') {
                setWarningNote('Translation temporarily unavailable — showing Hindi text.');
              } else if (msg.note === 'captions_only_tts_failed') {
                setWarningNote('Kannada speech synthesis failed for a sentence — showing captions only.');
              }
            } else if (msg.type === 'class_ended') {
              setClassEnded(true);
              setEndedReason(msg.reason || 'Teacher ended the class.');
              wsClient.close();
              lkHandleRef.current?.disconnect();
            } else if (msg.type === 'pipeline_warning') {
              setWarningNote(msg.message || '');
            }
          },
          onError: (msg) => {
            if (active) setWarningNote(msg);
          }
        });
        wsClientRef.current = wsClient;
        wsClient.connect();

        // Connect LiveKit if configured
        if (res.livekit?.configured && res.livekit?.url && res.livekit?.token) {
          try {
            const lk = await connectToLiveKitRoom({
              url: res.livekit.url,
              token: res.livekit.token,
              role: assignedRole,
              videoEl: videoElRef.current,
              audioEl: hindiAudioElRef.current,
              onActiveSpeaker: (speaking) => {
                if (active) setIsSpeaking(speaking);
              },
              onTrackStateChange: (state) => {
                if (!active) return;
                if (typeof state.hasVideo === 'boolean') setHasVideo(state.hasVideo);
                if (typeof state.teacherMuted === 'boolean') setTeacherMuted(state.teacherMuted);
              },
              onWarning: (w) => {
                if (active) setWarningNote(w);
              }
            });
            if (!active) {
              await lk.disconnect();
              return;
            }
            lkHandleRef.current = lk;
            if (assignedRole === 'student') {
              lk.setHindiAudioMuted(channelRef.current === 'kannada');
            }
          } catch (lkErr) {
            setWarningNote(`Video server offline (${lkErr?.message || 'LiveKit unavailable'}). Translation & captions continue over WebSocket.`);
            if (assignedRole === 'teacher') {
              fallbackCamCleanup = await setupTeacherLocalCameraFallback();
            }
          }
        } else {
          if (assignedRole === 'teacher') {
            fallbackCamCleanup = await setupTeacherLocalCameraFallback();
          }
        }

        if (assignedRole === 'teacher') {
          await setupTeacherAudioWorklet(wsClient);
        }
      } catch (err) {
        if (!active) return;
        if (err?.status === 410) {
          setClassEnded(true);
          setEndedReason(err.message || 'This live class has ended.');
          setRoomInfo(err.data?.room || { code: roomCode, title: 'Live class' });
        } else {
          setFatalError(err?.message || 'Could not enter this live class.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    init();

    return () => {
      active = false;
      fallbackCamCleanup();
      workletCleanupRef.current?.();
      wsClientRef.current?.close();
      lkHandleRef.current?.disconnect();
      queue.destroy();
    };
  }, [roomCode, user?.name, appendSegments, setupTeacherAudioWorklet, setupTeacherLocalCameraFallback]);

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/live/${roomCode}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast(`Copied class link (${roomCode})`, 'success');
    } catch {
      showToast(`Share code: ${roomCode}`, 'info');
    }
  };

  const handleToggleMic = async () => {
    const next = !micEnabled;
    setMicEnabled(next);
    setTeacherMuted(!next);
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({ muted: !next });
    }
    await lkHandleRef.current?.setTeacherMicEnabled(next);
  };

  const handleToggleCam = async () => {
    const next = !camEnabled;
    setCamEnabled(next);
    if (lkHandleRef.current) {
      await lkHandleRef.current.setTeacherCamEnabled(next);
    } else if (localPreviewStreamRef.current) {
      localPreviewStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = next;
      });
      setHasVideo(next);
    } else {
      setHasVideo(next && Boolean(videoElRef.current?.srcObject));
    }
  };

  const handleConfirmEndClass = async () => {
    setEndingClass(true);
    try {
      await endLiveRoom(roomCode);
      setClassEnded(true);
      setEndedReason('You ended the class.');
      setEndConfirmOpen(false);
      workletCleanupRef.current?.();
      wsClientRef.current?.close();
      await lkHandleRef.current?.disconnect();
    } catch (err) {
      showToast(err?.message || 'Failed to end class.', 'error');
    } finally {
      setEndingClass(false);
    }
  };

  const handleChangeChannel = (nextChannel) => {
    setChannel(nextChannel);
    audioQueueRef.current?.setChannel(nextChannel);
    lkHandleRef.current?.setHindiAudioMuted(nextChannel === 'kannada');
    setChannelAnnouncement(
      nextChannel === 'kannada'
        ? 'Switched to Kannada spoken translation. Teacher Hindi audio muted.'
        : 'Switched to Hindi original audio. Kannada translation muted.'
    );
  };

  const handleToggleAudioOnly = () => {
    const next = !audioOnly;
    setAudioOnly(next);
    lkHandleRef.current?.setStudentAudioOnly(next);
  };

  const handleStartListening = async () => {
    try {
      await audioQueueRef.current?.unlock();
      if (hindiAudioElRef.current && channel === 'hindi') {
        await hindiAudioElRef.current.play().catch(() => {});
      }
      showToast('Audio enabled', 'success');
    } catch (err) {
      showToast(err?.message || 'Tap again to enable audio playback.', 'error');
    }
  };

  const handleLeave = () => {
    wsClientRef.current?.close();
    lkHandleRef.current?.disconnect();
    navigate('/live');
  };

  const handleTriggerMockSentence = () => {
    wsClientRef.current?.sendControl({ type: 'mock_speak' });
  };

  if (loading) {
    return (
      <div className="live-page live-room-page">
        <PaperCard flat>
          <Skeleton lines={5} />
        </PaperCard>
      </div>
    );
  }

  if (fatalError) {
    return (
      <div className="live-page live-room-page">
        <PaperCard flat>
          <Tape tone="yellow" />
          <EmptyState
            icon={AlertCircle}
            title="Could not open this class"
            description={fatalError}
            actionLabel="Back to Live lobby"
            onAction={() => navigate('/live')}
          />
        </PaperCard>
      </div>
    );
  }

  if (classEnded) {
    return (
      <div className="live-page">
        <SectionHeader
          as="h1"
          tag="SESSION ARCHIVE"
          title={roomInfo?.title || `Class ${roomCode}`}
          note={endedReason || 'This live class has ended.'}
        />

        <PaperCard flat>
          <Tape tone="kraft" />
          <div className="live-card-stack">
            <div className="live-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                <CheckCircle2 size={20} strokeWidth={2} aria-hidden="true" />
                <h2 className="type-h2" style={{ color: 'var(--ink)' }}>
                  Class completed
                </h2>
              </div>
              <Stamp variant="ended">Ended</Stamp>
            </div>

            <p className="type-body" style={{ color: 'var(--ink-muted)' }}>
              {segments.length} translated text segments were saved for this session (no audio is ever stored).
            </p>

            <div>
              <Button variant="primary" onClick={() => navigate('/live')}>
                Back to Live lobby
              </Button>
            </div>
          </div>
        </PaperCard>

        {segments.length > 0 ? <CaptionSheet segments={segments} /> : null}
      </div>
    );
  }

  const effectiveStatus = catchingUp ? 'catching_up' : wsStatus;

  return (
    <div className="live-page live-room-page">
      {/* Hidden audio element for teacher's original Hindi WebRTC audio */}
      <audio ref={hindiAudioElRef} autoPlay playsInline muted={channel === 'kannada'} />

      {/* Screen-reader announcement for instant channel switching */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {channelAnnouncement}
      </div>

      {/* Header strip */}
      <div className="live-room-header">
        <div className="live-room-header__left">
          <SectionHeader
            as="h1"
            tag={role === 'teacher' ? 'TEACHER CONSOLE' : 'LIVE CLASSROOM'}
            title={roomInfo?.title || `Live Class ${roomCode}`}
            note={`Teacher: ${roomInfo?.teacherName || 'Teacher'}`}
          />
          <div className="live-room-header__badges">
            <Stamp variant="live">Live</Stamp>
            <StatusChip status={effectiveStatus} />
            <Tag variant="paper">
              <Users size={13} strokeWidth={2} aria-hidden="true" />
              <span>{studentCount} / 30 students</span>
            </Tag>
          </div>
        </div>

        <div className="live-room-header__right">
          <StickyNote tone="yellow" rotation="-1deg" className="live-code-sticky">
            <span className="live-code-sticky__label">Class code</span>
            <span className="live-code-sticky__code">{roomCode}</span>
            <Button variant="note" size="sm" onClick={handleCopyLink}>
              <Copy size={14} strokeWidth={2} aria-hidden="true" />
              <span>Copy link</span>
            </Button>
          </StickyNote>
        </div>
      </div>

      {/* Student autoplay unlock banner */}
      {role === 'student' && !listeningUnlocked ? (
        <PaperCard flat>
          <div className="live-listen-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
              <Volume2 size={20} strokeWidth={2} aria-hidden="true" />
              <div>
                <h2 className="type-h3" style={{ color: 'var(--ink)' }}>
                  Audio is ready
                </h2>
                <p className="type-small" style={{ color: 'var(--ink-muted)' }}>
                  Tap &ldquo;Start listening&rdquo; so your browser can play spoken Kannada translation.
                </p>
              </div>
            </div>
            <Button variant="primary" onClick={handleStartListening}>
              <Volume2 size={16} strokeWidth={2} aria-hidden="true" />
              <span>Start listening</span>
            </Button>
          </div>
        </PaperCard>
      ) : null}

      {warningNote ? (
        <StickyNote tone="pink" body rotation="-0.5deg" className="live-note-card live-note-card--readable">
          {warningNote}
        </StickyNote>
      ) : null}

      {/* Main Stage: VideoTile + CaptionSheet */}
      <div className={`live-stage-grid${role === 'student' && !captionsOn ? ' live-stage-grid--single' : ''}`}>
        <div className="live-left-col">
          <VideoTile
            videoRef={videoElRef}
            teacherName={roomInfo?.teacherName || 'Teacher'}
            hasVideo={hasVideo}
            isMuted={teacherMuted || (role === 'teacher' && !micEnabled)}
            isSpeaking={isSpeaking}
            audioOnly={role === 'student' && audioOnly}
          />

          {/* Role-specific sticky notes */}
          <div className="live-notes-row">
            {role === 'teacher' ? (
              <>
                <StickyNote tone="yellow" rotation="-1.5deg" className="live-note-card">
                  Use a headset so students&apos; audio doesn&apos;t echo into your mic
                </StickyNote>
                <StickyNote tone="blue" body rotation="1deg" className="live-note-card live-note-card--readable">
                  Your voice is sent to Sarvam for translation. We don&apos;t store audio.
                </StickyNote>
              </>
            ) : (
              <StickyNote tone="yellow" rotation="-1.5deg" className="live-note-card">
                Use earphones.
              </StickyNote>
            )}
          </div>
        </div>

        {(role === 'teacher' || captionsOn) ? (
          <div className="live-right-col">
            <CaptionSheet segments={segments} partialHindi={partialHindi} />

            {role === 'teacher' ? (
              <PipelinePanel
                segments={segments}
                mockMode={mockMode}
                onTriggerMockSentence={handleTriggerMockSentence}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Floating Bottom ControlBar */}
      <ControlBar
        role={role}
        micEnabled={micEnabled}
        camEnabled={camEnabled}
        onToggleMic={handleToggleMic}
        onToggleCam={handleToggleCam}
        onRequestEndClass={() => setEndConfirmOpen(true)}
        channel={channel}
        onChangeChannel={handleChangeChannel}
        captionsOn={captionsOn}
        onToggleCaptions={() => setCaptionsOn((prev) => !prev)}
        audioOnly={audioOnly}
        onToggleAudioOnly={handleToggleAudioOnly}
        onLeave={handleLeave}
      />

      {/* Teacher End Class Confirmation Modal */}
      <Modal
        open={endConfirmOpen}
        onClose={() => setEndConfirmOpen(false)}
        title="End live class?"
        tapeTone="kraft"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
            <Button variant="ghost" onClick={() => setEndConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmEndClass} disabled={endingClass}>
              {endingClass ? 'Ending...' : 'End class'}
            </Button>
          </div>
        }
      >
        <p className="type-body" style={{ color: 'var(--ink-muted)' }}>
          This will disconnect all {studentCount} connected students and close room{' '}
          <strong>{roomCode}</strong>. Text transcripts remain saved.
        </p>
      </Modal>
    </div>
  );
}
