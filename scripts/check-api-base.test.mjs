// Tests for scripts/check-api-base.mjs — pure check only (no filesystem, no build).
import { describe, it, expect } from 'vitest';
import { validateApiBase, VAR_NAME } from './check-api-base.mjs';

describe('validateApiBase', () => {
  it('rejects an unset variable', () => {
    const r = validateApiBase(undefined);
    expect(r.ok).toBe(false);
    expect(r.message).toContain(VAR_NAME);
  });

  it('rejects an empty or whitespace-only value', () => {
    expect(validateApiBase('').ok).toBe(false);
    expect(validateApiBase('   ').ok).toBe(false);
  });

  it('rejects non-URLs', () => {
    for (const bad of ['not-a-url', 'puresip-api.workers.dev', 'ftp://x', '://nope']) {
      expect(validateApiBase(bad).ok, `"${bad}" should be rejected`).toBe(false);
    }
  });

  it('rejects plain http on a public host', () => {
    const r = validateApiBase('http://puresip-api.example.workers.dev');
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/https/);
  });

  it('allows localhost http for dev builds', () => {
    expect(validateApiBase('http://localhost:8787').ok).toBe(true);
    expect(validateApiBase('http://127.0.0.1:8787').ok).toBe(true);
  });

  it('accepts a bare https origin', () => {
    expect(validateApiBase('https://puresip-api.november-saiful.workers.dev').ok).toBe(true);
  });

  it('rejects a URL with a path — API routes already start with /api/*', () => {
    const r = validateApiBase('https://puresip-api.november-saiful.workers.dev/');
    expect(r.ok).toBe(true); // trailing slash normalizes to "/"
    expect(validateApiBase('https://example.com/api').ok).toBe(false);
  });
});
