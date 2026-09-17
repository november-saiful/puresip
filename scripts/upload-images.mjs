#!/usr/bin/env node
/**
 * Uploads generated product images to the R2 bucket via `wrangler r2 object put`.
 * Run `npm run images:generate` first. Requires wrangler auth (CLOUDFLARE_API_TOKEN).
 */
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IMAGES = join(ROOT, 'apps/web/public/images');

const files = readdirSync(IMAGES).filter((f) => f.endsWith('.svg'));
console.log(`Uploading ${files.length} images to R2 bucket puresip-images…`);

for (const file of files) {
  const key = `images/${file}`;
  execFileSync('npx', ['wrangler', 'r2', 'object', 'put', `puresip-images/${key}`, `--file`, join(IMAGES, file), '--remote'], {
    stdio: 'inherit',
  });
}
console.log('Done. Set PUBLIC_IMAGES_BASE_URL to the bucket public URL to serve from R2.');
