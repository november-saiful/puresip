import { Hono } from 'hono';
import type { Env, CartState } from '../types';
import { ApiError } from '../lib/errors';
import { readCart, writeCart, newCartId } from '../lib/cart';
import { resolveLines, applyPromo, shippingCostFor, round2 } from '../lib/pricing';
import { cartPutSchema, cartLinesSchema, promoValidateSchema } from '../lib/schemas';
import { rateLimit, clientIp } from '../lib/ratelimit';

function getCookie(req: Request, name: string): string | null {
  const header = req.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}

function cartIdFromRequest(c: { req: { raw: Request; header: (n: string) => string | undefined } }): string | null {
  const fromCookie = getCookie(c.req.raw, 'ps_cart');
  return fromCookie || c.req.header('x-cart-id') || null;
}

function setCartCookie(c: { header: (n: string, v: string) => void }, cartId: string): void {
  c.header(
    'Set-Cookie',
    `ps_cart=${cartId}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax; HttpOnly; Secure`,
  );
}

interface ResolvedLine {
  variant: {
    id: number;
    sku: string;
    color: string;
    color_hex: string;
    stock: number;
    image_urls: string;
  };
  product: { slug: string; name: string };
  unitPrice: number;
}

async function cartStateResponse(
  c: { json: (body: unknown) => Response },
  env: Env,
  cart: CartState,
): Promise<Response> {
  const lines = cart.lines.filter((l) => l.qty > 0);
  let resolved: ResolvedLine[] = [];
  try {
    resolved = (await resolveLines(env, lines)) as unknown as ResolvedLine[];
  } catch {
    // stock/availability issues shouldn't block viewing the cart
  }
  const items = lines.map((l) => {
    const r = resolved.find((x) => x.variant.id === l.variantId);
    let image: string | null = null;
    if (r) {
      try {
        const imgs = JSON.parse(r.variant.image_urls) as string[];
        image = imgs[0] ?? null;
      } catch {
        image = null;
      }
    }
    return {
      variantId: l.variantId,
      qty: l.qty,
      productSlug: r?.product.slug ?? null,
      productName: r?.product.name ?? 'Unavailable item',
      color: r?.variant.color ?? '—',
      colorHex: r?.variant.color_hex ?? '#999999',
      sku: r?.variant.sku ?? '—',
      image,
      unitPrice: r?.unitPrice ?? 0,
      lineTotal: round2((r?.unitPrice ?? 0) * l.qty),
      stock: r?.variant.stock ?? 0,
    };
  });
  const subtotal = round2(items.reduce((s, i) => s + i.lineTotal, 0));
  const promo = await applyPromo(env, cart.promoCode, subtotal);
  const shipping = shippingCostFor('standard', subtotal - promo.discount);
  return c.json({
    items,
    subtotal,
    promoCode: promo.code,
    discount: promo.discount,
    shippingEstimate: shipping,
    total: round2(subtotal - promo.discount + shipping),
    itemCount: lines.reduce((s, l) => s + l.qty, 0),
  });
}

export const cartRouter = new Hono<{ Bindings: Env }>();

// GET /api/cart — current cart state (creates cart cookie if none)
cartRouter.get('/', async (c) => {
  rateLimit(c.env, `cart:${clientIp(c.req.raw)}`, 240, 60_000);
  let cartId = cartIdFromRequest(c);
  if (!cartId) cartId = newCartId();
  const cart = await readCart(c.env, cartId);
  setCartCookie(c, cartId);
  return cartStateResponse(c, c.env, cart);
});

// PUT /api/cart — replace/merge full cart lines (bulk sync from localStorage)
cartRouter.put('/', async (c) => {
  rateLimit(c.env, `cart:${clientIp(c.req.raw)}`, 240, 60_000);
  const body = cartLinesSchema.parse(await c.req.json());
  const cartId = cartIdFromRequest(c) ?? newCartId();
  const cart = await readCart(c.env, cartId);
  const merged = new Map(cart.lines.map((l) => [l.variantId, l.qty]));
  for (const line of body.lines) merged.set(line.variantId, line.qty);
  const next: CartState = {
    lines: [...merged.entries()].map(([variantId, qty]) => ({ variantId, qty })),
    promoCode: cart.promoCode,
  };
  await writeCart(c.env, cartId, next);
  setCartCookie(c, cartId);
  return cartStateResponse(c, c.env, next);
});

// PATCH /api/cart — set qty for one variant (qty=0 removes)
cartRouter.patch('/', async (c) => {
  rateLimit(c.env, `cart:${clientIp(c.req.raw)}`, 240, 60_000);
  const body = cartPutSchema.parse(await c.req.json());
  const cartId = cartIdFromRequest(c) ?? newCartId();
  const cart = await readCart(c.env, cartId);
  const lines = cart.lines.filter((l) => l.variantId !== body.variantId);
  if (body.qty > 0) lines.push({ variantId: body.variantId, qty: body.qty });
  const next: CartState = { lines, promoCode: cart.promoCode };
  await writeCart(c.env, cartId, next);
  setCartCookie(c, cartId);
  return cartStateResponse(c, c.env, next);
});

// DELETE /api/cart — clear all items
cartRouter.delete('/', async (c) => {
  const cartId = cartIdFromRequest(c);
  if (cartId) {
    const cart = await readCart(c.env, cartId);
    await writeCart(c.env, cartId, { lines: [], promoCode: cart.promoCode });
    return cartStateResponse(c, c.env, { lines: [], promoCode: cart.promoCode });
  }
  return cartStateResponse(c, c.env, { lines: [], promoCode: null });
});

export const promoRouter = new Hono<{ Bindings: Env }>();

// POST /api/promo/validate — validate and attach a promo code to the cart
promoRouter.post('/validate', async (c) => {
  rateLimit(c.env, `promo:${clientIp(c.req.raw)}`, 30, 60_000);
  const body = promoValidateSchema.parse(await c.req.json());
  const cartId = cartIdFromRequest(c) ?? newCartId();
  const cart = await readCart(c.env, cartId);
  const lines = cart.lines.filter((l) => l.qty > 0);
  let subtotal = body.subtotal ?? 0;
  if (lines.length > 0) {
    const resolved = await resolveLines(c.env, lines);
    subtotal = round2(resolved.reduce((s, l) => s + l.unitPrice * lines.find((x) => x.variantId === l.variant.id)!.qty, 0));
  }
  const promo = await applyPromo(c.env, body.code, subtotal);
  if (!promo.code) {
    throw ApiError.badRequest('Invalid or expired promo code', 'invalid_promo');
  }
  if (lines.length > 0) {
    await writeCart(c.env, cartId, { lines, promoCode: promo.code });
    setCartCookie(c, cartId);
  }
  return c.json({
    valid: true,
    code: promo.code,
    discount: promo.discount,
    message: `Code ${promo.code} applied`,
  });
});
