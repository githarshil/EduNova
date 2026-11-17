import React from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Subtitles,
  Headphones
} from 'lucide-react';
import { Button } from '../../components/ui';

/**
 * Floating bottom pill styled like NavBar, fixed 12px above the bottom edge.
 * All icon buttons are >= 44x44px with explicit aria-labels.
 */
export default function ControlBar({
  role,
  micEnabled,
  camEnabled,
  onToggleMic,
  onToggleCam,
  onRequestEndClass,
  channel,
  onChangeChannel,
  captionsOn,
  onToggleCaptions,
  audioOnly,
  onToggleAudioOnly,
  onLeave
}) {
  return (
    <div className="live-control-bar" role="toolbar" aria-label="Live class controls">
      {role === 'teacher' ? (
        <>
          <button
            type="button"
            className={`live-ctrl-btn${micEnabled ? ' is-active' : ''}`}
            onClick={onToggleMic}
            aria-pressed={micEnabled}
            aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
          >
            {micEnabled ? (
              <Mic size={18} strokeWidth={2} aria-hidden="true" />
            ) : (
              <MicOff size={18} strokeWidth={2} aria-hidden="true" />
            )}
            <span className="live-ctrl-btn__label">{micEnabled ? 'Mic on' : 'Mic muted'}</span>
          </button>

          <button
            type="button"
            className={`live-ctrl-btn${camEnabled ? ' is-active' : ''}`}
            onClick={onToggleCam}
            aria-pressed={camEnabled}
            aria-label={camEnabled ? 'Turn camera off' : 'Turn camera on'}
          >
            {camEnabled ? (
              <Video size={18} strokeWidth={2} aria-hidden="true" />
            ) : (
              <VideoOff size={18} strokeWidth={2} aria-hidden="true" />
            )}
            <span className="live-ctrl-btn__label">{camEnabled ? 'Cam on' : 'Cam off'}</span>
          </button>

          <Button
            variant="danger"
            size="sm"
            onClick={onRequestEndClass}
            aria-label="End live class"
          >
            <PhoneOff size={16} strokeWidth={2} aria-hidden="true" />
            <span>End class</span>
          </Button>
        </>
      ) : (
        <>
          <div className="live-lang-segment" role="group" aria-label="Audio language channel">
            <button
              type="button"
              className={`live-lang-segment__btn${channel === 'hindi' ? ' is-active' : ''}`}
              aria-pressed={channel === 'hindi'}
              onClick={() => onChangeChannel('hindi')}
            >
              Hindi (original)
            </button>
            <button
              type="button"
              className={`live-lang-segment__btn${channel === 'kannada' ? ' is-active' : ''}`}
              aria-pressed={channel === 'kannada'}
              onClick={() => onChangeChannel('kannada')}
            >
              Kannada
            </button>
          </div>

          <button
            type="button"
            className={`live-ctrl-btn${captionsOn ? ' is-active' : ''}`}
            onClick={onToggleCaptions}
            aria-pressed={captionsOn}
            aria-label={captionsOn ? 'Hide captions' : 'Show captions'}
          >
            <Subtitles size={18} strokeWidth={2} aria-hidden="true" />
            <span className="live-ctrl-btn__label">Captions</span>
          </button>

          <button
            type="button"
            className={`live-ctrl-btn${audioOnly ? ' is-active' : ''}`}
            onClick={onToggleAudioOnly}
            aria-pressed={audioOnly}
            aria-label={audioOnly ? 'Enable video' : 'Switch to audio only'}
          >
            <Headphones size={18} strokeWidth={2} aria-hidden="true" />
            <span className="live-ctrl-btn__label">Audio only</span>
          </button>

          <Button
            variant="danger"
            size="sm"
            onClick={onLeave}
            aria-label="Leave live class"
          >
            <PhoneOff size={16} strokeWidth={2} aria-hidden="true" />
            <span>Leave</span>
          </Button>
        </>
      )}
    </div>
  );
}
