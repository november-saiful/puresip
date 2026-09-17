import { z } from 'zod';

const email = z.string().trim().email().max(200);
const safeText = (min: number, max: number) => z.string().trim().min(min).max(max);

export const cartPutSchema = z.object({
  variantId: z.number().int().positive(),
  qty: z.number().int().min(0).max(99),
});

export const cartPatchSchema = cartPutSchema; // alias for /cart/item

export const cartLinesSchema = z.object({
  lines: z
    .array(z.object({ variantId: z.number().int().positive(), qty: z.number().int().min(0).max(99) }))
    .max(50),
});

export const checkoutSchema = z.object({
  email,
  name: safeText(2, 120),
  address: z.object({
    line1: safeText(3, 200),
    line2: z.string().trim().max(200).optional().default(''),
    city: safeText(2, 100),
    state: z.string().trim().max(100).optional().default(''),
    postalCode: safeText(2, 20),
    country: safeText(2, 60),
  }),
  shippingMethod: z.enum(['standard', 'express']).default('standard'),
});

export const reviewSchema = z.object({
  productSlug: safeText(2, 120),
  rating: z.number().int().min(1).max(5),
  title: safeText(3, 120),
  body: safeText(10, 2000),
  authorName: safeText(2, 80),
});

export const newsletterSchema = z.object({ email });

export const promoValidateSchema = z.object({
  code: safeText(2, 40).transform((s) => s.toUpperCase()),
  subtotal: z.number().nonnegative().optional(),
});

export const contactSchema = z.object({
  name: safeText(2, 120),
  email,
  subject: safeText(2, 200),
  message: safeText(10, 4000),
});

export const orderUpdateSchema = z.object({
  status: z.enum(['pending', 'paid', 'shipped', 'delivered', 'cancelled']),
});

export const productUpsertSchema = z.object({
  slug: safeText(2, 120).regex(/^[a-z0-9-]+$/, 'slug must be kebab-case'),
  name: safeText(2, 160),
  category: z.enum(['bottles', 'tumblers', 'accessories']),
  shortDescription: safeText(10, 400),
  longDescription: safeText(10, 8000),
  basePrice: z.number().nonnegative().max(100000),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
});

export const stockUpdateSchema = z.object({
  stock: z.number().int().min(0).max(1_000_000),
});

export const promoUpsertSchema = z.object({
  code: safeText(2, 40).transform((s) => s.toUpperCase()),
  type: z.enum(['percent', 'fixed']),
  value: z.number().positive().max(100000),
  active: z.boolean().default(true),
  expiresAt: z.string().datetime().nullable().default(null),
});
