import type { Env, CartState } from '../types';

const PREFIX = 'cart:';
const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export function newCartId(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

export async function readCart(env: Env, cartId: string): Promise<CartState> {
  const raw = (await env.CART_KV.get(PREFIX + cartId, 'json')) as CartState | null;
  if (raw && Array.isArray(raw.lines)) {
    return { lines: raw.lines, promoCode: raw.promoCode ?? null };
  }
  return { lines: [], promoCode: null };
}

export async function writeCart(env: Env, cartId: string, cart: CartState): Promise<void> {
  await env.CART_KV.put(PREFIX + cartId, JSON.stringify(cart), { expirationTtl: TTL_SECONDS });
}
