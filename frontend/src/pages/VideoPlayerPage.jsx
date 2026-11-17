import React, { useState, useEffect, useRef } from 'react';
import { apiUrl } from '../services/api';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  XCircle,
  Video as VideoIcon,
  FileText,
  Clock,
  Download,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import {
  HeroCard,
  PaperCard,
  Tag,
  StickyNote,
  Button,
  Skeleton,
  EmptyState,
  resolveSubjectKey,
} from '../components/ui';

const OHM_FALLBACK_VIDEO = {
  id: 'vid_physics_electricity',
  title: "Ohm's Law & Circuit Resistance Explained",
  subject: 'Physics',
  classLevel: 10,
  chapterTitle: 'Electricity',
  durationSeconds: 30,
  videoUrl: '/media/ohmslaw.mp4',
  videoFileName: 'ohmslaw.mp4',
  notesUrl: '/media/ohmslawnotes.pdf',
  notesFileName: 'ohmslawnotes.pdf',
  notesTitle: "Ohm's Law Study Notes (PDF)",
  timestamps: [
    { time: 0, title: 'Introduction to Drift Velocity & Charge Flow' },
    { time: 8, title: "Ohm's Law: V = IR Principle" },
    { time: 18, title: 'Interactive Concept Checkpoint' },
    { time: 24, title: "Joule Heating & Filaments (H = I²Rt)" },
  ],
  checkpoint: {
    time: 18,
    question: 'According to Ohm’s law, if the length of a wire is doubled with uniform cross-section, what happens to its resistance?',
    options: ['Halved', 'Doubles (R ∝ L)', 'Remains identical', 'Quadruples'],
    correctIndex: 1,
    explanation: 'Resistance R = ρL/A. When length L is doubled while area A stays constant, resistance doubles.',
  },
  transcript: `Electric current is the net flow of electric charges through a conductor. In a metallic wire, free electrons drift with small velocities under an applied potential difference. Ohm's Law states V = IR. Higher resistance leads to greater Joule dissipation as heat.`,
};

export default function VideoPlayerPage() {
  const navigate = useNavigate();

  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(120);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [activeTab, setActiveTab] = useState('notes');

  const [activeCheckpoint, setActiveCheckpoint] = useState(null);
  const [checkpointAnswered, setCheckpointAnswered] = useState(false);
  const [checkpointResult, setCheckpointResult] = useState(null);

  const videoRef = useRef(null);

  useEffect(() => {
    async function loadVideos() {
      try {
        setLoading(true);
        const res = await fetch(apiUrl('/api/videos'));
        const data = await res.json();
        if (data.success && Array.isArray(data.videos) && data.videos.length > 0) {
          const ohmVideo =
            data.videos.find((v) => v.id === 'vid_physics_electricity') || data.videos[0];
          setSelectedVideo({
            ...OHM_FALLBACK_VIDEO,
            ...ohmVideo,
            videoUrl: '/media/ohmslaw.mp4',
            notesUrl: ohmVideo.notesUrl || '/media/ohmslawnotes.pdf',
          });
        } else {
          setSelectedVideo(OHM_FALLBACK_VIDEO);
        }
      } catch (err) {
        console.error('Failed to load videos, using local Ohm lesson:', err);
        setSelectedVideo(OHM_FALLBACK_VIDEO);
      } finally {
        setLoading(false);
      }
    }
    loadVideos();
  }, []);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = Math.floor(videoRef.current.currentTime);
    setCurrentTime(curr);

    if (
      selectedVideo?.checkpoint &&
      curr >= selectedVideo.checkpoint.time &&
      !checkpointAnswered &&
      !activeCheckpoint
    ) {
      videoRef.current.pause();
      setIsPlaying(false);
      setActiveCheckpoint(selectedVideo.checkpoint);
    }
  };

  const handleSeek = (seconds) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = seconds;
    setCurrentTime(seconds);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSpeedChange = (speed) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
  };

  const handleCheckpointOption = (optionIndex) => {
    const isCorrect = optionIndex === activeCheckpoint.correctIndex;
    setCheckpointAnswered(true);
    setCheckpointResult(isCorrect);
  };

  const handleResumeAfterCheckpoint = () => {
    setActiveCheckpoint(null);
    if (videoRef.current) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleAskSaarthiAtTimestamp = () => {
    if (!selectedVideo) return;
    const mins = Math.floor(currentTime / 60);
    const secs = currentTime % 60;
    const timeFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    const prompt = `In the chapter video "${selectedVideo.title}" at timestamp [${timeFormatted}]: Can you explain this concept in detail from NCERT and test my understanding?`;
    navigate('/mentor', { state: { prefill: prompt, subject: selectedVideo.subject } });
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return <Skeleton lines={5} />;
  }

  if (!selectedVideo) {
    return (
      <EmptyState
        icon={VideoIcon}
        title="No Video Lectures Found"
        description="Video explainers are not synced yet. Try exploring interactive labs or syllabus lessons."
        actionLabel="Go to Syllabus"
        to="/subjects"
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      <HeroCard
        eyebrow="Concept Video Notebook"
        eyebrowVariant="verified"
        title="Chapter Video Lectures"
        subtitle="Interactive chapter timestamps, concept checkpoints, and instant Chotu explanations."
      />

      <div
        className="paper-grid paper-grid--split"
        style={{
          gridTemplateColumns: 'minmax(0, 1.6fr) minmax(260px, 1fr)',
          alignItems: 'start',
        }}
      >
        {/* Left: Dark Cinema Theater Card */}
        <PaperCard variant="dark" flat style={{ padding: 'var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <div style={{ position: 'relative', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--slate-950)' }}>
            <video
              ref={videoRef}
              src={selectedVideo.videoUrl}
              playsInline
              preload="metadata"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={() => setDuration(videoRef.current?.duration || selectedVideo.durationSeconds)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              style={{ width: '100%', display: 'block', maxHeight: '420px' }}
            />

            {activeCheckpoint ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'var(--scrim)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 'var(--sp-4)',
                }}
              >
                <PaperCard flat style={{ padding: 'var(--sp-5)', maxWidth: '460px', width: '100%' }}>
                  <Tag variant="verified">CHECKPOINT QUIZ</Tag>
                  <h3 className="type-h3" style={{ color: 'var(--ink)', margin: 'var(--sp-2) 0 var(--sp-3)' }}>
                    {activeCheckpoint.question}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                    {(activeCheckpoint.options || []).map((opt, idx) => (
                      <Button
                        key={idx}
                        variant={checkpointAnswered && idx === activeCheckpoint.correctIndex ? 'primary' : 'note'}
                        size="sm"
                        disabled={checkpointAnswered}
                        onClick={() => handleCheckpointOption(idx)}
                        style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                      >
                        {String.fromCharCode(65 + idx)}. {opt}
                      </Button>
                    ))}
                  </div>

                  {checkpointAnswered ? (
                    <div style={{ marginTop: 'var(--sp-3)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                      <StickyNote tone={checkpointResult ? 'green' : 'pink'} body style={{ maxWidth: '100%' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                          {checkpointResult ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                          {checkpointResult ? 'Correct! Great job.' : 'Incorrect. ' + activeCheckpoint.explanation}
                        </span>
                      </StickyNote>
                      <Button variant="primary" size="sm" onClick={handleResumeAfterCheckpoint}>
                        Resume Video
                      </Button>
                    </div>
                  ) : null}
                </PaperCard>
              </div>
            ) : null}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <span className="type-label" style={{ color: 'var(--on-desk-muted)' }}>{formatSeconds(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => handleSeek(Number(e.target.value))}
                aria-label="Video timeline"
                style={{ flex: 1, accentColor: 'var(--amber-400)' }}
              />
              <span className="type-label" style={{ color: 'var(--on-desk-muted)' }}>{formatSeconds(duration)}</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--sp-2)' }}>
                <Button variant="kraft" size="sm" onClick={togglePlay}>
                  {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>

                <Button
                  variant="dark"
                  size="sm"
                  onClick={() => {
                    if (!videoRef.current) return;
                    videoRef.current.muted = !isMuted;
                    setIsMuted(!isMuted);
                  }}
                  aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                >
                  {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </Button>

                {[1, 1.25, 1.5].map((sp) => (
                  <Button
                    key={sp}
                    variant={playbackSpeed === sp ? 'primary' : 'dark'}
                    size="sm"
                    onClick={() => handleSpeedChange(sp)}
                  >
                    {sp}x
                  </Button>
                ))}
              </div>

              <Button variant="note" size="sm" onClick={handleAskSaarthiAtTimestamp}>
                <Sparkles size={14} strokeWidth={2} aria-hidden="true" />
                Ask Saarthi at {formatSeconds(currentTime)}
              </Button>
            </div>
          </div>
        </PaperCard>

        {/* Right: Metadata, Downloads & Study Notes (no other video list buttons) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <PaperCard flat style={{ padding: 'var(--sp-4)' }}>
            <Tag variant={resolveSubjectKey(selectedVideo.subject)}>
              {selectedVideo.subject} · Class {selectedVideo.classLevel}
            </Tag>
            <h2 className="type-h3" style={{ color: 'var(--ink)', marginTop: 'var(--sp-2)' }}>
              {selectedVideo.title}
            </h2>
            <p className="type-small" style={{ color: 'var(--ink-muted)', marginTop: '4px' }}>
              Chapter: {selectedVideo.chapterTitle} · Duration: {formatSeconds(duration)}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)', marginTop: 'var(--sp-3)' }}>
              <Button
                variant="primary"
                size="sm"
                href={selectedVideo.videoUrl}
                download={selectedVideo.videoFileName || 'ohmslaw.mp4'}
              >
                <Download size={14} aria-hidden="true" />
                Download Video
              </Button>
              <Button
                variant="kraft"
                size="sm"
                href={selectedVideo.notesUrl || '/media/ohmslawnotes.pdf'}
                download={selectedVideo.notesFileName || 'ohmslawnotes.pdf'}
              >
                <Download size={14} aria-hidden="true" />
                Download Notes
              </Button>
            </div>
          </PaperCard>

          <PaperCard flat style={{ padding: 'var(--sp-4)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
              <Button
                variant={activeTab === 'notes' ? 'primary' : 'note'}
                size="sm"
                onClick={() => setActiveTab('notes')}
              >
                <BookOpen size={14} aria-hidden="true" />
                Notes (PDF)
              </Button>
              <Button
                variant={activeTab === 'chapters' ? 'primary' : 'note'}
                size="sm"
                onClick={() => setActiveTab('chapters')}
              >
                <Clock size={14} aria-hidden="true" />
                Chapter Timestamps
              </Button>
              <Button
                variant={activeTab === 'transcript' ? 'primary' : 'note'}
                size="sm"
                onClick={() => setActiveTab('transcript')}
              >
                <FileText size={14} aria-hidden="true" />
                Transcript
              </Button>
            </div>

            {activeTab === 'notes' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
                  <span className="type-small" style={{ color: 'var(--ink-muted)', fontWeight: 600 }}>
                    {selectedVideo.notesTitle || "Ohm's Law Study Notes (PDF)"}
                  </span>
                  <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                    <Button
                      variant="note"
                      size="sm"
                      href={selectedVideo.notesUrl || '/media/ohmslawnotes.pdf'}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink size={14} aria-hidden="true" />
                      Open PDF
                    </Button>
                  </div>
                </div>
                <iframe
                  src={`${selectedVideo.notesUrl || '/media/ohmslawnotes.pdf'}#view=FitH`}
                  title="Ohm's Law Notes PDF"
                  style={{
                    width: '100%',
                    height: '420px',
                    borderRadius: 'var(--r-md)',
                    border: '1px solid var(--paper-border-warm)',
                    background: 'var(--paper-field)',
                  }}
                />
              </div>
            ) : activeTab === 'chapters' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                {(selectedVideo.timestamps || []).map((ts, idx) => {
                  const isCurrent =
                    currentTime >= ts.time &&
                    (idx === selectedVideo.timestamps.length - 1 ||
                      currentTime < selectedVideo.timestamps[idx + 1].time);
                  return (
                    <Button
                      key={idx}
                      variant={isCurrent ? 'primary' : 'note'}
                      size="sm"
                      onClick={() => handleSeek(ts.time)}
                      style={{ justifyContent: 'space-between', textAlign: 'left' }}
                    >
                      <span>{ts.title}</span>
                      <span className="type-label">{formatSeconds(ts.time)}</span>
                    </Button>
                  );
                })}
              </div>
            ) : (
              <p className="type-small" style={{ color: 'var(--ink-muted)', whiteSpace: 'pre-wrap' }}>
                {selectedVideo.transcript}
              </p>
            )}
          </PaperCard>
        </div>
      </div>
    </div>
  );
}
