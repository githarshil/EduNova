import React from 'react';
import { Check, CircleDot } from 'lucide-react';

const STAGES = [
  { key: 'hindiSpeech', label: 'Hindi speech' },
  { key: 'hindiText', label: 'Hindi text' },
  { key: 'kannadaText', label: 'Kannada text' },
  { key: 'kannadaSpeech', label: 'Kannada speech' }
];

/**
 * Four-pin pipeline progress indicator above the demo cards.
 * Each pin turns --emerald-500 with a tick icon when its stage finishes for the current sentence.
 */
export default function PipelineSteps({ steps = {} }) {
  return (
    <div className="demo-pipeline-steps" role="list" aria-label="Sentence translation stages">
      {STAGES.map((stage, idx) => {
        const done = Boolean(steps[stage.key]);
        return (
          <React.Fragment key={stage.key}>
            <div
              role="listitem"
              className={`demo-step-pin${done ? ' is-done' : ''}`}
            >
              <span className="demo-step-pin__dot" aria-hidden="true">
                {done ? (
                  <Check size={12} strokeWidth={2.8} />
                ) : (
                  <CircleDot size={11} strokeWidth={2.2} />
                )}
              </span>
              <span className="demo-step-pin__label">{stage.label}</span>
              <span className="sr-only">{done ? 'completed' : 'pending'}</span>
            </div>
            {idx < STAGES.length - 1 ? (
              <span className={`demo-step-connector${done ? ' is-done' : ''}`} aria-hidden="true" />
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}
