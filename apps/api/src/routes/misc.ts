import { Hono } from 'hono';
import type { Env, ProductRow, ReviewRow } from '../types';
import { ApiError } from '../lib/errors';
import { reviewSchema, newsletterSchema, contactSchema } from '../lib/schemas';
import { rateLimit, clientIp } from '../lib/ratelimit';

export const reviewsRouter = new Hono<{ Bindings: Env }>();

// POST /api/reviews — submit a review (auto-approved in demo; set approved=0 in prod)
reviewsRouter.post('/', async (c) => {
  rateLimit(c.env, `review:${clientIp(c.req.raw)}`, 10, 60_000);
  const body = reviewSchema.parse(await c.req.json());
  const product = await c.env.DB.prepare(`SELECT id FROM products WHERE slug = ? AND active = 1`)
    .bind(body.productSlug)
    .first<ProductRow>();
  if (!product) throw ApiError.notFound('Product');

  const autoApprove = c.env.DEMO_MODE === 'true';
  const result = await c.env.DB.prepare(
    `INSERT INTO reviews (product_id, rating, title, body, author_name, approved) VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(product.id, body.rating, body.title, body.body, body.authorName, autoApprove ? 1 : 0)
    .run();
  return c.json({ ok: true, id: result.meta?.last_row_id ?? null, approved: autoApprove });
});

export const newsletterRouter = new Hono<{ Bindings: Env }>();

// POST /api/newsletter — subscribe (idempotent)
newsletterRouter.post('/', async (c) => {
  rateLimit(c.env, `news:${clientIp(c.req.raw)}`, 10, 60_000);
  const { email } = newsletterSchema.parse(await c.req.json());
  await c.env.DB.prepare(`INSERT INTO newsletter_subscribers (email) VALUES (?)
    ON CONFLICT(email) DO NOTHING`).bind(email).run();
  return c.json({ ok: true, message: 'You are on the list. Welcome to the hydration nation. 💧' });
});

export const contactRouter = new Hono<{ Bindings: Env }>();

// POST /api/contact — store message (Queues/email job would hook in here)
contactRouter.post('/', async (c) => {
  rateLimit(c.env, `contact:${clientIp(c.req.raw)}`, 10, 60_000);
  const body = contactSchema.parse(await c.req.json());
  await c.env.DB.prepare(
    `INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)`,
  )
    .bind(body.name, body.email, body.subject, body.message)
    .run();
  return c.json({ ok: true, message: 'Message received — we reply within one business day.' });
});

export type { ReviewRow };
