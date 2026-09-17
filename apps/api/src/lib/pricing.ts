import type { Env, OrderRow, ProductRow, VariantRow } from '../types';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_METHODS } from '../types';
import { ApiError } from './errors';

/** Money helpers — round to cents at every boundary. */
export const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface ResolvedLine {
  variant: VariantRow;
  product: ProductRow;
  unitPrice: number;
}

/** Load variant + product rows for cart line ids; throws 404/409 when invalid. */
export async function resolveLines(
  env: Env,
  lines: { variantId: number; qty: number }[],
): Promise<ResolvedLine[]> {
  if (lines.length === 0) return [];
  const ids = [...new Set(lines.map((l) => l.variantId))];
  const placeholders = ids.map(() => '?').join(',');
  const { results: variants } = await env.DB.prepare(
    `SELECT * FROM product_variants WHERE id IN (${placeholders})`,
  )
    .bind(...ids)
    .all<VariantRow>();
  if (!variants || variants.length === 0) throw ApiError.notFound('Variant');

  const productIds = [...new Set(variants.map((v) => v.product_id))];
  const pPlaceholders = productIds.map(() => '?').join(',');
  const { results: products } = await env.DB.prepare(
    `SELECT * FROM products WHERE id IN (${pPlaceholders}) AND active = 1`,
  )
    .bind(...productIds)
    .all<ProductRow>();
  if (!products || products.length === 0) throw ApiError.notFound('Product');

  const byId = new Map(products.map((p) => [p.id, p]));
  const out: ResolvedLine[] = [];
  for (const line of lines) {
    if (line.qty <= 0) continue;
    const variant = variants.find((v) => v.id === line.variantId);
    if (!variant) throw ApiError.notFound(`Variant ${line.variantId}`);
    const product = byId.get(variant.product_id);
    if (!product) throw ApiError.notFound(`Product for variant ${line.variantId}`);
    if (variant.stock < line.qty) {
      throw ApiError.conflict(`Insufficient stock for ${product.name} (${variant.color}): ${variant.stock} left`);
    }
    out.push({ variant, product, unitPrice: round2(product.base_price + variant.price_delta) });
  }
  return out;
}

export interface PromoResult {
  code: string | null;
  discount: number;
}

export async function applyPromo(
  env: Env,
  code: string | null | undefined,
  subtotal: number,
): Promise<PromoResult> {
  if (!code) return { code: null, discount: 0 };
  const promo = await env.DB.prepare(
    `SELECT * FROM promo_codes WHERE UPPER(code) = UPPER(?) AND active = 1
     AND (expires_at IS NULL OR expires_at > datetime('now'))`,
  )
    .bind(code)
    .first<{ code: string; type: 'percent' | 'fixed'; value: number }>();
  if (!promo) return { code: null, discount: 0 };
  const discount =
    promo.type === 'percent' ? round2((subtotal * promo.value) / 100) : Math.min(round2(promo.value), subtotal);
  return { code: promo.code, discount };
}

export function shippingCostFor(method: string, subtotalAfterDiscount: number): number {
  if (method === 'express') return SHIPPING_METHODS.express.cost;
  return subtotalAfterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_METHODS.standard.cost;
}

export async function insertOrder(
  env: Env,
  order: Omit<OrderRow, 'created_at'>,
  items: { variantId: number; name: string; color: string; qty: number; unitPrice: number }[],
): Promise<string> {
  const db = env.DB.withSession('primary-first');
  try {
    await db
      .prepare(
        `INSERT INTO orders (id, customer_email, customer_name, shipping_address, shipping_method,
          subtotal, discount, shipping_cost, total, promo_code, status, payment_mode, stripe_session_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        order.id,
        order.customer_email,
        order.customer_name,
        order.shipping_address ? JSON.stringify(order.shipping_address) : null,
        order.shipping_method,
        order.subtotal,
        order.discount,
        order.shipping_cost,
        order.total,
        order.promo_code,
        order.status,
        order.payment_mode,
        order.stripe_session_id,
      )
      .run();

    for (const item of items) {
      await db
        .prepare(
          `INSERT INTO order_items (order_id, variant_id, name_snapshot, color_snapshot, qty, unit_price)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(order.id, item.variantId, item.name, item.color, item.qty, item.unitPrice)
        .run();
      await db
        .prepare(`UPDATE product_variants SET stock = MAX(0, stock - ?) WHERE id = ?`)
        .bind(item.qty, item.variantId)
        .run();
    }
    return order.id;
  } finally {
    // Sessions auto-close when the scope ends; nothing to release explicitly.
  }
}

export function newOrderId(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let suffix = '';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) suffix += chars[b % chars.length];
  return `PS-${suffix}`;
}
