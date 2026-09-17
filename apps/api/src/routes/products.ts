import { Hono } from 'hono';
import type { Env, ProductRow, VariantRow } from '../types';
import { ApiError } from '../lib/errors';
import { rateLimit, clientIp } from '../lib/ratelimit';

export interface VariantDto {
  id: number;
  sku: string;
  color: string;
  colorHex: string;
  sizeMl: number;
  priceDelta: number;
  price: number;
  stock: number;
  images: string[];
}

export interface ProductDto {
  id: number;
  slug: string;
  name: string;
  category: string;
  shortDescription: string;
  longDescription: string;
  basePrice: number;
  featured: boolean;
  variants: VariantDto[];
  rating?: number;
  reviewCount?: number;
  primaryImage?: string;
  createdAt: string;
}

const SORTS = ['popular', 'price_asc', 'price_desc', 'newest'] as const;
type SortId = (typeof SORTS)[number];

function mapVariant(v: VariantRow, basePrice: number): VariantDto {
  let images: string[] = [];
  try {
    images = JSON.parse(v.image_urls) as string[];
  } catch {
    images = [];
  }
  return {
    id: v.id,
    sku: v.sku,
    color: v.color,
    colorHex: v.color_hex,
    sizeMl: v.size_ml,
    priceDelta: v.price_delta,
    price: Math.round((basePrice + v.price_delta) * 100) / 100,
    stock: v.stock,
    images,
  };
}

function mapProduct(
  p: ProductRow,
  variants: VariantRow[],
  rating?: number,
  reviewCount?: number,
): ProductDto {
  const mapped = variants.map((v) => mapVariant(v, p.base_price));
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    shortDescription: p.short_description,
    longDescription: p.long_description,
    basePrice: p.base_price,
    featured: p.featured === 1,
    variants: mapped,
    rating: rating !== undefined ? Math.round(rating * 10) / 10 : undefined,
    reviewCount,
    primaryImage: mapped[0]?.images[0],
    createdAt: p.created_at,
  };
}

export const productsRouter = new Hono<{ Bindings: Env }>();

// GET /api/products?category=&color=&size=&minPrice=&maxPrice=&q=&sort=&featured=1
productsRouter.get('/', async (c) => {
  rateLimit(c.env, `pl:${clientIp(c.req.raw)}`, 120, 60_000);

  const q = c.req.query();
  const category = q['category'];
  const color = q['color'];
  const sizeMl = q['size'];
  const minPrice = q['minPrice'];
  const maxPrice = q['maxPrice'];
  const search = q['q'];
  const sort = (SORTS as readonly string[]).includes(q['sort'] ?? '') ? (q['sort'] as SortId) : 'popular';
  const featuredOnly = q['featured'] === '1';

  const where: string[] = ['p.active = 1'];
  const params: (string | number)[] = [];
  if (category) {
    where.push('p.category = ?');
    params.push(category);
  }
  if (featuredOnly) {
    where.push('p.featured = 1');
  }
  if (search) {
    where.push('(p.name LIKE ? OR p.short_description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (color) {
    where.push(`EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.color = ?)`);
    params.push(color);
  }
  if (sizeMl) {
    where.push(`EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.size_ml = ?)`);
    params.push(Number(sizeMl));
  }

  let orderBy = 'p.featured DESC, p.id ASC'; // popular ≈ featured-first, stable
  if (sort === 'newest') orderBy = 'p.created_at DESC, p.id DESC';
  if (sort === 'price_asc' || sort === 'price_desc') {
    orderBy = `p.base_price ${sort === 'price_asc' ? 'ASC' : 'DESC'}, p.id ASC`;
  }

  const { results: rows } = await c.env.DB.prepare(
    `SELECT p.* FROM products p WHERE ${where.join(' AND ')} ORDER BY ${orderBy}`,
  )
    .bind(...params)
    .all<ProductRow>();

  let products = rows ?? [];

  // price filtering happens on computed price (base + min delta) in JS for simplicity
  if (minPrice) products = products.filter((p) => p.base_price >= Number(minPrice));
  if (maxPrice) products = products.filter((p) => p.base_price <= Number(maxPrice));

  const productIds = products.map((p) => p.id);
  let variantsByProduct = new Map<number, VariantRow[]>();
  let ratingsByProduct = new Map<number, { avg: number; count: number }>();
  if (productIds.length > 0) {
    const ph = productIds.map(() => '?').join(',');
    const { results: variantRows } = await c.env.DB.prepare(
      `SELECT * FROM product_variants WHERE product_id IN (${ph}) ORDER BY id ASC`,
    )
      .bind(...productIds)
      .all<VariantRow>();
    variantsByProduct = groupBy(variantRows ?? [], (v) => v.product_id);

    const { results: ratingRows } = await c.env.DB.prepare(
      `SELECT product_id, AVG(rating) AS avg, COUNT(*) AS count FROM reviews
       WHERE product_id IN (${ph}) AND approved = 1 GROUP BY product_id`,
    )
      .bind(...productIds)
      .all<{ product_id: number; avg: number; count: number }>();
    ratingsByProduct = new Map(
      (ratingRows ?? []).map((r) => [r.product_id, { avg: r.avg, count: r.count }]),
    );
  }

  const dtos = products.map((p) => {
    const r = ratingsByProduct.get(p.id);
    return mapProduct(p, variantsByProduct.get(p.id) ?? [], r?.avg, r?.count);
  });

  return c.json({ products: dtos });
});

// GET /api/products/:slug — detail incl. variants + reviews
productsRouter.get('/:slug', async (c) => {
  rateLimit(c.env, `pd:${clientIp(c.req.raw)}`, 120, 60_000);

  const slug = c.req.param('slug');
  const product = await c.env.DB.prepare(`SELECT * FROM products WHERE slug = ? AND active = 1`)
    .bind(slug)
    .first<ProductRow>();
  if (!product) throw ApiError.notFound('Product');

  const { results: variantRows } = await c.env.DB.prepare(
    `SELECT * FROM product_variants WHERE product_id = ? ORDER BY id ASC`,
  )
    .bind(product.id)
    .all<VariantRow>();

  const { results: reviewRows } = await c.env.DB.prepare(
    `SELECT * FROM reviews WHERE product_id = ? AND approved = 1 ORDER BY created_at DESC LIMIT 50`,
  )
    .bind(product.id)
    .all<ReviewLike>();

  const reviews = (reviewRows ?? []).map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    authorName: r.author_name,
    createdAt: r.created_at,
  }));
  const avg =
    reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : undefined;

  return c.json({
    product: mapProduct(product, variantRows ?? [], avg, reviews.length),
    reviews,
  });
});

interface ReviewLike {
  id: number;
  rating: number;
  title: string;
  body: string;
  author_name: string;
  created_at: string;
}

function groupBy<T>(items: T[], key: (t: T) => number): Map<number, T[]> {
  const m = new Map<number, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = m.get(k);
    if (list) list.push(item);
    else m.set(k, [item]);
  }
  return m;
}
