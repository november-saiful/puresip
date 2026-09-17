import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { ApiError } from './lib/errors';
import { productsRouter } from './routes/products';
import { cartRouter, promoRouter } from './routes/cart';
import { checkoutRouter, stripeWebhookRouter } from './routes/checkout';
import { ordersRouter } from './routes/orders';
import { reviewsRouter, newsletterRouter, contactRouter } from './routes/misc';
import { adminRouter } from './routes/admin';

const app = new Hono<{ Bindings: Env }>();

// CORS locked to configured origins (comma-separated in ALLOWED_ORIGINS).
app.use('/api/*', async (c, next) => {
  const origins = (c.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const middleware = cors({
    origin: (origin) => (origins.includes(origin) ? origin : origins[0] ?? null),
    allowHeaders: ['Content-Type', 'X-Cart-Id'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    maxAge: 86400,
  });
  return middleware(c, next);
});

// Root health check (also handy for wrangler dev smoke tests).
app.get('/', (c) => c.json({ name: 'puresip-api', status: 'ok' }));
app.get('/api/health', (c) => c.json({ status: 'ok', demoMode: c.env.DEMO_MODE === 'true' }));

// Routes under /api/*
const api = new Hono<{ Bindings: Env }>();
api.route('/products', productsRouter);
api.route('/cart', cartRouter);
api.route('/promo', promoRouter);
api.route('/checkout', checkoutRouter);
api.route('/webhooks/stripe', stripeWebhookRouter);
api.route('/orders', ordersRouter);
api.route('/reviews', reviewsRouter);
api.route('/newsletter', newsletterRouter);
api.route('/contact', contactRouter);
api.route('/admin', adminRouter);
app.route('/api', api);

// Consistent 404
app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Route not found' } }, 404));

// Consistent error shape: { error: { code, message } }
app.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json({ error: { code: err.code, message: err.message } }, err.status as 400);
  }
  if (err.name === 'ZodError') {
    const issues = (err as { issues?: { path: (string | number)[]; message: string }[] }).issues ?? [];
    const first = issues[0];
    return c.json(
      {
        error: {
          code: 'validation_error',
          message: first ? `${first.path.join('.') || 'body'}: ${first.message}` : 'Invalid request body',
        },
      },
      400,
    );
  }
  console.error('Unhandled error:', err);
  return c.json({ error: { code: 'internal_error', message: 'Something went wrong' } }, 500);
});

export default app;
