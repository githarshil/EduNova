/**
 * Server-side Sarvam AI Live Translation Pipeline
 *
 * Chain per finished Hindi sentence:
 *   1. Streaming STT: wss://api.sarvam.ai/speech-to-text-realtime/ws (saaras:v4, hi-IN, mode=transcribe, keyterms)
 *   2. Text Translation: POST https://api.sarvam.ai/translate (mayura:v1, hi-IN -> kn-IN) + glossary replacement
 *   3. Text-to-Speech: POST https://api.sarvam.ai/text-to-speech (bulbul:v4-flash, kn-IN, pace=1.15)
 *
 * Never exposes SARVAM_API_KEY to the browser. Never persists audio.
 */

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const WebSocket = require('ws');

const SARVAM_REST_BASE = 'https://api.sarvam.ai';
const SARVAM_STT_WS_URL = 'wss://api.sarvam.ai/speech-to-text-realtime/ws';
const MAX_SARVAM_KEYTERMS = 50;
const MAX_KEYTERM_LEN = 64;

const glossaryPath = path.join(__dirname, 'glossary.json');
const glossaryData = JSON.parse(fs.readFileSync(glossaryPath, 'utf8'));

/**
 * Returns up to 50 distinct keyterms (<=64 chars each) for saaras:v4 STT biasing.
 */
function getSttKeyterms() {
  const seen = new Set();
  const list = [];
  for (const entry of glossaryData.terms || []) {
    for (const candidate of [entry.hi, entry.en]) {
      const clean = String(candidate || '').trim();
      if (!clean || clean.length > MAX_KEYTERM_LEN || seen.has(clean)) continue;
      seen.add(clean);
      list.push(clean);
      if (list.length >= MAX_SARVAM_KEYTERMS) return list;
    }
  }
  return list;
}

/**
 * Post-translation find-and-replace using glossary.json.
 * Checks if the source Hindi sentence contains a known Hindi/English STEM term and ensures
 * standard Kannada terminology is reinforced when an unstandardized transliteration appears.
 */
function applyGlossaryPostProcess(hindiText, kannadaText) {
  if (!kannadaText) return kannadaText;
  let output = kannadaText;
  const hiLower = String(hindiText || '').toLowerCase();

  for (const term of glossaryData.terms || []) {
    const hasHi = term.hi && String(hindiText || '').includes(term.hi);
    const hasEn = term.en && hiLower.includes(term.en.toLowerCase());
    if ((hasHi || hasEn) && term.en && term.kn) {
      // Replace stray English loanwords that slipped through translation with the Kannada term
      const escapedEn = term.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedEn}\\b`, 'gi');
      output = output.replace(regex, term.kn);
    }
  }
  return output;
}

/**
 * Generates a small valid PCM WAV tone buffer (base64) for LIVE_MOCK=1 mode
 * so Web Audio decodeAudioData() succeeds cleanly in tests and offline demos.
 */
function createMockWavBase64(durationSec = 0.7, freqHz = 440) {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataBytes = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataBytes);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20);  // PCM format
  buffer.writeUInt16LE(1, 22);  // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataBytes, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, i / 800) * Math.min(1, (numSamples - i) / 1200);
    const sample = Math.sin(2 * Math.PI * freqHz * t) * 0.12 * envelope;
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }
  return buffer.toString('base64');
}

const MOCK_SENTENCES = [
  {
    hindi: 'आज हम बल और वेग के बारे में सीखेंगे।',
    kannada: 'ಇಂದು ನಾವು ಬಲ ಮತ್ತು ವೇಗದ ಬಗ್ಗೆ ಕಲಿಯುತ್ತೇವೆ.',
    freq: 440
  },
  {
    hindi: 'जब किसी वस्तु पर बल लगता है, तो उसका त्वरण बढ़ता है।',
    kannada: 'ಯಾವುದೇ ವಸ್ತುವಿನ ಮೇಲೆ ಬಲ ಪ್ರಯೋಗವಾದಾಗ, ಅದರ ತ್ವರಿತ ಹೆಚ್ಚಾಗುತ್ತದೆ.',
    freq: 494
  },
  {
    hindi: 'प्रकाश संश्लेषण के दौरान पौधे सूर्य के प्रकाश से ऊर्जा बनाते हैं।',
    kannada: 'ದ್ಯುತಿಸಂಶ್ಲೇಷಣೆಯ ಸಮಯದಲ್ಲಿ ಸಸ್ಯಗಳು ಸೂರ್ಯನ ಬೆಳಕಿನಿಂದ ಶಕ್ತಿಯನ್ನು ತಯಾರಿಸುತ್ತವೆ.',
    freq: 523
  },
  {
    hindi: 'विद्युत धारा को एम्पीयर में मापा जाता है और प्रतिरोध को ओम में।',
    kannada: 'ವಿದ್ಯುತ್ ಪ್ರವಾಹವನ್ನು ಆಂಪಿಯರ್‌ನಲ್ಲಿ ಮತ್ತು ಪ್ರತಿರೋಧವನ್ನು ಓಮ್‌ನಲ್ಲಿ ಅಳೆಯಲಾಗುತ್ತದೆ.',
    freq: 587
  },
  {
    hindi: 'हर परमाणु के केंद्र में प्रोटॉन होते हैं और चारों ओर इलेक्ट्रॉन घूमते हैं।',
    kannada: 'ಪ್ರತಿ ಪರಮಾಣುವಿನ ಕೇಂದ್ರದಲ್ಲಿ ಪ್ರೋಟಾನ್‌ಗಳಿರುತ್ತವೆ ಮತ್ತು ಸುತ್ತಲೂ ಎಲೆಕ್ಟ್ರಾನ್‌ಗಳು ಸುತ್ತುತ್ತವೆ.',
    freq: 659
  }
];

function getSarvamApiKey() {
  return process.env.SARVAM_API_KEY || '';
}

function isMockEnabled() {
  return process.env.LIVE_MOCK === '1' || process.env.LIVE_MOCK === 'true';
}

/**
 * Translates a Hindi sentence to Kannada via Sarvam POST /translate (mayura:v1),
 * then applies STEM glossary post-processing.
 */
async function translateHindiToKannada(hindiText, options = {}) {
  const startedAt = Date.now();
  const mock = options.mock ?? isMockEnabled();

  if (mock) {
    await new Promise((r) => setTimeout(r, 45));
    const match = MOCK_SENTENCES.find((s) => s.hindi === hindiText);
    const translated = match
      ? match.kannada
      : `ಕನ್ನಡ ಅನುವಾದ: ${hindiText}`;
    return {
      kannada: applyGlossaryPostProcess(hindiText, translated),
      translateMs: Date.now() - startedAt,
      fallback: false
    };
  }

  const apiKey = getSarvamApiKey();
  if (!apiKey) {
    throw new Error('SARVAM_API_KEY is not configured');
  }

  const response = await fetch(`${SARVAM_REST_BASE}/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': apiKey
    },
    body: JSON.stringify({
      input: String(hindiText).slice(0, 1000),
      source_language_code: 'hi-IN',
      target_language_code: 'kn-IN',
      model: 'mayura:v1',
      mode: 'formal',
      numerals_format: 'international'
    })
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Sarvam translate failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawKn = data.translated_text || '';
  const processed = applyGlossaryPostProcess(hindiText, rawKn);

  return {
    kannada: processed,
    translateMs: Date.now() - startedAt,
    fallback: false
  };
}

/**
 * Synthesizes Kannada speech using Sarvam POST /text-to-speech (bulbul:v4-flash).
 * Returns base64 WAV audio + ttsMs timing.
 */
async function synthesizeKannadaSpeech(kannadaText, options = {}) {
  const startedAt = Date.now();
  const mock = options.mock ?? isMockEnabled();

  if (mock) {
    await new Promise((r) => setTimeout(r, 60));
    return {
      audioBase64: createMockWavBase64(0.65, options.mockFreq || 480),
      mimeType: 'audio/wav',
      ttsMs: Date.now() - startedAt
    };
  }

  const apiKey = getSarvamApiKey();
  if (!apiKey) {
    throw new Error('SARVAM_API_KEY is not configured');
  }

  const response = await fetch(`${SARVAM_REST_BASE}/text-to-speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': apiKey
    },
    body: JSON.stringify({
      text: String(kannadaText).slice(0, 2500),
      language_code: 'kn-IN',
      model: 'bulbul:v4-flash',
      speaker: process.env.SARVAM_TTS_SPEAKER || 'chaitra_kn_conversation',
      pace: 1.15,
      speech_sample_rate: 22050,
      output_audio_codec: 'wav',
      temperature: 0.5
    })
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Sarvam TTS failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const audioBase64 = Array.isArray(data.audios) ? data.audios[0] : null;
  if (!audioBase64) {
    throw new Error('Sarvam TTS returned empty audios array');
  }

  return {
    audioBase64,
    mimeType: 'audio/wav',
    ttsMs: Date.now() - startedAt
  };
}

/**
 * Runs translate + TTS with resilience guarantees for a finished Hindi sentence:
 * - If translation fails: falls back to Hindi text with a note, skips TTS.
 * - If TTS fails: returns captions-only payload (audio: null) so captions keep flowing.
 */
async function processFinishedSentence({ seq, hindi, sttMs = 0, mock = isMockEnabled(), mockFreq }) {
  const totalStart = Date.now();
  let kannada = '';
  let translateMs = 0;
  let ttsMs = 0;
  let audioBase64 = null;
  let mimeType = 'audio/wav';
  let note = null;

  try {
    const tr = await translateHindiToKannada(hindi, { mock });
    kannada = tr.kannada;
    translateMs = tr.translateMs;
  } catch (err) {
    translateMs = Date.now() - totalStart;
    kannada = `${hindi} (Translation unavailable — showing Hindi)`;
    note = 'translation_failed';
  }

  if (!note && kannada) {
    try {
      const tts = await synthesizeKannadaSpeech(kannada, { mock, mockFreq });
      audioBase64 = tts.audioBase64;
      mimeType = tts.mimeType;
      ttsMs = tts.ttsMs;
    } catch (err) {
      ttsMs = Date.now() - totalStart - translateMs;
      note = 'captions_only_tts_failed';
    }
  }

  const totalMs = sttMs + translateMs + ttsMs;

  return {
    seq,
    hindi,
    kannada,
    audio: audioBase64,
    mimeType,
    note,
    timings: {
      sttMs,
      translateMs,
      ttsMs,
      totalMs
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Streaming Hindi STT session wrapping Sarvam Realtime WebSocket (/speech-to-text-realtime/ws).
 * In mock mode, emits canned segments when audio arrives or on demand.
 */
class SarvamRealtimeSttSession extends EventEmitter {
  constructor({ mock = isMockEnabled() } = {}) {
    super();
    this.mock = mock;
    this.ws = null;
    this.connected = false;
    this.closed = false;
    this.lastSpeechStartAt = null;
    this.lastAudioReceivedAt = null;
    this.pingTimer = null;
    this.mockTimer = null;
    this.mockIndex = 0;
    this.mockChunkCount = 0;
  }

  async connect() {
    if (this.mock) {
      this.connected = true;
      this.emit('ready', { mode: 'mock' });
      return;
    }

    const apiKey = getSarvamApiKey();
    if (!apiKey) {
      throw new Error('SARVAM_API_KEY is missing in environment');
    }

    const params = new URLSearchParams({
      language_code: 'hi-IN',
      model: 'saaras:v4',
      mode: 'transcribe',
      stream_type: 'fast',
      endpointing: 'vad',
      encoding: 'linear16',
      sample_rate: '16000',
      threshold: '0.2',
      silence_duration_ms: '350',
      min_speech_duration_ms: '200',
      keyterms: JSON.stringify(getSttKeyterms())
    });

    const url = `${SARVAM_STT_WS_URL}?${params.toString()}`;

    await new Promise((resolve, reject) => {
      const ws = new WebSocket(url, {
        headers: {
          'api-subscription-key': apiKey
        }
      });
      this.ws = ws;

      const timeout = setTimeout(() => {
        if (!this.connected) {
          ws.terminate();
          reject(new Error('Sarvam STT WebSocket connection timed out'));
        }
      }, 10000);

      ws.on('open', () => {
        clearTimeout(timeout);
        this.connected = true;
        this.pingTimer = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ event: 'ping' }));
          }
        }, 15000);
        this.emit('ready', { mode: 'live' });
        resolve();
      });

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.event === 'vad.speech_start') {
            this.lastSpeechStartAt = Date.now();
          } else if (msg.event === 'vad.speech_end') {
            this.lastAudioReceivedAt = Date.now();
          } else if (msg.event === 'transcript.partial') {
            this.emit('partial', { text: msg.text || '' });
          } else if (msg.event === 'transcript.final') {
            const text = (msg.text || '').trim();
            if (text) {
              const refTime = this.lastAudioReceivedAt || this.lastSpeechStartAt || Date.now();
              const sttMs = Math.max(40, Date.now() - refTime);
              this.lastSpeechStartAt = null;
              this.lastAudioReceivedAt = null;
              this.emit('final', { text, sttMs });
            }
          } else if (msg.event === 'error') {
            this.emit('error', new Error(`Sarvam STT error (${msg.code}): ${msg.message}`));
          }
        } catch (err) {
          this.emit('error', err);
        }
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        if (!this.connected) reject(err);
        else this.emit('error', err);
      });

      ws.on('close', (code, reason) => {
        clearTimeout(timeout);
        if (this.pingTimer) clearInterval(this.pingTimer);
        this.connected = false;
        this.emit('close', { code, reason: reason?.toString() || '' });
      });
    });
  }

  sendPcmChunk(pcmBuffer) {
    if (this.closed) return;
    if (this.mock) {
      this.mockChunkCount += 1;
      // Every ~25 chunks (~3.5s of 16kHz 128ms chunks) emit a canned sentence if no timer running
      if (this.mockChunkCount % 25 === 1 && !this.mockTimer) {
        const sample = MOCK_SENTENCES[this.mockIndex % MOCK_SENTENCES.length];
        this.mockIndex += 1;
        this.emit('partial', { text: sample.hindi.slice(0, Math.ceil(sample.hindi.length / 2)) });
        this.mockTimer = setTimeout(() => {
          this.mockTimer = null;
          if (!this.closed) {
            this.emit('final', { text: sample.hindi, sttMs: 180, mockFreq: sample.freq });
          }
        }, 550);
      }
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.lastAudioReceivedAt = Date.now();
      this.ws.send(JSON.stringify({
        event: 'audio_input',
        audio: Buffer.from(pcmBuffer).toString('base64')
      }));
    }
  }

  flush() {
    if (this.mock) {
      const sample = MOCK_SENTENCES[this.mockIndex % MOCK_SENTENCES.length];
      this.mockIndex += 1;
      this.emit('final', { text: sample.hindi, sttMs: 165, mockFreq: sample.freq });
      return;
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Send ~400ms of silence so VAD immediately closes any active utterance
      const silenceB64 = Buffer.alloc(16000 * 2 * 0.4).toString('base64');
      this.ws.send(JSON.stringify({ event: 'audio_input', audio: silenceB64 }));
      this.ws.send(JSON.stringify({ event: 'flush' }));
    }
  }

  end() {
    this.closed = true;
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.mockTimer) {
      clearTimeout(this.mockTimer);
      this.mockTimer = null;
    }
    if (this.mock) {
      this.connected = false;
      this.emit('close', { code: 1000, reason: 'mock_ended' });
      return;
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ event: 'end' }));
      } catch (_) {}
      setTimeout(() => {
        if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
          this.ws.close(1000);
        }
      }, 300);
    }
  }
}

module.exports = {
  glossaryData,
  getSttKeyterms,
  applyGlossaryPostProcess,
  translateHindiToKannada,
  synthesizeKannadaSpeech,
  processFinishedSentence,
  SarvamRealtimeSttSession,
  MOCK_SENTENCES,
  isMockEnabled,
  getSarvamApiKey
};
