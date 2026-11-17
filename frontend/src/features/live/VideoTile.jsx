import React from 'react';
import { MicOff, VideoOff, Headphones } from 'lucide-react';
import { PaperCard, Tape } from '../../components/ui';

/**
 * Teacher video stage rendered on a flat taped PaperCard.
 * Active speaker gets a 2px --emerald-500 ring.
 */
export default function VideoTile({
  videoRef,
  teacherName = 'Teacher',
  hasVideo = false,
  isMuted = false,
  isSpeaking = false,
  audioOnly = false
}) {
  return (
    <PaperCard
      flat
      className={`live-video-card${isSpeaking ? ' live-video-card--speaking' : ''}`}
    >
      <Tape tone="green" rotation="-1.5deg" />

      <div className="live-video-frame">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`live-video-el${!hasVideo || audioOnly ? ' live-video-el--hidden' : ''}`}
          aria-label={`${teacherName} video stream`}
        />

        {audioOnly ? (
          <div className="live-video-placeholder">
            <Headphones size={32} strokeWidth={2} aria-hidden="true" />
            <span className="type-small">Audio-only mode active (video paused to save data)</span>
          </div>
        ) : !hasVideo ? (
          <div className="live-video-placeholder">
            <VideoOff size={32} strokeWidth={2} aria-hidden="true" />
            <span className="type-small">{teacherName} camera is off or connecting</span>
          </div>
        ) : null}

        <div className="live-video-namechip">
          <span>{teacherName}</span>
          {isMuted ? (
            <span className="live-video-muted-icon" aria-label="Microphone muted" title="Muted">
              <MicOff size={14} strokeWidth={2.2} aria-hidden="true" />
            </span>
          ) : null}
        </div>
      </div>
    </PaperCard>
  );
}
