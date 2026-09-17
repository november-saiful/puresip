import { Hono } from 'hono';
import type { Env, OrderItemRow, OrderRow } from '../types';
import { ApiError } from '../lib/errors';
import { rateLimit, clientIp } from '../lib/ratelimit';

export const ordersRouter = new Hono<{ Bindings: Env }>();

// GET /api/orders/:id — order + items (used by /order/[id] confirmation page)
ordersRouter.get('/:id', async (c) => {
  rateLimit(c.env, `order:${clientIp(c.req.raw)}`, 60, 60_000);
  const id = c.req.param('id');
  const order = await c.env.DB.prepare(`SELECT * FROM orders WHERE id = ?`)
    .bind(id)
    .first<OrderRow>();
  if (!order) throw ApiError.notFound('Order');

  const { results: items } = await c.env.DB.prepare(
    `SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC`,
  )
    .bind(id)
    .all<OrderItemRow>();

  return c.json({
    order: {
      id: order.id,
      email: order.customer_email,
      name: order.customer_name,
      shippingMethod: order.shipping_method,
      subtotal: order.subtotal,
      discount: order.discount,
      shippingCost: order.shipping_cost,
      total: order.total,
      promoCode: order.promo_code,
      status: order.status,
      paymentMode: order.payment_mode,
      createdAt: order.created_at,
      shippingAddress: order.shipping_address
        ? typeof order.shipping_address === 'string'
          ? JSON.parse(order.shipping_address)
          : order.shipping_address
        : null,
    },
    items: (items ?? []).map((i) => ({
      name: i.name_snapshot,
      color: i.color_snapshot,
      qty: i.qty,
      unitPrice: i.unit_price,
      lineTotal: Math.round(i.unit_price * i.qty * 100) / 100,
    })),
  });
});
