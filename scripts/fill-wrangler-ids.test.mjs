// Tests for scripts/fill-wrangler-ids.mjs — pure rewrite logic only (no network).
import { describe, it, expect } from 'vitest';
import { fillIds, needsFilling } from './fill-wrangler-ids.mjs';

const D1_PLACEHOLDER = '00000000-0000-0000-0000-000000000000';
const KV_PLACEHOLDER = '00000000000000000000000000000000';
const D1_REAL = '84d8ad3f-84f8-41c5-9d16-8c35a01fd270';
const KV_REAL = 'abc123def4567890abc123def4567890';

const SAMPLE = `name = "puresip-api"

[[d1_databases]]
binding = "DB"
database_id = "${D1_PLACEHOLDER}" # ← replace with real D1 id

[[kv_namespaces]]
binding = "CART_KV"
id = "${KV_PLACEHOLDER}" # ← replace with real KV namespace id

[[env.production.d1_databases]]
binding = "DB"
database_id = "${D1_PLACEHOLDER}" # ← replace

[[env.production.kv_namespaces]]
binding = "CART_KV"
id = "${KV_PLACEHOLDER}" # ← replace
`;

describe('needsFilling', () => {
  it('detects placeholder IDs', () => {
    expect(needsFilling(SAMPLE)).toBe(true);
  });

  it('reports a filled config as done', () => {
    expect(needsFilling(fillIds(SAMPLE, { d1: D1_REAL, kv: KV_REAL }))).toBe(false);
  });

  it('is false for a config that never had placeholders', () => {
    expect(needsFilling('name = "x"\n')).toBe(false);
  });
});

describe('fillIds', () => {
  const filled = fillIds(SAMPLE, { d1: D1_REAL, kv: KV_REAL });

  it('replaces every D1 placeholder (both sections)', () => {
    expect(filled.match(new RegExp(D1_PLACEHOLDER, 'g'))).toBeNull();
    expect(filled.match(new RegExp(D1_REAL, 'g'))).toHaveLength(2);
  });

  it('replaces every KV placeholder (both sections)', () => {
    expect(filled.match(new RegExp(KV_PLACEHOLDER, 'g'))).toBeNull();
    expect(filled.match(new RegExp(KV_REAL, 'g'))).toHaveLength(2);
  });

  it('does not cross-contaminate D1 and KV values', () => {
    // D1 placeholders were 36 chars, KV 32 — values must land in the right slots.
    const d1Lines = filled.split('\n').filter((l) => l.includes('database_id'));
    const kvLines = filled.split('\n').filter((l) => /^id = /.test(l.trim()));
    expect(d1Lines.every((l) => l.includes(D1_REAL))).toBe(true);
    expect(kvLines.every((l) => l.includes(KV_REAL))).toBe(true);
  });

  it('rewrites the "replace" helper comments', () => {
    expect(filled).not.toContain('← replace');
    expect(filled.match(/# filled automatically by scripts\/fill-wrangler-ids\.mjs/g)).toHaveLength(4);
  });

  it('leaves unrelated content untouched', () => {
    expect(filled).toContain('name = "puresip-api"');
    expect(filled).toContain('binding = "DB"');
    expect(filled).toContain('[[env.production.d1_databases]]');
  });

  it('is idempotent — filling a filled config changes nothing', () => {
    expect(fillIds(filled, { d1: D1_REAL, kv: KV_REAL })).toBe(filled);
  });
});
