#!/usr/bin/env node
/**
 * generate-landing-images.cjs
 * Run: node scripts/generate-landing-images.cjs
 *
 * Generates 5 atmospheric textures for the MindsetOS landing page via
 * OpenRouter (FLUX Schnell). Skips files that already exist (idempotent).
 *
 * Requirements:
 *   OPENROUTER_API_KEY — required env var
 *
 * Output: public/generated/{filename}.png
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'generated');
const API_KEY = process.env.OPENROUTER_API_KEY;

if (!API_KEY) {
  console.error('Error: OPENROUTER_API_KEY env var is required');
  process.exit(1);
}

/** @type {Array<{ filename: string, prompt: string }>} */
const IMAGES = [
  {
    filename: 'hero-texture.png',
    prompt:
      'Abstract dark atmospheric nebula, near-black background #09090f, subtle blue-violet radial light diffusion, photographic grain overlay, no text, no faces, no people, cinematic sci-fi aesthetic, high resolution'
  },
  {
    filename: 'architecture-divider.png',
    prompt:
      'Horizontal dark material texture band, deep indigo tones, crystalline grain, seamless dark pattern, no text, no faces, minimal abstract'
  },
  {
    filename: 'agents-ambient.png',
    prompt:
      'Deep-space particle field, dark violet-black background, abstract light clusters and dots, no text, no faces, CSS sprite source texture, wide aspect'
  },
  {
    filename: 'proof-texture.png',
    prompt:
      'Dark crystalline surface, near-black with subtle blue refraction, minimal grain, luxury material texture, no text, no faces'
  },
  {
    filename: 'cta-atmosphere.png',
    prompt:
      'Deep violet nebula with soft amber-gold edge glow, cinematic dark background, no text, no faces, no people, atmospheric'
  }
];

/**
 * Generate image via OpenRouter chat completions (Gemini Flash image).
 * Returns a Buffer of the PNG image data.
 * @param {string} prompt
 * @returns {Promise<Buffer>}
 */
function generateImage(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'google/gemini-2.5-flash-image',
      messages: [{ role: 'user', content: prompt }]
    });

    const options = {
      hostname: 'openrouter.ai',
      port: 443,
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'HTTP-Referer': 'https://mindset.show',
        'X-Title': 'MindsetOS'
      }
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => { chunks.push(chunk); });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(Buffer.concat(chunks).toString());
          // Image comes back as base64 in message.images[0].image_url.url
          const dataUrl = parsed?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (!dataUrl) {
            reject(new Error(`No image in response: ${JSON.stringify(parsed).slice(0, 300)}`));
            return;
          }
          // Strip "data:image/png;base64," prefix and decode
          const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
          resolve(Buffer.from(base64, 'base64'));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const { filename, prompt } of IMAGES) {
    const filepath = path.join(OUTPUT_DIR, filename);

    if (fs.existsSync(filepath)) {
      console.log(`  skipped  ${filename} (already exists)`);
      skipped++;
      continue;
    }

    process.stdout.write(`  generating  ${filename} ... `);
    try {
      const imageBuffer = await generateImage(prompt);
      fs.writeFileSync(filepath, imageBuffer);
      console.log(`saved (${Math.round(imageBuffer.length / 1024)}KB)`);
      generated++;
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      // Remove partial file if it exists
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      failed++;
    }
  }

  console.log(`\nDone. generated=${generated} skipped=${skipped} failed=${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
