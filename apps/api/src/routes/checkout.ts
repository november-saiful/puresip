import { Hono } from 'hono';
import type { Env } from '../types';
import { ApiError } from '../lib/errors';
import { readCart, writeCart } from '../lib/cart';
import { resolveLines, applyPromo, shippingCostFor, insertOrder, newOrderId, round2 } from '../lib/pricing';
import { createStripeCheckout, stripeEnabled, verifyStripeSignature } from '../lib/stripe';
import { checkoutSchema } from '../lib/schemas';
import { rateLimit, clientIp } from '../lib/ratelimit';

export const checkoutRouter = new Hono<{ Bindings: Env }>();

// POST /api/checkout — create order; hands off to Stripe unless DEMO_MODE
checkoutRouter.post('/', async (c) => {
  rateLimit(c.env, `checkout:${clientIp(c.req.raw)}`, 20, 60_000);
  const body = checkoutSchema.parse(await c.req.json());

  const cartId = c.req.header('x-cart-id') ?? cookieCartId(c.req.raw);
  if (!cartId) throw ApiError.badRequest('Missing cart', 'missing_cart');
  const cart = await readCart(c.env, cartId);
  const lines = cart.lines.filter((l) => l.qty > 0);
  if (lines.length === 0) throw ApiError.badRequest('Cart is empty', 'empty_cart');

  const resolved = await resolveLines(c.env, lines);
  const subtotal = round2(resolved.reduce((s, l) => s + l.unitPrice * (lines.find((x) => x.variantId === l.variant.id)?.qty ?? 0), 0));
  const promo = await applyPromo(c.env, cart.promoCode, subtotal);
  const afterDiscount = round2(subtotal - promo.discount);
  const shippingCost = shippingCostFor(body.shippingMethod, afterDiscount);
  const total = round2(afterDiscount + shippingCost);

  const orderId = newOrderId();
  const demo = !stripeEnabled(c.env);

  await insertOrder(
    c.env,
    {
      id: orderId,
      customer_email: body.email,
      customer_name: body.name,
      shipping_address: body.address,
      shipping_method: body.shippingMethod,
      subtotal,
      discount: promo.discount,
      shipping_cost: shippingCost,
      total,
      promo_code: promo.code,
      status: demo ? 'paid' : 'pending',
      payment_mode: demo ? 'demo' : 'stripe',
      stripe_session_id: null,
    },
    resolved.map((l) => ({
      variantId: l.variant.id,
      name: l.product.name,
      color: l.variant.color,
      qty: lines.find((x) => x.variantId === l.variant.id)?.qty ?? 0,
      unitPrice: l.unitPrice,
    })),
  );

  // Empty the stored cart after successful order creation.
  await writeCart(c.env, cartId, { lines: [], promoCode: null });

  if (demo) {
    return c.json({
      mode: 'demo',
      orderId,
      status: 'paid',
      total,
      message: 'Demo checkout complete — no real payment was processed.',
    });
  }

  const origin = c.req.header('origin') ?? new URL(c.req.url).origin;
  const session = await createStripeCheckout(c.env, {
    orderId,
    email: body.email,
    successUrl: `${origin}/order/${orderId}?paid=1`,
    cancelUrl: `${origin}/checkout?canceled=1`,
    items: resolved.map((l) => ({
      name: l.product.name,
      color: l.variant.color,
      unitPrice: l.unitPrice,
      qty: lines.find((x) => x.variantId === l.variant.id)?.qty ?? 0,
    })),
    discount: promo.discount,
    shippingCost,
  });
  await c.env.DB.prepare(`UPDATE orders SET stripe_session_id = ? WHERE id = ?`)
    .bind(session.id, orderId)
    .run();

  return c.json({ mode: 'stripe', orderId, checkoutUrl: session.url, total });
});

function cookieCartId(req: Request): string | null {
  const header = req.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === 'ps_cart') return rest.join('=');
  }
  return null;
}

export const stripeWebhookRouter = new Hono<{ Bindings: Env }>();

// POST /api/webhooks/stripe — mark orders paid; idempotent
stripeWebhookRouter.post('/', async (c) => {
  const payload = await c.req.text();
  const sig = c.req.header('stripe-signature');
  const secret = c.env.STRIPE_WEBHOOK_SECRET;
  if (secret && sig) {
    const ok = await verifyStripeSignature(payload, sig, secret);
    if (!ok) throw ApiError.unauthorized('Invalid Stripe signature');
  } else if (!c.env.DEMO_MODE || c.env.DEMO_MODE === 'false') {
    // In production without a secret configured, refuse.
    throw ApiError.unauthorized('Missing webhook secret');
  }

  let event: { type: string; data: { object: { id: string; client_reference_id?: string; payment_status?: string } } };
  try {
    event = JSON.parse(payload);
  } catch {
    throw ApiError.badRequest('Invalid JSON', 'invalid_json');
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.client_reference_id;
    if (orderId) {
      await c.env.DB.prepare(
        `UPDATE orders SET status = 'paid', payment_mode = 'stripe' WHERE id = ? AND status = 'pending'`,
      )
        .bind(orderId)
        .run();
    }
  }
  return c.json({ received: true });
});
