#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// check-api-base.mjs
//
// Guards the frontend build against its quietest failure mode: Astro inlines
// PUBLIC_API_BASE_URL at build time. If it is missing, the build still exits 0
// but SSR pages fetch a relative /api URL (which throws in the Workers
// runtime), client cart calls hit a 404, and the storefront ships with zero
// products. This happened in production once — never again.
//
// Usage:
//   node scripts/check-api-base.mjs             # 1) the env var must be set
//   node scripts/check-api-base.mjs --artifact  # 2) + the built bundle under
//                                               #    apps/web/dist must actually
//                                               #    contain the URL (proves the
//                                               #    build inlined it)
//
// Exit codes: 0 = ok, 1 = missing/malformed var, or URL absent from the bundle.
// The pure checks are exported so tests can run them without any environment.
// ─────────────────────────────────────────────────────────────────────────────
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'apps', 'web', 'dist');

export const VAR_NAME = 'PUBLIC_API_BASE_URL';

// ── Pure checks (no I/O) — exported for tests ────────────────────────────────
export function validateApiBase(value) {
  if (!value || !value.trim()) {
    return {
      ok: false,
      message:
        `${VAR_NAME} is not set. The build would still "succeed", but the deployed ` +
        `site would render zero products (SSR fetch of a relative /api URL throws).`,
    };
  }
  const trimmed = value.trim();
  let url;
  try {
    url = new globalThis.URL(trimmed); // globalThis form: ESLint no-undef doesn't know URL globals in .mjs
  } catch {
    return { ok: false, message: `${VAR_NAME}="${trimmed}" is not a valid absolute URL.` };
  }
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !isLocal) {
    return { ok: false, message: `${VAR_NAME} must be an https:// URL (or localhost), got "${trimmed}".` };
  }
  if (url.pathname !== '/' && url.pathname !== '') {
    return {
      ok: false,
      message: `${VAR_NAME} must be a bare origin — API routes already start with /api/*, got "${trimmed}".`,
    };
  }
  return { ok: true, message: `${VAR_NAME} = ${trimmed}` };
}

function collectJsFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (statSync(p).isDirectory()) collectJsFiles(p, out);
    else if (/\.(js|mjs)$/.test(entry)) out.push(p);
  }
  return out;
}

export function bundleContainsApiBase(distDir, apiBase) {
  if (!existsSync(distDir)) return false;
  for (const file of collectJsFiles(distDir)) {
    try {
      if (readFileSync(file, 'utf8').includes(apiBase)) return true;
    } catch {
      // unreadable/binary file — skip
    }
  }
  return false;
}

// ── Main ─────────────────────────────────────────────────────────────────────
function fail(msg) {
  console.error(`✘ ${msg}`);
  if (process.env.GITHUB_ACTIONS === 'true') {
    console.log(
      `::error::${msg} Fix: run  gh variable set ${VAR_NAME} --body "https://puresip-api.<your-subdomain>.workers.dev"  then re-run the deploy.`,
    );
  }
  process.exit(1);
}

async function main() {
  const checkArtifact = process.argv.slice(2).includes('--artifact');
  const value = process.env[VAR_NAME];

  const check = validateApiBase(value);
  if (!check.ok) fail(check.message);
  console.log(`✓ ${check.message}`);

  if (checkArtifact) {
    const apiBase = value.trim();
    if (!existsSync(DIST)) fail(`Build output not found at ${DIST} — run the frontend build first.`);
    if (!bundleContainsApiBase(DIST, apiBase)) {
      fail(
        `The built bundle in apps/web/dist does not contain "${apiBase}" — ` +
          `${VAR_NAME} was not inlined into the build. Do not deploy this output.`,
      );
    }
    console.log(`✓ Built bundle inlines ${VAR_NAME}`);
  }
}

// Only run when executed directly (not when imported by tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
