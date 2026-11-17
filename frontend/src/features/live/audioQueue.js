/**
 * Web Audio API ordered playback queue for translated Kannada audio segments.
 *
 * Features:
 * - Gated behind an explicit "Start listening" user gesture (browser autoplay policy).
 * - Plays segments strictly in ascending seq order.
 * - Plays at ~1.15x pace (either via Bulbul pace or playbackRate).
 * - Lag protection: if > 8s of unplayed audio accumulates, drops oldest segments,
 *   keeps only the latest 2, and reports "catchingUp" state.
 * - Instant channel switching: switching to "hindi" immediately stops Kannada playback.
 */

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export class KannadaAudioQueue {
  constructor({ onCatchingUp, onUnlockedChange } = {}) {
    this.ctx = null;
    this.unlocked = false;
    this.enabled = true; // true when student selected "kannada" channel
    this.queue = []; // Array<{ seq, audioBuffer, durationSec, isMock }>
    this.pendingBeforeUnlock = []; // Holds latest 2 segments if audio arrives before "Start listening"
    this.playingSource = null;
    this.playingEndAt = 0;
    this.lastPlayedSeq = 0;
    this.onCatchingUp = onCatchingUp;
    this.onUnlockedChange = onUnlockedChange;
    this.catchingUpTimer = null;
  }

  async unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this.unlocked = true;
    this.onUnlockedChange?.(true);
    if (this.pendingBeforeUnlock.length > 0 && this.enabled) {
      const pending = this.pendingBeforeUnlock.splice(0);
      for (const item of pending) {
        this.enqueue(item);
      }
    }
    this._pump();
  }

  setChannel(channel) {
    const nextEnabled = channel === 'kannada';
    if (this.enabled === nextEnabled) return;
    this.enabled = nextEnabled;

    if (!this.enabled) {
      this._stopCurrentSource();
      this.queue = [];
      this.pendingBeforeUnlock = [];
      this._setCatchingUp(false);
    } else if (this.unlocked) {
      this._pump();
    }
  }

  async enqueue({ seq, audioBase64, mockMode = false }) {
    if (!audioBase64 || !this.enabled) return;
    if (seq <= this.lastPlayedSeq) return;
    if (!this.unlocked || !this.ctx) {
      if (!this.pendingBeforeUnlock.some((p) => p.seq === seq)) {
        this.pendingBeforeUnlock.push({ seq, audioBase64, mockMode });
        if (this.pendingBeforeUnlock.length > 2) {
          this.pendingBeforeUnlock.shift();
        }
      }
      return;
    }
    if (this.queue.some((item) => item.seq === seq)) return;

    try {
      const arrayBuf = base64ToArrayBuffer(audioBase64);
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuf.slice(0));
      const rate = mockMode ? 1.15 : 1.0; // Real Bulbul already generated at pace=1.15
      const durationSec = audioBuffer.duration / rate;

      this.queue.push({ seq, audioBuffer, durationSec, playbackRate: rate });
      this.queue.sort((a, b) => a.seq - b.seq);

      this._trimQueueIfBehind();
      this._pump();
    } catch (err) {
      // Ignore malformed chunk gracefully so captions continue
      console.warn('Kannada audio decode warning:', err?.message || err);
    }
  }

  _getQueuedDurationSec() {
    const remainingCurrent =
      this.playingSource && this.ctx
        ? Math.max(0, this.playingEndAt - this.ctx.currentTime)
        : 0;
    const queued = this.queue.reduce((sum, item) => sum + item.durationSec, 0);
    return remainingCurrent + queued;
  }

  _trimQueueIfBehind() {
    const totalSec = this._getQueuedDurationSec();
    if (totalSec > 8.0 && this.queue.length > 2) {
      // Skip oldest unplayed segments, keep latest 2
      this.queue = this.queue.slice(-2);
      this._setCatchingUp(true);
    }
  }

  _setCatchingUp(active) {
    if (this.catchingUpTimer) {
      clearTimeout(this.catchingUpTimer);
      this.catchingUpTimer = null;
    }
    this.onCatchingUp?.(active);
    if (active) {
      this.catchingUpTimer = setTimeout(() => {
        this.onCatchingUp?.(false);
      }, 3000);
    }
  }

  _stopCurrentSource() {
    if (this.playingSource) {
      try {
        this.playingSource.onended = null;
        this.playingSource.stop();
        this.playingSource.disconnect();
      } catch (_) {}
      this.playingSource = null;
      this.playingEndAt = 0;
    }
  }

  _pump() {
    if (!this.enabled || !this.unlocked || !this.ctx) return;
    if (this.playingSource) return;
    if (this.queue.length === 0) return;

    const next = this.queue.shift();
    if (!next) return;

    this.lastPlayedSeq = Math.max(this.lastPlayedSeq, next.seq);
    const source = this.ctx.createBufferSource();
    source.buffer = next.audioBuffer;
    source.playbackRate.value = next.playbackRate || 1.0;
    source.connect(this.ctx.destination);

    this.playingSource = source;
    this.playingEndAt = this.ctx.currentTime + next.durationSec;

    source.onended = () => {
      if (this.playingSource === source) {
        this.playingSource = null;
        this.playingEndAt = 0;
      }
      this._pump();
    };

    source.start(0);
  }

  destroy() {
    this._stopCurrentSource();
    this.queue = [];
    if (this.catchingUpTimer) {
      clearTimeout(this.catchingUpTimer);
      this.catchingUpTimer = null;
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
  }
}
