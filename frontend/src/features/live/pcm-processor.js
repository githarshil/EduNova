/**
 * AudioWorkletProcessor capturing teacher microphone audio,
 * downsampling from native AudioContext sampleRate to 16 kHz mono Int16 PCM
 * using linear interpolation, and posting ~120ms (1920-sample / 3840-byte) chunks.
 */
class Pcm16kProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetRate = 16000;
    this.targetChunkSamples = 1920; // 120ms at 16 kHz (snappy within 100-250ms range)
    this.buffer = new Int16Array(this.targetChunkSamples);
    this.offset = 0;
    this.ratio = sampleRate / this.targetRate;
    this.sourceCursor = 0;
    this.prevSample = 0;
    this.muted = false;

    this.port.onmessage = (event) => {
      if (event.data && typeof event.data.muted === 'boolean') {
        this.muted = event.data.muted;
      }
    };
  }

  process(inputs) {
    if (this.muted) return true;
    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) return true;

    const channel = input[0];
    while (this.sourceCursor < channel.length) {
      const idx = Math.floor(this.sourceCursor);
      const frac = this.sourceCursor - idx;
      const s0 = idx === 0 && this.sourceCursor < 1 ? this.prevSample : (channel[idx] || 0);
      const s1 = idx + 1 < channel.length ? channel[idx + 1] : (channel[idx] || 0);
      const interpolated = s0 + (s1 - s0) * frac;

      const clamped = Math.max(-1, Math.min(1, interpolated));
      this.buffer[this.offset] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      this.offset += 1;

      if (this.offset >= this.targetChunkSamples) {
        const out = this.buffer.slice(0, this.targetChunkSamples);
        this.port.postMessage(out.buffer, [out.buffer]);
        this.offset = 0;
      }
      this.sourceCursor += this.ratio;
    }

    this.prevSample = channel[channel.length - 1] || 0;
    this.sourceCursor -= channel.length;
    return true;
  }
}

registerProcessor('pcm-16k-processor', Pcm16kProcessor);
