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
 * POST to OpenRouter image generation endpoint.
 * Returns the URL string of the generated image.
 * @param {string} prompt
 * @returns {Promise<string>}
 */
function generateImage(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'black-forest-labs/flux-schnell',
      prompt,
      n: 1,
      size: '1024x1024'
    });

    const options = {
      hostname: 'openrouter.ai',
      port: 443,
      path: '/api/v1/images/generations',
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
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const imageUrl = parsed?.data?.[0]?.url;
          if (imageUrl) {
            resolve(imageUrl);
          } else {
            reject(new Error(`No image URL in response: ${data}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Download an image from a URL and save it to filepath.
 * Handles one level of HTTP redirect (301/302).
 * @param {string} imageUrl
 * @param {string} filepath
 * @returns {Promise<void>}
 */
function downloadImage(imageUrl, filepath) {
  return new Promise((resolve, reject) => {
    function doGet(targetUrl, redirectCount) {
      if (redirectCount > 5) {
        return reject(new Error('Too many redirects'));
      }

      https.get(targetUrl, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          // Consume and discard this response so the socket closes
          res.resume();
          const location = res.headers.location;
          if (!location) {
            return reject(new Error('Redirect with no Location header'));
          }
          doGet(location, redirectCount + 1);
          return;
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} downloading image`));
        }

        const file = fs.createWriteStream(filepath);
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
        file.on('error', (err) => {
          fs.unlink(filepath, () => {}); // clean up partial file
          reject(err);
        });
      }).on('error', reject);
    }

    doGet(imageUrl, 0);
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
      const imageUrl = await generateImage(prompt);
      await downloadImage(imageUrl, filepath);
      console.log('saved');
      generated++;
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
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
