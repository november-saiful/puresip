/** Shared types for the PureSip Worker API. */

export interface Env {
  DB: D1Database;
  CART_KV: KVNamespace;
  IMAGES?: R2Bucket;
  DEMO_MODE: string;
  ALLOWED_ORIGINS: string;
  ADMIN_TOKEN?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}

export interface ProductRow {
  id: number;
  slug: string;
  name: string;
  category: string;
  short_description: string;
  long_description: string;
  base_price: number;
  featured: number; // 0/1 in SQLite
  active: number;
  created_at: string;
}

export interface VariantRow {
  id: number;
  product_id: number;
  sku: string;
  color: string;
  color_hex: string;
  size_ml: number;
  price_delta: number;
  stock: number;
  image_urls: string; // JSON array
}

export interface ReviewRow {
  id: number;
  product_id: number;
  rating: number;
  title: string;
  body: string;
  author_name: string;
  approved: number;
  created_at: string;
}

export interface OrderRow {
  id: string;
  customer_email: string;
  customer_name: string;
  shipping_address: string | Record<string, string> | null;
  shipping_method: string;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  total: number;
  promo_code: string | null;
  status: string;
  payment_mode: string;
  stripe_session_id: string | null;
  created_at: string;
}

export interface OrderItemRow {
  id: number;
  order_id: string;
  variant_id: number;
  name_snapshot: string;
  color_snapshot: string;
  qty: number;
  unit_price: number;
}

export interface PromoRow {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  active: number;
  expires_at: string | null;
}

export interface CartLine {
  variantId: number;
  qty: number;
}

export interface CartState {
  lines: CartLine[];
  promoCode?: string | null;
}

export const FREE_SHIPPING_THRESHOLD = 40;
export const SHIPPING_METHODS = {
  standard: { id: 'standard', label: 'Standard', days: '3–5 business days', cost: 4.99 },
  express: { id: 'express', label: 'Express', days: '1–2 business days', cost: 9.99 },
} as const;
export type ShippingMethodId = keyof typeof SHIPPING_METHODS;
