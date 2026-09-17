#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// check-api-base.mjs
//
// Guards the frontend build against a missing API_WORKER_URL. This SSR-only
// env var tells server-side pages where to fetch product data from the API
// Worker. Without it, SSR pages silently fetch a relative /api URL (which
// throws in the Workers runtime), and the storefront ships with zero products.
//
// Usage:
//   node scripts/check-api-base.mjs   # the env var must be set and valid
//
// Exit codes: 0 = ok, 1 = missing/malformed var.
// The pure check is exported so tests can run it without any environment.
// ─────────────────────────────────────────────────────────────────────────────
import { pathToFileURL } from 'node:url';

export const VAR_NAME = 'API_WORKER_URL';

// ── Pure check (no I/O) — exported for tests ─────────────────────────────────
export function validateApiBase(value) {
  if (!value || !value.trim()) {
    return {
      ok: false,
      message:
        `${VAR_NAME} is not set. The build would still "succeed", but SSR pages ` +
        `would fail to fetch product data (relative /api URLs throw in Workers).`,
    };
  }
  const trimmed = value.trim();
  let url;
  try {
    // globalThis form: ESLint no-undef doesn't know URL globals in .mjs
    url = new globalThis.URL(trimmed);
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
  const value = process.env[VAR_NAME];
  const check = validateApiBase(value);
  if (!check.ok) fail(check.message);
  console.log(`✓ ${check.message}`);
}

// Only run when executed directly (not when imported by tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
