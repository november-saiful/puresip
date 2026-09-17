#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// fill-wrangler-ids.mjs
//
// Discovers (and optionally creates) the Cloudflare resources used by this
// project, then rewrites the placeholder IDs in wrangler.toml — both the
// top-level bindings and the [env.production] section.
//
// Usage:
//   node scripts/fill-wrangler-ids.mjs [--create] [--dry-run]
//
//   --create    Create any missing resources (D1 db, KV namespace, R2 bucket).
//               Without it, the script only looks up what already exists.
//   --dry-run   Print what would happen WITHOUT creating or writing anything.
//
// Authentication: uses CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID env vars
// (or your local wrangler OAuth login, same as wrangler itself).
//
// Only wrangler is shelled out to; all other work is plain Node so the
// rewriting logic can be tested without any Cloudflare credentials.
// ─────────────────────────────────────────────────────────────────────────────
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// FILL_IDS_CONFIG overrides the config path (used by tests); defaults to <root>/wrangler.toml.
const CONFIG = process.env.FILL_IDS_CONFIG
  ? path.resolve(process.env.FILL_IDS_CONFIG)
  : path.join(ROOT, 'wrangler.toml');

const D1_NAME = 'puresip-db';
const KV_BINDING = 'CART_KV';
const R2_NAME = 'puresip-images';

const args = new Set(process.argv.slice(2));
const DO_CREATE = args.has('--create');
const DRY_RUN = args.has('--dry-run');

const WRANGLER_BIN = path.join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js');

function wrangler(cmd, args) {
  // Spawn wrangler's JS entry point via node: works identically on Windows and
  // Linux (npx is a .cmd shim that spawnSync cannot launch on Windows), avoids
  // any shell, and pins the run to the lockfile's wrangler version.
  return execFileSync(process.execPath, [WRANGLER_BIN, cmd, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, CI: 'true' },
  });
}

function parseJsonArray(raw, what) {
  // Take the chunk starting at the first '[' in case banners ever precede the JSON.
  const start = raw.indexOf('[');
  if (start === -1) {
    throw new Error(`Could not find JSON array in ${what} output:\n${raw}`);
  }
  return JSON.parse(raw.slice(start));
}

function fail(msg) {
  console.error(`✘ ${msg}`);
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => globalThis.setTimeout(r, ms));

// ── Pure rewrite logic (no I/O, no Cloudflare) — exported for tests ─────────
const D1_PLACEHOLDER = '00000000-0000-0000-0000-000000000000';
const KV_PLACEHOLDER = '00000000000000000000000000000000';

export function needsFilling(toml) {
  return toml.includes(D1_PLACEHOLDER) || toml.includes(KV_PLACEHOLDER);
}

export function fillIds(toml, { d1, kv }) {
  return toml
    .replaceAll(D1_PLACEHOLDER, d1)
    .replaceAll(KV_PLACEHOLDER, kv)
    .replace(/# ← replace[^\n]*/g, '# filled automatically by scripts/fill-wrangler-ids.mjs');
}

// ── Discovery helpers ────────────────────────────────────────────────────────
// Cloudflare's list endpoints are eventually consistent: right after a create
// succeeds, the resource may not appear in a list for a few seconds. Retry.

async function findD1() {
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const list = parseJsonArray(wrangler('d1', ['list', '--json']), 'd1 list');
    last = list.find((x) => x.name === D1_NAME);
    if (last?.uuid) return last;
    if (attempt < 3) await sleep(attempt * 2000);
  }
  return last; // undefined or an entry without a uuid
}

async function findKV() {
  // KV namespace titles are usually the binding name alone (e.g. "CART_KV"),
  // but may carry a worker prefix ("puresip-api-CART_KV") depending on how the
  // namespace was created. Accept both.
  const match = (list) =>
    list.find((x) => x.title === KV_BINDING) ||
    list.find((x) => x.title.endsWith(`-${KV_BINDING}`));
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const list = parseJsonArray(wrangler('kv', ['namespace', 'list']), 'kv namespace list');
    last = match(list);
    if (last?.id) return last;
    if (attempt < 3) await sleep(attempt * 2000);
  }
  return last;
}

async function findR2() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const raw = wrangler('r2', ['bucket', 'list']);
    if (raw.includes(R2_NAME)) return R2_NAME;
    if (attempt < 3) await sleep(attempt * 2000);
  }
  return undefined;
}

// Create, tolerating "already exists" races (e.g. two CI runs at once).
function createOrIgnore(kind, createArgs) {
  try {
    wrangler(...createArgs);
    return true;
  } catch (e) {
    const text = String(e.stdout ?? '') + String(e.stderr ?? '') + String(e.message ?? '');
    if (/already exists/i.test(text) || /10014/.test(text)) {
      console.log(`  ${kind} already exists (created concurrently) — continuing`);
      return false;
    }
    throw e;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!existsSync(WRANGLER_BIN)) {
    fail(`wrangler not found at ${WRANGLER_BIN} — run "npm install" first.`);
  }
  console.log(`Looking up Cloudflare resources (create=${DO_CREATE}, dry-run=${DRY_RUN})…`);

  // Bail out before any API traffic if the config is already filled.
  if (!needsFilling(readFileSync(CONFIG, 'utf8'))) {
    console.log('wrangler.toml already contains real IDs — nothing to do.');
    process.exit(0);
  }

  // D1 -----------------------------------------------------------------------
  let db = await findD1();
  if (!db?.uuid) {
    if (DRY_RUN) {
      console.log(`[dry-run] would create D1 database '${D1_NAME}'`);
    } else if (DO_CREATE) {
      console.log(`Creating D1 database '${D1_NAME}'…`);
      createOrIgnore('D1 database', ['d1', ['create', D1_NAME]]);
      db = await findD1();
    }
  }
  if (!db?.uuid) fail(`D1 database '${D1_NAME}' not found. Re-run with --create.`);

  // KV -----------------------------------------------------------------------
  let ns = await findKV();
  if (!ns?.id) {
    if (DRY_RUN) {
      console.log(`[dry-run] would create KV namespace '${KV_BINDING}'`);
    } else if (DO_CREATE) {
      console.log(`Creating KV namespace '${KV_BINDING}'…`);
      createOrIgnore('KV namespace', ['kv', ['namespace', 'create', KV_BINDING]]);
      ns = await findKV();
    }
  }
  if (!ns?.id) fail(`KV namespace '${KV_BINDING}' not found. Re-run with --create.`);

  // R2 — identified by name alone; there is no separate ID to fill in.
  let r2 = await findR2();
  if (!r2) {
    if (DRY_RUN) {
      console.log(`[dry-run] would create R2 bucket '${R2_NAME}'`);
    } else if (DO_CREATE) {
      console.log(`Creating R2 bucket '${R2_NAME}'…`);
      createOrIgnore('R2 bucket', ['r2', ['bucket', 'create', R2_NAME]]);
      r2 = await findR2();
    }
  }
  if (!r2) fail(`R2 bucket '${R2_NAME}' not found. Re-run with --create.`);

  const ids = { d1: db.uuid, kv: ns.id, r2: R2_NAME };
  console.log(`Discovered:\n  D1 ${D1_NAME}: ${ids.d1}\n  KV ${KV_BINDING}: ${ids.kv}\n  R2 ${R2_NAME}: (name only, no ID)`);

  // ── Rewrite wrangler.toml ──────────────────────────────────────────────────
  const updated = fillIds(readFileSync(CONFIG, 'utf8'), ids);

  if (DRY_RUN) {
    console.log('\n-- dry run: would write the following IDs into wrangler.toml --');
    for (const line of updated.split('\n')) {
      if (line.includes(ids.d1) || line.includes(ids.kv)) console.log('  ' + line.trim());
    }
    process.exit(0);
  }

  writeFileSync(CONFIG, updated, 'utf8');
  console.log('✅ wrangler.toml updated — top-level and [env.production] sections filled.');

  // Sanity check: no placeholders left behind.
  if (needsFilling(readFileSync(CONFIG, 'utf8'))) {
    fail('Some placeholder IDs remain in wrangler.toml — please inspect it manually.');
  }
  console.log(`\nNext: commit the change ("git add wrangler.toml && git commit && git push").`);
}

// Only run when executed directly (not when imported by tests).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
