-- PureSip D1 schema (SQLite dialect). This is the canonical production schema.
-- Applied via: wrangler d1 migrations apply puresip-db [--local|--remote]
-- A typed drizzle model of this shape lives in ../src/index.ts.

CREATE TABLE products (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  slug             TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  category         TEXT NOT NULL,            -- bottles | tumblers | accessories
  short_description TEXT NOT NULL,
  long_description TEXT NOT NULL,
  base_price       REAL NOT NULL,
  featured         INTEGER NOT NULL DEFAULT 0,
  active           INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE product_variants (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku         TEXT NOT NULL UNIQUE,
  color       TEXT NOT NULL,
  color_hex   TEXT NOT NULL,
  size_ml     INTEGER NOT NULL DEFAULT 0,
  price_delta REAL NOT NULL DEFAULT 0,
  stock       INTEGER NOT NULL DEFAULT 0,
  image_urls  TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE customers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT,
  addresses  TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE orders (
  id               TEXT PRIMARY KEY,           -- PS-XXXXXX
  customer_email   TEXT NOT NULL,
  customer_name    TEXT NOT NULL,
  shipping_address TEXT,                       -- JSON object
  shipping_method  TEXT NOT NULL DEFAULT 'standard',
  subtotal         REAL NOT NULL,
  discount         REAL NOT NULL DEFAULT 0,
  shipping_cost    REAL NOT NULL DEFAULT 0,
  total            REAL NOT NULL,
  promo_code       TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',  -- pending|paid|shipped|delivered|cancelled
  payment_mode     TEXT NOT NULL DEFAULT 'demo',     -- demo|stripe
  stripe_session_id TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE order_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id      TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id    INTEGER NOT NULL,
  name_snapshot TEXT NOT NULL,
  color_snapshot TEXT NOT NULL,
  qty           INTEGER NOT NULL,
  unit_price    REAL NOT NULL
);

CREATE TABLE reviews (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  author_name TEXT NOT NULL,
  approved    INTEGER NOT NULL DEFAULT 1,
  approved_at TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE promo_codes (
  code       TEXT PRIMARY KEY,
  type       TEXT NOT NULL,              -- percent | fixed
  value      REAL NOT NULL,
  active     INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT
);

CREATE TABLE newsletter_subscribers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE contact_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  subject    TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
