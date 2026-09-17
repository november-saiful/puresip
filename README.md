# 💧 PureSip — Hydration, Elevated.

A production-ready, Cloudflare-native e-commerce site for PureSip reusable stainless-steel
bottles and hydration accessories. Astro SSR frontend, Hono API Worker, D1 database, KV cart
sessions, R2 image storage, Stripe checkout (with a first-class **Demo Mode**), and automated
deploys via GitHub Actions.

## Quick start (local dev)

Prereqs: **Node 20+** and npm. (pnpm also works — the CI uses pnpm; npm workspaces are set up
identically.)

```bash
npm install
npm run images:generate   # create the 96 branded SVG product images
npm run db:migrate        # create + apply D1 migrations locally
npm run db:seed           # load the PureSip catalog, reviews, PURE10 promo

# terminal 1 — API Worker on :8787
npm run dev:api

# terminal 2 — frontend on :4321
npm run dev:web
```

Open **http://localhost:4321**. The Astro dev server proxies `/api/*` to the Worker, and SSR
pages talk to `127.0.0.1:8787` directly — no env vars needed locally.

**End-to-end demo flow:** browse → `/product/puresip-bottle-500ml` → pick a color → Add to Cart →
cart drawer slides in → checkout → demo order placed (`PS-XXXXXX`, no real payment) →
confirmation page. Try promo code **PURE10** (10% off) in the cart.

## Demo Mode vs. Stripe

Demo Mode is **on by default** (`DEMO_MODE = "true"` in `wrangler.toml`):

- `POST /api/checkout` skips Stripe, marks the order `paid`, and returns the order id.
- Reviews are auto-approved.

To go live:

1. Set `DEMO_MODE = "false"` (wrangler secret/vars) and `STRIPE_SECRET_KEY` via
   `wrangler secret put STRIPE_SECRET_KEY` (or `.dev.vars` locally).
2. Create a Stripe webhook → `https://<your-api-domain>/api/webhooks/stripe` for
   `checkout.session.completed`, and set `STRIPE_WEBHOOK_SECRET`.
3. Point `PUBLIC_API_BASE_URL` (Pages env var) at the deployed Worker URL and redeploy the site.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | API + web dev servers together |
| `npm run build` | Build the Astro frontend (`apps/web/dist`) |
| `npm run test` | Vitest unit tests (pricing math, cart merge, cookies) |
| `npm run typecheck` | tsc (api + db) + `astro check` (web) |
| `npm run lint` | ESLint (flat config) |
| `npm run db:migrate` / `db:seed` | Apply migrations / seed locally (`:remote` variants exist) |
| `npm run db:reset` | Recreate schema + reseed locally |
| `npm run images:generate` | Generate placeholder product SVGs into `apps/web/public/images` |
| `npm run images:upload` | Push generated images to the R2 bucket |
| `npm run deploy:worker` / `deploy:pages` | Manual deploys |

## Project structure

```
puresip/
├── .github/workflows/deploy.yml   # CI/CD: lint → typecheck → test → build → deploy
├── apps/
│   ├── web/                       # Astro 5 SSR site (Cloudflare adapter, Tailwind v4)
│   │   ├── public/images/         # generated product art (git-friendly SVGs)
│   │   └── src/
│   │       ├── components/        # Header, Footer, CartDrawer, ProductCard
│   │       ├── layouts/           # BaseLayout (SEO, OG, JSON-LD, theme guard)
│   │       ├── pages/             # index, shop, product/[slug], cart, checkout,
│   │       │                      # order/[id], about, faq, contact, legal/[doc],
│   │       │                      # admin, 404, sitemap.xml, robots.txt
│   │       ├── scripts/           # cart store, drawer, PDP, checkout, admin clients
│   │       └── styles/global.css  # design tokens, dark mode, primitives
│   └── api/                       # Hono Worker (all /api/* endpoints)
│       └── src/
│           ├── index.ts           # app assembly, CORS, error envelope
│           ├── lib/               # cart, pricing, schemas (zod), stripe, errors
│           └── routes/            # products, cart, checkout, orders, misc, admin
├── packages/db/                   # drizzle model + SQL migrations + seed.sql
├── scripts/                       # image generator + R2 uploader
└── wrangler.toml                  # Worker config: D1, KV, R2 bindings (+ production env)
```

## API surface

| Endpoint | Purpose |
| --- | --- |
| `GET /api/products` | List/filter (`category`, `color`, `size`, `q`, `sort`, `featured`) |
| `GET /api/products/:slug` | Detail incl. variants + reviews |
| `GET/PUT/PATCH/DELETE /api/cart` | Read / bulk-sync / set-qty / clear (KV-backed, cookie session) |
| `POST /api/promo/validate` | Validate + attach promo (e.g. `PURE10`) |
| `POST /api/checkout` | Create order — demo or Stripe Checkout session |
| `POST /api/webhooks/stripe` | `checkout.session.completed` → mark paid (HMAC-verified) |
| `GET /api/orders/:id` | Order + items for the confirmation page |
| `POST /api/reviews` | Submit a review |
| `POST /api/newsletter` | Subscribe |
| `POST /api/contact` | Contact form (queued email would hook in here) |
| `GET/POST/PUT /api/admin/*` | Products, stock, orders, promos, stats — `Bearer ADMIN_TOKEN` |

Errors always use `{ "error": { "code": "message" } }`. Sensitive routes are rate-limited;
CORS is locked to `ALLOWED_ORIGINS`.

## Data model (D1)

`products`, `product_variants`, `orders`, `order_items`, `customers`, `reviews`,
`promo_codes`, `newsletter_subscribers`, `contact_messages` — see
`packages/db/migrations/0001_init.sql` (canonical SQLite) and the typed drizzle model in
`packages/db/src/index.ts`. The seed ships 8 SKUs, 36 variants (6 colors), 12 reviews, and
the `PURE10` promo.

## Deployment (Cloudflare)

One-time setup:

```bash
wrangler d1 create puresip-db
wrangler kv namespace create CART_KV
wrangler r2 bucket create puresip-images
# paste the returned ids into wrangler.toml (both envs)
```

Continuous deployment (recommended) — push to `main`. The GitHub Action
(`.github/workflows/deploy.yml`) runs lint/typecheck/tests/build, applies D1 migrations,
deploys the Worker, and deploys Pages previews for PRs.

**Required GitHub secrets:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
**Optional:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`
(as Worker secrets), plus a `PUBLIC_API_BASE_URL` repository variable.

## Admin panel

Visit `/admin`, sign in with the `ADMIN_TOKEN` value (`.dev.vars` locally, `wrangler secret put
ADMIN_TOKEN` in production). You can see revenue/order stats, top products, and move orders
through `pending → paid → shipped → delivered` (or `cancelled`).

## Design decisions & notes

- **npm over pnpm locally**: pnpm wasn't available in the build environment; npm workspaces
  mirror the same layout and CI installs with pnpm per the original brief.
- **Cart is localStorage-first** with a debounced KV mirror: instant UI, resilient offline, and
  server-side totals re-checked at checkout. Promo codes attach to the KV cart.
- **Prices are computed as cents-rounded at every boundary**; unit tests cover the math.
- **Placeholder imagery is intentional**: gradient + silhouette SVGs generated per variant so
  the catalog looks cohesive before real photography lands in R2.
- **SEO**: per-page meta/OG, JSON-LD Organization + Product schema, sitemap.xml, robots.txt.
- **Accessibility**: semantic landmarks, focus-visible rings, aria labels on variant pickers,
  radio-group semantics, keyboard-closable drawer, skip link.

## Testing your purchase flow

1. `npm run dev:api` + `npm run dev:web`
2. Shop → add 2× Bottle 500ml → open cart → apply `PURE10`
3. Checkout with any address → you land on `/order/PS-XXXXXX` (status **paid**, demo)
4. `/admin` (token `dev-admin-token-123` from `.dev.vars`) → see the order in stats
