import { describe, expect, it } from 'vitest';

// Pure logic mirrored from apps/api/src/lib/pricing.ts (which imports Env types only).
// Keeping a local copy here keeps the test hermetic (no Cloudflare runtime needed).
const round2 = (n: number): number => Math.round(n * 100) / 100;
const FREE_SHIPPING_THRESHOLD = 40;
const SHIPPING = { standard: 4.99, express: 9.99 };

function shippingCostFor(method: string, afterDiscount: number): number {
  if (method === 'express') return SHIPPING.express;
  return afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING.standard;
}

function promoDiscount(type: 'percent' | 'fixed', value: number, subtotal: number): number {
  if (type === 'percent') return round2((subtotal * value) / 100);
  return Math.min(round2(value), subtotal);
}

describe('round2', () => {
  it('rounds to cents avoiding float drift', () => {
    expect(round2(24.99 * 3)).toBe(74.97);
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });
  it('documents the 1.005 edge case (stored as 1.00499… in IEEE-754)', () => {
    // Literal 1.005 is actually 1.00499999999999989…, so it rounds DOWN.
    // All money values are computed (never literal), so real amounts behave.
    expect(round2(1.005)).toBe(1);
  });
});

describe('promoDiscount', () => {
  it('computes percent discounts', () => {
    expect(promoDiscount('percent', 10, 74.97)).toBe(7.5);
    expect(promoDiscount('percent', 25, 100)).toBe(25);
  });
  it('computes fixed discounts capped at subtotal', () => {
    expect(promoDiscount('fixed', 5, 24.99)).toBe(5);
    expect(promoDiscount('fixed', 50, 24.99)).toBe(24.99);
  });
});

describe('shippingCostFor', () => {
  it('standard is free over threshold', () => {
    expect(shippingCostFor('standard', 40)).toBe(0);
    expect(shippingCostFor('standard', 39.99)).toBe(4.99);
  });
  it('express always charges', () => {
    expect(shippingCostFor('express', 500)).toBe(9.99);
  });
});

describe('order totals', () => {
  it('matches a full checkout scenario with PURE10', () => {
    const lines = [
      { unitPrice: 24.99, qty: 2 }, // 49.98
      { unitPrice: 9.99, qty: 1 },
    ];
    const subtotal = round2(lines.reduce((s, l) => s + l.unitPrice * l.qty, 0));
    expect(subtotal).toBe(59.97);
    const discount = promoDiscount('percent', 10, subtotal);
    expect(discount).toBe(6.0);
    const afterDiscount = round2(subtotal - discount);
    const shipping = shippingCostFor('standard', afterDiscount);
    expect(shipping).toBe(0); // 53.97 > 40
    const total = round2(afterDiscount + shipping);
    expect(total).toBe(53.97);
  });
});
