import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Activity, Volume2 } from 'lucide-react';
import { Button } from '../../components/ui';

/**
 * Teacher-only collapsible dark panel showing mono stage timings in ms
 * (speech-to-text, translate, speech synthesis) and total delay per sentence.
 */
export default function PipelinePanel({
  segments = [],
  glossaryCount = 32,
  mockMode = false,
  onTriggerMockSentence
}) {
  const [open, setOpen] = useState(false);
  const recent = segments.slice(-6);
  const latest = recent[recent.length - 1];

  return (
    <section className="live-pipeline-panel" aria-label="Translation pipeline timings">
      <button
        type="button"
        className="live-pipeline-toggle"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={16} strokeWidth={2} aria-hidden="true" />
          <span>
            Pipeline timings (ms)
            {latest?.timings ? ` · Last total: ${latest.timings.totalMs} ms` : ''}
          </span>
        </span>
        {open ? (
          <ChevronUp size={16} strokeWidth={2} aria-hidden="true" />
        ) : (
          <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
        )}
      </button>

      {open ? (
        <div className="live-pipeline-body">
          <div className="live-pipeline-readout">
            <div>
              MODE: {mockMode ? 'LIVE_MOCK=1 (canned Hindi -> Kannada)' : 'SARVAM REALTIME (saaras:v4 -> mayura:v1 -> bulbul:v4-flash)'}
            </div>
            <div>GLOSSARY BIASING: {glossaryCount} STEM terms active (needs review)</div>
          </div>

          {mockMode && onTriggerMockSentence ? (
            <div>
              <Button variant="dark" size="sm" onClick={onTriggerMockSentence}>
                <Volume2 size={15} strokeWidth={2} aria-hidden="true" />
                <span>Emit sample Hindi sentence</span>
              </Button>
            </div>
          ) : null}

          {recent.length === 0 ? (
            <p className="type-small" style={{ color: 'var(--on-desk-muted)' }}>
              No sentences processed yet. Speak in Hindi (or emit a sample sentence in mock mode) to inspect stage delays.
            </p>
          ) : (
            <table className="live-pipeline-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>STT (ms)</th>
                  <th>Translate (ms)</th>
                  <th>Speech (ms)</th>
                  <th>Total (ms)</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((seg) => (
                  <tr key={seg.seq}>
                    <td>{seg.seq}</td>
                    <td>{seg.timings?.sttMs ?? '-'}</td>
                    <td>{seg.timings?.translateMs ?? '-'}</td>
                    <td>{seg.timings?.ttsMs ?? '-'}</td>
                    <td>{seg.timings?.totalMs ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </section>
  );
}
