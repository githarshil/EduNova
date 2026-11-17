/**
 * CLI script to test the Hindi Audio -> Sarvam STT -> Translate (kn-IN) -> Bulbul TTS chain
 * and print real stage timings.
 *
 * Usage:
 *   node backend/scripts/live-pipeline-test.js [path/to/hindi_16khz_mono.wav|.pcm] [--mock]
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const {
  SarvamRealtimeSttSession,
  processFinishedSentence,
  getSarvamApiKey,
  isMockEnabled
} = require('../src/live/sarvamPipeline');

function stripWavHeaderIfPresent(buf) {
  if (buf.length > 44 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WAVE') {
    const dataIdx = buf.indexOf(Buffer.from('data'));
    if (dataIdx !== -1 && dataIdx + 8 <= buf.length) {
      const dataLen = buf.readUInt32LE(dataIdx + 4);
      return buf.subarray(dataIdx + 8, dataIdx + 8 + dataLen);
    }
    return buf.subarray(44);
  }
  return buf;
}

async function main() {
  const args = process.argv.slice(2);
  const forceMock = args.includes('--mock') || isMockEnabled();
  const fileArg = args.find((a) => !a.startsWith('--'));

  if (!forceMock && !getSarvamApiKey()) {
    console.error('❌ SARVAM_API_KEY not found in backend/.env. Pass --mock or set LIVE_MOCK=1 or add SARVAM_API_KEY.');
    process.exit(1);
  }

  let pcmBuffer;
  if (fileArg) {
    const resolved = path.resolve(process.cwd(), fileArg);
    if (!fs.existsSync(resolved)) {
      console.error(`❌ Audio file not found: ${resolved}`);
      process.exit(1);
    }
    pcmBuffer = stripWavHeaderIfPresent(fs.readFileSync(resolved));
    console.log(`🎵 Loaded ${pcmBuffer.length} bytes of 16kHz PCM from ${resolved}`);
  } else if (forceMock) {
    // 1.5 seconds of silent 16kHz mono PCM for mock verification
    pcmBuffer = Buffer.alloc(16000 * 2 * 1.5);
    console.log('🧪 Running in mock mode (LIVE_MOCK=1 / --mock)');
  } else {
    console.error('❌ Please provide a 16kHz mono WAV/PCM Hindi audio file path.');
    process.exit(1);
  }

  const stt = new SarvamRealtimeSttSession({ mock: forceMock });
  const results = [];
  let seq = 0;

  const donePromise = new Promise((resolve, reject) => {
    let pending = 0;
    let sttClosed = false;

    const maybeFinish = () => {
      if (sttClosed && pending === 0) resolve();
    };

    stt.on('partial', ({ text }) => {
      if (text) process.stdout.write(`\r[partial] ${text.slice(0, 72)}   `);
    });

    stt.on('final', async ({ text, sttMs, mockFreq }) => {
      pending += 1;
      seq += 1;
      const currentSeq = seq;
      console.log(`\n\n✅ [STT final #${currentSeq}] (${sttMs} ms): ${text}`);
      try {
        const event = await processFinishedSentence({
          seq: currentSeq,
          hindi: text,
          sttMs,
          mock: forceMock,
          mockFreq
        });
        results.push(event);
        console.log(`📝 [Kannada #${currentSeq}] (${event.timings.translateMs} ms): ${event.kannada}`);
        console.log(
          `🔊 [TTS #${currentSeq}] (${event.timings.ttsMs} ms): ${
            event.audio ? `${Math.round((event.audio.length * 3) / 4)} bytes WAV` : `none (${event.note})`
          }`
        );
        console.log(`⏱️  [Total #${currentSeq}]: ${event.timings.totalMs} ms`);
      } catch (err) {
        console.error('Pipeline error:', err);
      } finally {
        pending -= 1;
        maybeFinish();
      }
    });

    stt.on('error', (err) => {
      console.error('\n❌ STT error:', err.message);
    });

    stt.on('close', () => {
      sttClosed = true;
      maybeFinish();
    });

    setTimeout(() => {
      sttClosed = true;
      maybeFinish();
    }, 15000);
  });

  await stt.connect();
  console.log(`🔌 Connected to ${forceMock ? 'Mock STT' : 'Sarvam Realtime STT (saaras:v4)'}`);

  // Stream in 160ms chunks (5120 bytes at 16kHz 16-bit mono)
  const chunkSize = 5120;
  for (let offset = 0; offset < pcmBuffer.length; offset += chunkSize) {
    stt.sendPcmChunk(pcmBuffer.subarray(offset, offset + chunkSize));
    await new Promise((r) => setTimeout(r, forceMock ? 15 : 160));
  }

  // Send trailing silence so VAD closes the utterance cleanly
  const silence = Buffer.alloc(16000 * 2 * 0.8);
  for (let offset = 0; offset < silence.length; offset += chunkSize) {
    stt.sendPcmChunk(silence.subarray(offset, offset + chunkSize));
    await new Promise((r) => setTimeout(r, forceMock ? 10 : 120));
  }

  if (forceMock) {
    // Wait for the mock utterance timer (~600ms) and flush a second sentence to verify multi-segment timings
    await new Promise((r) => setTimeout(r, 700));
    stt.flush();
    await new Promise((r) => setTimeout(r, 250));
  } else {
    await new Promise((r) => setTimeout(r, 1200));
  }
  stt.end();

  await donePromise;

  console.log('\n=== Pipeline Summary ===');
  console.table(
    results.map((r) => ({
      seq: r.seq,
      stt_ms: r.timings.sttMs,
      translate_ms: r.timings.translateMs,
      tts_ms: r.timings.ttsMs,
      total_ms: r.timings.totalMs,
      note: r.note || 'ok'
    }))
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
