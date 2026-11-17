import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, Users, KeyRound, Play } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  SectionHeader,
  PaperCard,
  Tape,
  Field,
  Button,
  StickyNote,
  Skeleton,
  Tag
} from '../../components/ui';
import { getLiveConfig, createLiveRoom, getLiveRoom } from './liveClient';
import './live.css';

export default function LiveLobbyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [configLoading, setConfigLoading] = useState(true);
  const [config, setConfig] = useState({
    mockMode: false,
    requiresTeacherCode: user?.role !== 'teacher',
    teacherCodeConfigured: true
  });
  const [configError, setConfigError] = useState('');

  // Join form state
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState(user?.name || '');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  // Start form state
  const [classTitle, setClassTitle] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [startError, setStartError] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (user?.name && !joinName) {
      setJoinName(user.name);
    }
  }, [user?.name]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getLiveConfig();
        if (!cancelled && res) {
          setConfig(res);
        }
      } catch (err) {
        if (!cancelled) {
          setConfigError(err?.message || 'Could not reach live class server.');
        }
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    setJoinError('');
    const normalized = joinCode.trim().toUpperCase();
    if (!/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/.test(normalized)) {
      setJoinError('Enter a valid 6-character class code (letters & numbers, no 0/O/1/I/L).');
      return;
    }
    const cleanName = joinName.trim();
    if (cleanName.length < 2) {
      setJoinError('Enter your name (at least 2 characters).');
      return;
    }

    setJoining(true);
    try {
      const res = await getLiveRoom(normalized);
      if (res?.room?.status === 'ended') {
        setJoinError('This class has already ended.');
        setJoining(false);
        return;
      }
      sessionStorage.setItem(`live_name_${normalized}`, cleanName);
      navigate(`/live/${normalized}`);
    } catch (err) {
      setJoinError(err?.message || 'Could not find a live class with that code.');
    } finally {
      setJoining(false);
    }
  };

  const handleStartSubmit = async (e) => {
    e.preventDefault();
    setStartError('');
    const cleanTitle = classTitle.trim();
    if (cleanTitle.length < 3) {
      setStartError('Enter a class title (at least 3 characters).');
      return;
    }
    if (config.requiresTeacherCode && !teacherCode.trim()) {
      setStartError('Enter your teacher passcode to start a live class.');
      return;
    }

    setStarting(true);
    try {
      const res = await createLiveRoom({
        title: cleanTitle,
        teacherCode: teacherCode.trim()
      });
      const code = res?.room?.code;
      if (!code) {
        throw new Error('Server did not return a room code.');
      }
      navigate(`/live/${code}`);
    } catch (err) {
      setStartError(err?.message || 'Could not start live class.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="live-page">
      <SectionHeader
        as="h1"
        tag={config.mockMode ? 'LIVE · MOCK DEMO' : 'LIVE CLASS'}
        title="Live Hindi → Kannada Class"
        note="Teacher speaks Hindi. Students listen in Kannada or Hindi with live captions."
      />

      {configError ? (
        <StickyNote tone="pink" body rotation="-0.5deg" className="live-note-card live-note-card--readable">
          <strong>Connection check:</strong> {configError}
        </StickyNote>
      ) : null}

      <PaperCard flat>
        <Tape tone="kraft" rotation="-1deg" />
        <div className="live-card-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
            <h2 className="type-h2" style={{ color: 'var(--ink)' }}>
              Live translation demo
            </h2>
            <p className="type-small" style={{ color: 'var(--ink-muted)' }}>
              Test solo Hindi-to-Kannada speech translation one sentence at a time — no room code or student needed.
            </p>
          </div>
          <Button variant="primary" to="/live/demo">
            <Play size={16} strokeWidth={2} aria-hidden="true" />
            <span>Try live translation</span>
          </Button>
        </div>
      </PaperCard>

      {configLoading ? (
        <div className="live-lobby-grid">
          <PaperCard flat>
            <Skeleton lines={4} />
          </PaperCard>
          <PaperCard flat>
            <Skeleton lines={4} />
          </PaperCard>
        </div>
      ) : (
        <div className="live-lobby-grid">
          {/* Card 1: Join a class */}
          <PaperCard flat>
            <Tape tone="green" rotation="-2deg" />
            <form className="live-card-stack" onSubmit={handleJoinSubmit} noValidate>
              <div className="live-card-header">
                <h2 className="type-h2" style={{ color: 'var(--ink)' }}>
                  Join a class
                </h2>
                <Tag variant="paper">
                  <Users size={13} strokeWidth={2} aria-hidden="true" />
                  <span>Listen-only</span>
                </Tag>
              </div>

              <p className="type-small" style={{ color: 'var(--ink-muted)' }}>
                Enter the 6-character code shared by your teacher. You can switch between Hindi and spoken Kannada anytime.
              </p>

              <Field
                label="Class code"
                name="classCode"
                placeholder="e.g. K7M4P9"
                maxLength={6}
                autoComplete="off"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                error={joinError && joinCode.trim().length < 6 ? joinError : undefined}
                helper="6 uppercase letters/digits (no 0, O, 1, I, or L)"
              />

              <Field
                label="Your name"
                name="displayName"
                placeholder="Enter your name"
                maxLength={60}
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                error={joinError && joinCode.trim().length === 6 ? joinError : undefined}
              />

              <div>
                <Button type="submit" variant="primary" disabled={joining}>
                  <Play size={16} strokeWidth={2} aria-hidden="true" />
                  <span>{joining ? 'Joining...' : 'Join class'}</span>
                </Button>
              </div>
            </form>
          </PaperCard>

          {/* Card 2: Start a class (Teachers only) */}
          <PaperCard flat>
            <Tape tone="yellow" rotation="1.5deg" />
            <form className="live-card-stack" onSubmit={handleStartSubmit} noValidate>
              <div className="live-card-header">
                <h2 className="type-h2" style={{ color: 'var(--ink)' }}>
                  Start a class
                </h2>
                <Tag variant="ready" dot>
                  <Radio size={13} strokeWidth={2} aria-hidden="true" />
                  <span>Teachers only</span>
                </Tag>
              </div>

              <p className="type-small" style={{ color: 'var(--ink-muted)' }}>
                Stream your camera and Hindi voice. The server translates each finished sentence into Kannada speech and captions once for the whole class.
              </p>

              <Field
                label="Class title"
                name="classTitle"
                placeholder="e.g. Class 10 Physics — Force & Motion"
                maxLength={100}
                value={classTitle}
                onChange={(e) => setClassTitle(e.target.value)}
                error={startError && classTitle.trim().length < 3 ? startError : undefined}
              />

              {config.requiresTeacherCode ? (
                <Field
                  label="Teacher passcode"
                  name="teacherCode"
                  type="password"
                  placeholder="Enter TEACHER_CODE"
                  value={teacherCode}
                  onChange={(e) => setTeacherCode(e.target.value)}
                  helper={
                    config.teacherCodeConfigured
                      ? 'Required because student accounts cannot start a broadcast.'
                      : 'Server TEACHER_CODE is not set yet in backend/.env.'
                  }
                  error={startError && classTitle.trim().length >= 3 ? startError : undefined}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', color: 'var(--emerald-700)' }}>
                  <KeyRound size={16} strokeWidth={2} aria-hidden="true" />
                  <span className="type-small">Signed in with teacher access</span>
                </div>
              )}

              <div>
                <Button type="submit" variant="primary" disabled={starting}>
                  <Radio size={16} strokeWidth={2} aria-hidden="true" />
                  <span>{starting ? 'Starting...' : 'Go live'}</span>
                </Button>
              </div>
            </form>
          </PaperCard>
        </div>
      )}
    </div>
  );
}
