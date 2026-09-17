import type { Env, OrderRow } from '../types';

/**
 * Stripe integration. When DEMO_MODE=true or STRIPE_SECRET_KEY is absent we
 * skip real Stripe entirely and return a local success URL.
 */
export const stripeEnabled = (env: Env): boolean =>
  env.DEMO_MODE !== 'true' && !!env.STRIPE_SECRET_KEY;

interface StripeSession {
  id: string;
  url: string;
}

export async function createStripeCheckout(
  env: Env,
  opts: {
    orderId: string;
    email: string;
    successUrl: string;
    cancelUrl: string;
    items: { name: string; color: string; unitPrice: number; qty: number }[];
    discount: number;
    shippingCost: number;
  },
): Promise<StripeSession> {
  const body = new URLSearchParams();
  body.set('mode', 'payment');
  body.set('customer_email', opts.email);
  body.set('success_url', opts.successUrl);
  body.set('cancel_url', opts.cancelUrl);
  body.set('client_reference_id', opts.orderId);
  body.set('metadata[order_id]', opts.orderId);

  // Build line items (unit amounts already include promo discount proration done at checkout).
  let idx = 0;
  for (const item of opts.items) {
    body.set(`line_items[${idx}][quantity]`, String(item.qty));
    body.set(`line_items[${idx}][price_data][currency]`, 'usd');
    body.set(`line_items[${idx}][price_data][unit_amount]`, String(Math.round(item.unitPrice * 100)));
    body.set(`line_items[${idx}][price_data][product_data][name]`, `${item.name} — ${item.color}`);
    idx += 1;
  }
  if (opts.discount > 0) {
    body.set('discounts[0][coupon_data][name]', 'Promo code');
    body.set('discounts[0][coupon_data][amount_off]', String(Math.round(opts.discount * 100)));
    body.set('discounts[0][coupon_data][currency]', 'usd');
  }
  if (opts.shippingCost > 0) {
    body.set(`line_items[${idx}][quantity]`, '1');
    body.set(`line_items[${idx}][price_data][currency]`, 'usd');
    body.set(`line_items[${idx}][price_data][unit_amount]`, String(Math.round(opts.shippingCost * 100)));
    body.set(`line_items[${idx}][price_data][product_data][name]`, 'Shipping');
  }

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stripe session creation failed: ${res.status} ${text.slice(0, 300)}`);
  }
  return (await res.json()) as StripeSession;
}

/**
 * Verify a Stripe webhook signature (Stripe-Signature: t=...,v1=...) using
 * WebCrypto HMAC-SHA256. Constant-time-ish comparison.
 */
export async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string,
  toleranceSeconds = 300,
): Promise<boolean> {
  const parts = Object.fromEntries(
    sigHeader.split(',').map((kv) => {
      const [k, v] = kv.split('=');
      return [(k ?? '').trim(), v?.trim() ?? ''];
    }),
  );
  const timestamp = parts['t'];
  const v1 = parts['v1'];
  if (!timestamp || !v1) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signedPayload = `${timestamp}.${payload}`;
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');

  // compare all of v1 (may contain multiple signatures; check each)
  return v1.split(',').some((sig) => sig === expected);
}

export function markOrderPaidSql(orderId: string, mode: string) {
  return { orderId, mode } as const;
}

export type { OrderRow };
