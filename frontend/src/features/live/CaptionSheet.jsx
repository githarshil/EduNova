import React, { useEffect, useRef } from 'react';
import { Subtitles } from 'lucide-react';
import { PaperCard, Tape, Tag } from '../../components/ui';

/**
 * Flat ruled paper sheet displaying the last 6 translated sentences,
 * newest at the bottom, auto-scrolling.
 * Kannada at 20px in --font-body, Hindi at 14px in --ink-muted. Never hand font.
 */
export default function CaptionSheet({ segments = [], partialHindi = '' }) {
  const scrollRef = useRef(null);
  const visibleSegments = segments.slice(-6);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [visibleSegments.length, partialHindi]);

  return (
    <PaperCard flat variant="ruled" className="live-captions-card">
      <Tape tone="yellow" rotation="1.5deg" />

      <div className="live-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <Subtitles size={18} strokeWidth={2} aria-hidden="true" />
          <h2 className="type-h3" style={{ color: 'var(--ink)' }}>
            Live Captions
          </h2>
        </div>
        <Tag variant="paper">KN + HI · LAST 6</Tag>
      </div>

      <div
        ref={scrollRef}
        className="live-captions-scroll"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {visibleSegments.length === 0 && !partialHindi ? (
          <p className="type-small" style={{ color: 'var(--ink-muted)' }}>
            Waiting for the teacher to speak in Hindi. Translated Kannada sentences will appear here.
          </p>
        ) : null}

        {visibleSegments.map((seg) => (
          <div key={seg.seq} className="live-caption-item">
            <p className="live-caption-item__kn" lang="kn">
              {seg.kannada}
            </p>
            <p className="live-caption-item__hi" lang="hi">
              {seg.hindi}
            </p>
          </div>
        ))}

        {partialHindi ? (
          <div className="live-caption-partial" lang="hi">
            Listening: {partialHindi}
          </div>
        ) : null}
      </div>
    </PaperCard>
  );
}
