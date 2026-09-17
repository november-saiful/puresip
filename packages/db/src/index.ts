import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * NOTE: The production database is Cloudflare **D1 (SQLite)** — see
 * `migrations/0001_init.sql` for the canonical SQL. This drizzle schema is the
 * typed model of the same shape (kept pg-flavored for the in-repo typecheck;
 * the Worker speaks raw SQL against D1 through `env.DB.prepare`).
 */

export const products = pgTable('products', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull(), // bottles | tumblers | accessories
  shortDescription: text('short_description').notNull(),
  longDescription: text('long_description').notNull(),
  basePrice: real('base_price').notNull(),
  featured: boolean('featured').notNull().default(false),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const productVariants = pgTable('product_variants', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  sku: text('sku').notNull().unique(),
  color: text('color').notNull(),
  colorHex: text('color_hex').notNull(),
  sizeMl: integer('size_ml').notNull().default(0),
  priceDelta: real('price_delta').notNull().default(0),
  stock: integer('stock').notNull().default(0),
  imageUrls: jsonb('image_urls').$type<string[]>().notNull().default([]),
});

export const customers = pgTable('customers', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  email: text('email').notNull().unique(),
  name: text('name'),
  addresses: jsonb('addresses').$type<unknown[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable('orders', {
  id: text('id').primaryKey(), // e.g. PS-XXXXXX
  customerEmail: text('customer_email').notNull(),
  customerName: text('customer_name').notNull(),
  shippingAddress: jsonb('shipping_address').$type<Record<string, string>>(),
  shippingMethod: text('shipping_method').notNull().default('standard'),
  subtotal: real('subtotal').notNull(),
  discount: real('discount').notNull().default(0),
  shippingCost: real('shipping_cost').notNull().default(0),
  total: real('total').notNull(),
  promoCode: text('promo_code'),
  status: text('status').notNull().default('pending'), // pending | paid | shipped | delivered | cancelled
  paymentMode: text('payment_mode').notNull().default('demo'), // demo | stripe
  stripeSessionId: text('stripe_session_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable('order_items', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  orderId: text('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  variantId: integer('variant_id').notNull(),
  nameSnapshot: text('name_snapshot').notNull(),
  colorSnapshot: text('color_snapshot').notNull(),
  qty: integer('qty').notNull(),
  unitPrice: real('unit_price').notNull(),
});

export const reviews = pgTable('reviews', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  authorName: text('author_name').notNull(),
  approved: boolean('approved').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const promoCodes = pgTable('promo_codes', {
  code: text('code').primaryKey(),
  type: text('type').notNull(), // percent | fixed
  value: real('value').notNull(),
  active: boolean('active').notNull().default(true),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
});

export const newsletterSubscribers = pgTable(
  'newsletter_subscribers',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    email: text('email').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex('newsletter_email_idx').on(t.email),
  }),
);

export const contactMessages = pgTable('contact_messages', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const productRelations = relations(products, ({ many }) => ({
  variants: many(productVariants),
  reviews: many(reviews),
}));

export const productVariantRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));

export const orderRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));

export const reviewRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
}));
