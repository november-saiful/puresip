import { Hono } from 'hono';
import type { Env, OrderRow, PromoRow } from '../types';
import { ApiError } from '../lib/errors';
import {
  orderUpdateSchema,
  productUpsertSchema,
  promoUpsertSchema,
  stockUpdateSchema,
} from '../lib/schemas';

async function requireAdmin(c: { env: Env; req: { raw: Request } }): Promise<void> {
  const token = c.env.ADMIN_TOKEN;
  if (!token) throw ApiError.unauthorized('Admin disabled (no ADMIN_TOKEN set)');
  const header = c.req.raw.headers.get('authorization') ?? '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : c.req.raw.headers.get('x-admin-token') ?? '';
  if (provided !== token) throw ApiError.unauthorized('Invalid admin token');
}

export const adminRouter = new Hono<{ Bindings: Env }>();

adminRouter.use('*', async (c, next) => {
  await requireAdmin(c);
  await next();
});

// ── Products ────────────────────────────────────────────────────────────────
adminRouter.get('/products', async (c) => {
  const { results } = await c.env.DB.prepare(`SELECT * FROM products ORDER BY id ASC`).all();
  return c.json({ products: results ?? [] });
});

adminRouter.post('/products', async (c) => {
  const body = productUpsertSchema.parse(await c.req.json());
  const res = await c.env.DB.prepare(
    `INSERT INTO products (slug, name, category, short_description, long_description, base_price, featured, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET name=excluded.name, category=excluded.category,
       short_description=excluded.short_description, long_description=excluded.long_description,
       base_price=excluded.base_price, featured=excluded.featured, active=excluded.active`,
  )
    .bind(
      body.slug,
      body.name,
      body.category,
      body.shortDescription,
      body.longDescription,
      body.basePrice,
      body.featured ? 1 : 0,
      body.active ? 1 : 0,
    )
    .run();
  return c.json({ ok: true, id: res.meta?.last_row_id ?? null });
});

adminRouter.put('/products/:slug', async (c) => {
  const slug = c.req.param('slug');
  const body = productUpsertSchema.partial().parse(await c.req.json());
  const fields: string[] = [];
  const params: (string | number)[] = [];
  if (body.name !== undefined) { fields.push('name = ?'); params.push(body.name); }
  if (body.shortDescription !== undefined) { fields.push('short_description = ?'); params.push(body.shortDescription); }
  if (body.longDescription !== undefined) { fields.push('long_description = ?'); params.push(body.longDescription); }
  if (body.basePrice !== undefined) { fields.push('base_price = ?'); params.push(body.basePrice); }
  if (body.featured !== undefined) { fields.push('featured = ?'); params.push(body.featured ? 1 : 0); }
  if (body.active !== undefined) { fields.push('active = ?'); params.push(body.active ? 1 : 0); }
  if (fields.length === 0) throw ApiError.badRequest('No fields to update');
  params.push(slug);
  await c.env.DB.prepare(`UPDATE products SET ${fields.join(', ')} WHERE slug = ?`).bind(...params).run();
  return c.json({ ok: true });
});

// ── Stock ───────────────────────────────────────────────────────────────────
adminRouter.put('/variants/:id/stock', async (c) => {
  const id = Number(c.req.param('id'));
  const body = stockUpdateSchema.parse(await c.req.json());
  await c.env.DB.prepare(`UPDATE product_variants SET stock = ? WHERE id = ?`).bind(body.stock, id).run();
  return c.json({ ok: true });
});

// ── Orders ──────────────────────────────────────────────────────────────────
adminRouter.get('/orders', async (c) => {
  const status = c.req.query()['status'];
  const rows = status
    ? await c.env.DB.prepare(`SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT 200`).bind(status).all<OrderRow>()
    : await c.env.DB.prepare(`SELECT * FROM orders ORDER BY created_at DESC LIMIT 200`).all<OrderRow>();
  return c.json({ orders: rows.results ?? [] });
});

adminRouter.put('/orders/:id/status', async (c) => {
  const id = c.req.param('id');
  const body = orderUpdateSchema.parse(await c.req.json());
  const res = await c.env.DB.prepare(`UPDATE orders SET status = ? WHERE id = ?`).bind(body.status, id).run();
  if ((res.meta?.changes ?? 0) === 0) throw ApiError.notFound('Order');
  return c.json({ ok: true });
});

// ── Promo codes ─────────────────────────────────────────────────────────────
adminRouter.get('/promos', async (c) => {
  const { results } = await c.env.DB.prepare(`SELECT * FROM promo_codes ORDER BY code ASC`).all<PromoRow>();
  return c.json({ promos: results ?? [] });
});

adminRouter.post('/promos', async (c) => {
  const body = promoUpsertSchema.parse(await c.req.json());
  await c.env.DB.prepare(
    `INSERT INTO promo_codes (code, type, value, active, expires_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(code) DO UPDATE SET type=excluded.type, value=excluded.value,
       active=excluded.active, expires_at=excluded.expires_at`,
  )
    .bind(body.code, body.type, body.value, body.active ? 1 : 0, body.expiresAt)
    .run();
  return c.json({ ok: true });
});

// ── Stats ───────────────────────────────────────────────────────────────────
adminRouter.get('/stats', async (c) => {
  const revenue = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(total), 0) AS revenue, COUNT(*) AS orders FROM orders WHERE status IN ('paid','shipped','delivered')`,
  ).first<{ revenue: number; orders: number }>();
  const top = await c.env.DB.prepare(
    `SELECT name_snapshot AS name, SUM(qty) AS qty, SUM(qty * unit_price) AS revenue
     FROM order_items GROUP BY name_snapshot ORDER BY qty DESC LIMIT 5`,
  ).all();
  const byStatus = await c.env.DB.prepare(
    `SELECT status, COUNT(*) AS count FROM orders GROUP BY status`,
  ).all();
  return c.json({
    revenue: revenue?.revenue ?? 0,
    orders: revenue?.orders ?? 0,
    topProducts: top.results ?? [],
    byStatus: byStatus.results ?? [],
  });
});
