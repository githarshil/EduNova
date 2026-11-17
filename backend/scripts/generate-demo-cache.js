/**
 * Generates pre-recorded offline demo assets under frontend/public/demo/
 * by running the 6 sentences from backend/src/live/demoScript.js through
 * Sarvam Text Translation (mayura:v1) + Bulbul TTS (bulbul:v4-flash) once.
 *
 * Usage:
 *   node backend/scripts/generate-demo-cache.js [--mock]
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { DEMO_SENTENCES } = require('../src/live/demoScript');
const {
  processFinishedSentence,
  getSarvamApiKey,
  isMockEnabled
} = require('../src/live/sarvamPipeline');

async function main() {
  const forceMock = process.argv.includes('--mock') || isMockEnabled();
  if (!forceMock && !getSarvamApiKey()) {
    console.error('❌ SARVAM_API_KEY is not set in backend/.env. Add it or pass --mock.');
    process.exit(1);
  }

  const outDir = path.resolve(__dirname, '..', '..', 'frontend', 'public', 'demo');
  fs.mkdirSync(outDir, { recursive: true });

  const manifestItems = [];

  for (const item of DEMO_SENTENCES) {
    console.log(`\n⏳ Processing sentence ${item.id}/${DEMO_SENTENCES.length}...`);
    const result = await processFinishedSentence({
      seq: item.id,
      hindi: item.hindi,
      sttMs: 0,
      mock: forceMock
    });

    const audioFile = `sentence-${item.id}.wav`;
    if (result.audio) {
      fs.writeFileSync(path.join(outDir, audioFile), Buffer.from(result.audio, 'base64'));
    }

    manifestItems.push({
      seq: item.id,
      hindi: result.hindi,
      kannada: result.kannada,
      needsReview: true,
      audioUrl: result.audio ? `/demo/${audioFile}` : null,
      timings: result.timings,
      source: forceMock ? 'mock-cached' : 'sarvam-cached'
    });

    console.log(`✅ #${item.id}: ${result.kannada} (${result.timings.totalMs} ms)`);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: forceMock ? 'mock-cached' : 'sarvam-cached',
    note: 'Pre-recorded offline sample sentences. Every Kannada translation is marked needsReview: true.',
    items: manifestItems
  };

  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n🎉 Saved offline demo cache to ${outDir}`);
}

main().catch((err) => {
  console.error('❌ Failed to generate demo cache:', err);
  process.exit(1);
});
