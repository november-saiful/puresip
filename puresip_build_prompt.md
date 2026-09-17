# 🚀 PROJECT BRIEF: PureSip E-Commerce Website (Full Build Prompt for AI Agent)

> **How to use this file:** Hand this entire document to your AI coding agent (e.g., Cursor, Claude Code, v0, Bolt, or an autonomous agent). It is written as a complete, self-contained specification. The agent should treat every section as a requirement unless explicitly marked **[Optional]**.

---

## 1. Project Overview

Build a **production-ready, modern, polished e-commerce website** for **PureSip**, a lifestyle brand selling reusable stainless-steel water bottles and related hydration accessories.

- **Brand name:** PureSip
- **Tagline:** *"Hydration, Elevated."* (agent may propose 2–3 alternatives)
- **Target audience:** Students, office workers, gym-goers, commuters, eco-conscious everyday users
- **Vibe:** Clean, minimal, modern, premium-but-approachable, eco-friendly, Apple/Drop-style polish
- **Deployment target:** 100% Cloudflare (frontend, backend, database, storage, CI/CD)
- **Source control:** GitHub, with automated deployment via GitHub Actions → Cloudflare

### Core product (hero product)

**PureSip Water Bottle** — a stylish, reusable water bottle:
- Stainless-steel body
- Keeps drinks cold for hours (insulated)
- Leak-proof lid
- Lightweight and easy to carry
- Simple modern design
- Available in multiple colors
- Reusable and easy to clean

### Product line to build (expand catalog realistically)

The agent must design a coherent 6–10 SKU catalog around the hero bottle, for example:

| # | Product | Description |
|---|---------|-------------|
| 1 | **PureSip Bottle 500ml** (hero) | Everyday size, 6 colors |
| 2 | **PureSip Bottle 750ml** | Larger capacity, 6 colors |
| 3 | **PureSip Tumbler 400ml** | Office/coffee tumbler with sip lid |
| 4 | **PureSip Straw Lid (Accessory)** | Interchangeable straw lid |
| 5 | **PureSip Carry Loop / Strap (Accessory)** | Silicone carry loop |
| 6 | **PureSip Bottle Brush Kit (Accessory)** | Cleaning brush set |
| 7 | **PureSip Sports Cap (Accessory)** | One-hand flip cap |
| 8 | **[Optional] PureSip Mini 350ml** | Kids/pocket size |

Each product needs: multiple color variants, price, SKU, stock quantity, short description, long description, feature bullets, and 2–3 images (agent may generate placeholders or use free stock imagery URLs).

---

## 2. Tech Stack (mandatory)

### Frontend
- **Framework:** Astro (preferred for content + speed) OR Next.js. Must be deployable to **Cloudflare Pages** (Astro via `@astrojs/cloudflare`, Next.js via `@cloudflare/next-on-pages` or OpenNext).
- **Styling:** Tailwind CSS + shadcn/ui-style components (or carefully hand-built equivalents). Dark/light mode toggle.
- **Animations:** Subtle, tasteful micro-interactions (Framer Motion / CSS). Scroll-triggered reveals on homepage. NO janky parallax overload.
- **Icons:** Lucide icons.
- **Typography:** Modern sans (e.g., Inter, Plus Jakarta Sans) + an optional display font for headings.

### Backend
- **Runtime:** Cloudflare Workers (Hono framework preferred for the API — lightweight, fast).
- **API style:** REST endpoints under `/api/*` (or a tRPC layer if preferred, but REST is fine).

### Database & Storage (all Cloudflare)
- **D1 (SQLite):** Products, variants, orders, customers, cart sessions, reviews.
- **R2:** Product images, brand assets.
- **KV:** Cart sessions (fast reads), feature flags, cached homepage data.
- **[Optional] Durable Objects:** Real-time stock counter / flash-sale stock.
- **[Optional] Queues:** Order confirmation email jobs, inventory webhooks.

### CI/CD
- **GitHub repo** with **GitHub Actions** workflow that on push to `main`:
  1. Installs deps, runs lint + typecheck + tests
  2. Builds the frontend
  3. Deploys frontend to **Cloudflare Pages**
  4. Runs `wrangler deploy` for the Worker
  5. Runs pending **D1 migrations** (drizzle-kit / wrangler migrations)
- Preview deployments for pull requests (Cloudflare Pages preview + Workers preview via Wrangler).
- Use **Cloudflare API token** stored as a GitHub secret (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`).

### Payments
- **Stripe Checkout** integrated via a Worker endpoint (`/api/checkout`) using Stripe webhooks (also handled in the Worker) to mark orders as paid.
- **[Optional]** Cash-on-delivery toggle for demo mode.
- A **"Demo Mode"** env flag that skips real Stripe and simulates checkout for development.

### Auth **[Optional but preferred]**
- Customer accounts via email magic link or Cloudflare Access / Lucia-style auth. At minimum: guest checkout must work.

---

## 3. Page Structure

1. **Homepage** — Hero section with hero bottle (large product visual, gradient/glassmorphism background, clear CTA "Shop the Bottle"), social proof strip (★ ratings, "10,000+ happy sippers"), featured products grid, "Why PureSip" features section (insulation, leak-proof, eco), color showcase section, testimonials, sustainability section, newsletter signup, footer.
2. **Shop / Catalog page** (`/shop`) — Product grid with filtering (category, color, size, price), sorting (price, popularity, newest), search.
3. **Product detail page** (`/product/[slug]`) — Image gallery, color/size variant selector (updates price/stock/SKU live), price, stock indicator, quantity picker, Add to Cart, feature bullets, accordion sections (Details, Materials & Care, Shipping), related products, reviews section (read + submit), sticky "add to cart" bar on mobile.
4. **Cart page** (`/cart`) — Line items with variant, quantity edit, remove, subtotal, promo code field (DB-backed), shipping estimate, checkout CTA. Cart persists across sessions (KV/localStorage hybrid).
5. **Checkout** (`/checkout`) — Address form, shipping method, Stripe Checkout handoff, order summary. Order confirmation page (`/order/[id]`).
6. **About / Sustainability** (`/about`) — Brand story, eco mission, materials.
7. **FAQ** (`/faq`) — Accordion.
8. **Contact** (`/contact`) — Form that posts to Worker endpoint and queues an email.
9. **Legal** — Privacy policy, terms, refund policy pages (placeholder content is fine).
10. **[Optional] Account** — Order history, profile.
11. **404 page** — On-brand, playful.

### Admin **[Optional but strongly preferred]**
- Simple `/admin` protected by Cloudflare Access (or basic auth):
  - Product CRUD
  - Order list & status updates (pending → paid → shipped → delivered)
  - Stock management
  - Discount/promo code management
  - Basic stats (revenue, orders, top products)

---

## 4. Design Requirements

- **Look & feel:** Ultra-clean, lots of whitespace, soft rounded corners (rounded-2xl/3xl), subtle shadows, glassmorphism accents, smooth 200–300ms transitions, gradient mesh backgrounds in brand colors.
- **Brand palette (agent may refine):** Deep teal/ocean primary (`#0E7C7B` area), aqua accent, off-white background (`#FAFBFC`), dark slate text. Support dark mode.
- **Imagery:** High-quality lifestyle + product shots. Consistent aspect ratios (1:1 grid, 4:5 PDP). Placeholder images must look intentional (gradient + product silhouette is acceptable for v1).
- **Mobile-first, fully responsive.** Target Lighthouse 95+ on performance/accessibility/best-practices.
- **Accessibility:** Semantic HTML, alt text, keyboard-navigable menus, focus states, ARIA on interactive widgets (variant pickers, cart drawer).
- **Micro-details:** Cart drawer sliding from right with badge count animation, toast notifications on add-to-cart, skeleton loaders on catalog, image hover zoom on PDP, smooth page transitions.

---

## 5. Data Model (D1 — drizzle-orm preferred)

Minimum tables:
- `products` (id, slug, name, category, description, long_description, base_price, featured, active, created_at)
- `product_variants` (id, product_id, sku, color, color_hex, size_ml, price_delta, stock, image_urls(JSON))
- `carts` / `cart_items` (or KV-based cart + DB mirror)
- `orders`, `order_items` (id, order_id, variant_id, qty, unit_price, status)
- `customers` (id, email, name, addresses(JSON))
- `reviews` (id, product_id, rating, title, body, author_name, approved)
- `promo_codes` (code, type(%/fixed), value, active, expires_at)
- `newsletter_subscribers`

Seed script with the full PureSip catalog (realistic prices, e.g., bottle $24.99–$34.99, accessories $6.99–$12.99), 2–3 reviews per product, and a demo promo code `PURE10` (10% off).

---

## 6. API Endpoints (Worker)

- `GET /api/products?category=&color=&sort=&q=` — list/filter
- `GET /api/products/:slug` — detail incl. variants, reviews
- `GET/POST/PUT/DELETE /api/cart/*` — cart operations
- `POST /api/checkout` — create Stripe session (or demo order)
- `POST /api/webhooks/stripe` — payment confirmation
- `GET /api/orders/:id` — order status (confirmation page)
- `POST /api/reviews` — submit review
- `POST /api/newsletter` — subscribe
- `POST /api/promo/validate` — validate promo code
- Admin CRUD endpoints under `/api/admin/*` **[Optional]**
- All responses typed, consistent error shape `{ error: { code, message } }`, CORS locked to the site origin, rate-limit sensitive endpoints (Cloudflare native or custom).

---

## 7. Repository & CI/CD Structure

```
puresip/
├── .github/workflows/deploy.yml      # main CI/CD pipeline
├── apps/
│   ├── web/        (Astro/Next frontend)
│   └── api/        (Hono Worker)
├── packages/
│   ├── db/         (drizzle schema + migrations + seed)
│   └── ui/         (shared components, optional)
├── wrangler.toml   (Worker + D1 + R2 + KV bindings)
└── README.md       (setup, deploy, env vars, scripts)
```

**Workflow requirements:**
- Push to `main` → lint → typecheck → unit tests (Vitest) → build → deploy Worker + D1 migrations → deploy Pages.
- PR → preview deployment + comment with preview URL.
- Node 20+, pnpm preferred.
- Document all required secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`.

---

## 8. SEO, Performance & Polish

- Meta titles/descriptions/OG images on every page; `sitemap.xml`, `robots.txt`, JSON-LD `Product` + `Organization` schema.
- Image optimization (AVIF/WebP, lazy loading, `srcset`), font subsetting, minimal client JS on content pages.
- Open Graph share card for the hero bottle.
- Favicon + brand logo (SVG).

---

## 9. Deliverables Checklist (agent must complete all)

- [ ] Full frontend (all pages in §3) with polished responsive design
- [ ] Worker API with all endpoints in §6
- [ ] D1 schema + migrations + seed script with PureSip catalog
- [ ] R2 bucket setup with product images (placeholders acceptable)
- [ ] Stripe checkout integration + webhook (with demo mode fallback)
- [ ] Cart with persistence + promo code support
- [ ] GitHub Actions CI/CD + Wrangler configs + documented secrets
- [ ] Admin panel **[Optional tier]**
- [ ] README with local dev instructions (`wrangler dev`, pages dev, seeding DB)
- [ ] Lighthouse 90+ scores
- [ ] Working end-to-end: browse → product → cart → checkout → confirmation

---

## 10. Execution Instructions for the Agent

1. Start by scaffolding the monorepo and configs; confirm the plan before heavy UI work.
2. Build backend (schema → seed → API) before or in parallel with frontend so pages have real data.
3. Use the seed data to render everything; no hardcoded mock data in components.
4. Keep the design cohesive — one design system, no mismatched component styles.
5. Test the full purchase flow in demo mode before finalizing.
6. Write the README as if for a developer joining the project cold.
7. If any requirement is ambiguous, make a sensible decision, note it in the README, and keep moving — do not stall.
