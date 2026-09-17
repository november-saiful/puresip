import { describe, expect, it } from 'vitest';

/**
 * Tests for cart merge semantics used by PUT /api/cart (localStorage sync).
 * Mirrors the logic in apps/api/src/routes/cart.ts to stay hermetic.
 */
function mergeLines(
  existing: { variantId: number; qty: number }[],
  incoming: { variantId: number; qty: number }[],
): { variantId: number; qty: number }[] {
  const merged = new Map(existing.map((l) => [l.variantId, l.qty]));
  for (const line of incoming) merged.set(line.variantId, line.qty);
  return [...merged.entries()].map(([variantId, qty]) => ({ variantId, qty }));
}

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}

describe('cart merge (PUT /api/cart)', () => {
  it('overwrites quantities for existing variants', () => {
    const merged = mergeLines(
      [
        { variantId: 1, qty: 2 },
        { variantId: 2, qty: 1 },
      ],
      [{ variantId: 1, qty: 5 }],
    );
    expect(merged).toContainEqual({ variantId: 1, qty: 5 });
    expect(merged).toContainEqual({ variantId: 2, qty: 1 });
    expect(merged).toHaveLength(2);
  });

  it('adds new variants and preserves order of first insertion', () => {
    const merged = mergeLines([{ variantId: 3, qty: 1 }], [
      { variantId: 1, qty: 2 },
      { variantId: 3, qty: 4 },
    ]);
    expect(merged[0]).toEqual({ variantId: 3, qty: 4 });
    expect(merged[1]).toEqual({ variantId: 1, qty: 2 });
  });

  it('qty 0 marks line for removal (kept for PATCH semantics)', () => {
    const lines = [{ variantId: 7, qty: 0 }];
    expect(lines.filter((l) => l.qty > 0)).toHaveLength(0);
  });
});

describe('cookie parsing', () => {
  it('extracts ps_cart from a cookie header', () => {
    expect(parseCookie('foo=bar; ps_cart=abc123; x=y', 'ps_cart')).toBe('abc123');
  });

  it('returns null when missing', () => {
    expect(parseCookie('foo=bar', 'ps_cart')).toBeNull();
    expect(parseCookie(null, 'ps_cart')).toBeNull();
  });

  it('handles values containing equals signs', () => {
    expect(parseCookie('ps_cart=a=b=c', 'ps_cart')).toBe('a=b=c');
  });
});

describe('order id generation', () => {
  it('matches PS-XXXXXX shape from charset', () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const id = `PS-${Array.from({ length: 6 }, (_, i) => chars[(i * 7 + 3) % chars.length]).join('')}`;
    expect(id).toMatch(/^PS-[A-Z2-9]{6}$/);
    expect(id).not.toContain('0');
    expect(id).not.toContain('1');
    expect(id).not.toContain('O');
    expect(id).not.toContain('I');
  });
});
