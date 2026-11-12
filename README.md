# Dílis — B2B portal for funeral directors

*Dílis — faithful to every family.* A FuneralDirector.ie product.

Funeral directors open a case, order services from vetted vendors (florists, limousines, caterers, printers, embalmers, celebrants…), talk to the vendor on the order, and get one clear invoice that they can pay by card. Vendors are paid out directly through Stripe Connect; the platform keeps a configurable service charge.

## What's in v1

| Area | Features |
|---|---|
| **Funeral directors** | Funeral cases (deceased, date, venue, family contact) · marketplace by category/search · order builder with live totals · order tracking · per-order conversation · invoices with card payment · printable invoices |
| **Vendors** | Rate card (price, unit, VAT rate, photo) · accept/decline/progress/deliver orders · delivery auto-issues the invoice · payout view · Stripe Connect onboarding |
| **Platform admin** | Vendor approval queue · approve/suspend · all orders and invoices · mark paid (bank transfer/cheque) or void · service charge %, minimum and payment terms · GMV and fee revenue |
| **Invoicing** | Sequential numbers `DIL-YYYY-NNNNNN` · per-line VAT (23 / 13.5 / 9 / 0%) · service charge + 23% VAT as a separate line · prices snapshotted at order time · idempotent issue and payment |
| **Payments** | Stripe Checkout with **destination charges**: director pays the total, `application_fee_amount` = service charge + its VAT, remainder transfers to the vendor's Express account · webhook + return-URL reconciliation |

## Stack

- **Next.js 15** (App Router, server actions) on **Cloudflare Workers** via [OpenNext](https://opennext.js.org/cloudflare)
- **PostgreSQL** (Neon, Supabase or any Postgres) reached through **Cloudflare Hyperdrive**
- **Drizzle ORM** + SQL migrations in `drizzle/`
- **Stripe** Connect (Express) + Checkout
- Auth: email/password, PBKDF2-SHA256 via WebCrypto, signed JWT session cookie (`jose`); roles `director`, `vendor`, `admin`
- Tailwind CSS

## Run locally

```bash
npm install
cp .env.example .env.local          # set DATABASE_URL to a local Postgres
npm run db:migrate                  # apply drizzle/ migrations
npm run db:seed                     # demo data (add `-- --reset` to wipe first)
npm run dev                         # http://localhost:3000
```

Demo accounts (password `dilis-demo-2026`): `admin@dilis.ie`, `aoife@kavanagh.ie` (director), `niamh@clondalkinflowers.ie`, `paul@prestigelimos.ie`, `sinead@gatheringtable.ie` (vendors).

Run in the real Workers runtime locally (uses the Hyperdrive `localConnectionString` in `wrangler.jsonc`):

```bash
cp .dev.vars.example .dev.vars
npm run preview                     # http://localhost:8787
```

Tests: `npm test` (unit tests always; the full order→invoice→payment integration test runs when `DATABASE_URL` is set).

## Deploy to Cloudflare

1. **Database** — create a Postgres database (Neon free tier works) and note its connection string.
2. **Migrate** — `DATABASE_URL=<conn> npm run db:migrate`
3. **Hyperdrive** — `npx wrangler hyperdrive create dilis-db --connection-string="<conn>"` and save the returned id as the `HYPERDRIVE_ID` repo secret (or paste it into `wrangler.jsonc` for local deploys).
4. **Secrets**
   ```bash
   npx wrangler secret put AUTH_SECRET            # openssl rand -base64 32
   npx wrangler secret put STRIPE_SECRET_KEY      # sk_test_… then sk_live_…
   npx wrangler secret put STRIPE_WEBHOOK_SECRET  # whsec_… (step 6)
   ```
   Set `APP_URL` in `wrangler.jsonc` `vars` to your public URL.
5. **Deploy** — `npm run deploy` locally, or push to `dilis-portal` with the GitHub Action below.
6. **Stripe** — enable Connect in the dashboard (platform in Ireland, Express accounts). Add a webhook endpoint `https://<your-domain>/api/stripe/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `account.updated` (tick "Listen to events on Connected accounts" for `account.updated`).
7. **First admin** — create one by seeding, or insert a `platform` organization + `admin` user (hash with `hashPassword` from `src/lib/password.ts`).
8. **Custom domain** — add it under Workers → Settings → Domains & Routes.

### GitHub Actions

- `ci.yml` — type-check, tests (against a Postgres service) and Worker build on every push/PR.
- `deploy.yml` — on every push to **`dilis-portal`** (or run manually): migrates the database, then builds and deploys the Worker.

Add these under **Settings → Secrets and variables → Actions** (until they exist, deploy runs are skipped with a warning):

| Name | Type | Value |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | secret | API token with the *Edit Cloudflare Workers* template |
| `CLOUDFLARE_ACCOUNT_ID` | secret | From the Cloudflare dashboard sidebar |
| `DATABASE_URL` | secret | Postgres connection string (used for migrations) |
| `HYPERDRIVE_ID` | secret | Id from `wrangler hyperdrive create` — injected into `wrangler.jsonc` at deploy |
| `APP_URL` | variable | Public URL, e.g. `https://portal.funeraldirector.ie` (optional) |

Worker runtime secrets (`AUTH_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) are set once with `npx wrangler secret put` and persist across deploys.

## How the money works

For an order of €450 hearse hire (23% VAT) with a 10% service charge:

| | |
|---|---|
| Vendor goods | €450.00 |
| VAT on goods | €103.50 |
| Service charge (10%) | €45.00 |
| VAT on service charge | €10.35 |
| **Director pays** | **€608.85** |
| Vendor receives | €553.50 |
| Platform keeps (application fee) | €55.35 *(minus Stripe fees — on destination charges these are paid by the platform)* |

Logic lives in `src/lib/money.ts` and is unit-tested.

## Project layout

```
src/
  app/            routes: /director, /vendor, /admin, /orders/[id], /invoices/[id], /api/stripe/webhook, /api/health
  app/actions.ts  all server actions (auth, cases, orders, rate card, payments, admin)
  db/             Drizzle schema + per-runtime client (Node pool locally, per-request client on Workers)
  lib/domain.ts   business rules: tenancy checks, order lifecycle, invoice issue/pay/void
  lib/stripe.ts   Connect onboarding, Checkout, webhook handling
  lib/money.ts    VAT and service-charge maths
drizzle/          SQL migrations
scripts/seed.ts   demo data
tests/            unit + integration tests
```

## Before going live — open items

- **VAT/legal review.** The platform invoices the director for vendor goods *and* its own service charge on one document. Confirm with an accountant whether you act as agent (disclosed) or principal, and whether vendor lines need the vendor as issuer under Irish VAT rules. Adjust the invoice template accordingly.
- **Email notifications** (new order, status change, invoice issued) — not in v1. Resend or Postmark on Workers is a small addition.
- **Password reset / invites** for multiple staff per funeral home.
- **File uploads** for product photos (currently image URLs) — Cloudflare R2.
- **GDPR**: case data includes the deceased's and family's details; add a retention policy and DPA with vendors.
- Rate limiting on `/login` (Cloudflare WAF rule is the simplest).
