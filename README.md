# Dílis — B2B portal for funeral directors

*Dílis — faithful to every family.* A FuneralDirector.ie product.

Funeral directors open a case, order services from vetted vendors (florists, limousines, caterers, printers, embalmers, celebrants…), talk to the vendor on the order, and get one clear invoice they can pay by card. Vendors are paid out directly through Stripe Connect; the platform keeps a configurable service charge.

> **Branches**
> - `dilis-portal` — **this one.** Cloudflare Workers + **D1** (serverless SQLite). Deploys automatically; no database server to run. Used for the demo site.
> - `dilis-portal-postgres` — same app on **PostgreSQL**. The starting point for a Google Cloud (Cloud Run + Cloud SQL) production deployment — see [Moving to Google Cloud](#moving-to-google-cloud).

## What's in v1

| Area | Features |
|---|---|
| **Funeral directors** | Funeral cases (deceased, date, venue, family contact) · marketplace by category/search · order builder with live totals · order tracking · per-order conversation · invoices with card payment · printable invoices |
| **Vendors** | Rate card (price, unit, VAT rate, photo) · accept/decline/progress/deliver orders · delivery auto-issues the invoice · payout view · Stripe Connect onboarding |
| **Platform admin** | First-run setup · vendor approval queue · approve/suspend · all orders and invoices · mark paid (bank transfer/cheque) or void · service charge %, minimum and payment terms · GMV and fee revenue |
| **Invoicing** | Sequential numbers `DIL-YYYY-NNNNNN` · per-line VAT (23 / 13.5 / 9 / 0%) · service charge + 23% VAT as a separate line · prices snapshotted at order time · idempotent issue and payment |
| **Payments** | Stripe Checkout with **destination charges**: director pays the total, `application_fee_amount` = service charge + its VAT, remainder transfers to the vendor's Express account · webhook + return-URL reconciliation |

## Stack

- **TypeScript** throughout · **Next.js 15** (App Router, server actions) on **Cloudflare Workers** via [OpenNext](https://opennext.js.org/cloudflare)
- **Cloudflare D1** + **Drizzle ORM**; SQL migrations in `drizzle/`
- **Stripe** Connect (Express) + Checkout
- Auth: email/password, PBKDF2-SHA256 via WebCrypto, signed JWT session cookie (`jose`); roles `director`, `vendor`, `admin`
- Tailwind CSS

## Deploy (GitHub → Cloudflare, about 5 minutes)

1. **Cloudflare API token** — dash.cloudflare.com → My Profile → API Tokens → *Create Token* → template **Edit Cloudflare Workers**, then **add permission `Account · D1 · Edit`** → create.
2. **Account ID** — shown in the Cloudflare dashboard sidebar (Workers & Pages → Overview).
3. **workers.dev subdomain** — if you've never used Workers, open Workers & Pages once and accept the free `*.workers.dev` subdomain.
4. **GitHub secrets** — repo → Settings → Secrets and variables → Actions → *New repository secret*:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
5. **Run** — Actions → *Deploy to Cloudflare* → *Run workflow* (or push to `dilis-portal`).
   The workflow creates the `dilis-db` D1 database (EU region), applies migrations, deploys the Worker and generates `AUTH_SECRET`. The run summary shows the site URL.
6. **First visit** — open `https://<site>/setup`: create your admin account and optionally load demo data. The setup page locks itself once an admin exists.

Optional:
- `APP_URL` *(repo variable)* — your custom domain, e.g. `https://portal.funeraldirector.ie`. Otherwise the URL is taken from each request.
- Stripe — `npx wrangler secret put STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Enable Connect (platform in Ireland, Express accounts) and add a webhook to `https://<site>/api/stripe/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `account.updated` (tick "Connected accounts" for the last one). Until then invoices are settled by bank transfer and marked paid by the admin.
- Custom domain — Workers & Pages → `dilis-portal` → Settings → Domains & Routes.

`ci.yml` type-checks, tests and builds on every push; `deploy.yml` deploys on push to `dilis-portal` and skips with a warning until the two secrets exist.

## Run locally

```bash
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local     # create tables in the local D1
npm run preview              # build + run in workerd at http://localhost:8787 → /setup
```

For hot-reload: `npm run dev` (uses the same local D1 through `initOpenNextCloudflareForDev`).

Tests: `npm test` — unit tests plus a full order→invoice→payment run on in-memory SQLite with the real migrations.
Plain-SQLite demo DB for scripts: `SQLITE_URL=file:./local.db npm run db:migrate:file && npm run db:seed`.

Schema change: edit `src/db/schema.ts` → `npm run db:generate` → commit the new file in `drizzle/`; the deploy applies it.

## How the money works

For a €450 hearse hire (23% VAT) with a 10% service charge:

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

## Capacity: 50 funeral directors, 1,000 vendors

Comfortably within the free/entry tiers.

| | Estimate at that scale | Limit |
|---|---|---|
| Requests | ~20–50k/day at busy periods | Workers free: 100k/day; paid ($5/mo): 10M/month included |
| Database size | < 200 MB after several years (≈30k orders/yr) | D1: 500 MB free, 10 GB per database paid |
| D1 reads/writes | well under 1M reads, 50k writes/day | Free: 5M reads, 100k writes/day |

All list views are indexed by owner and status. Atomicity on D1 comes from batched writes, single-statement counters and conditional (optimistic) status updates, so concurrent vendors can't double-deliver an order or double-issue an invoice. **Recommendation:** move to Workers Paid ($5/month) before real customers — higher CPU limits and no daily caps.

## Moving to Google Cloud

The `dilis-portal-postgres` branch runs on any Node host with PostgreSQL. On Google Cloud:

1. **Project** — `gcloud projects create dilis-prod && gcloud config set project dilis-prod`; enable `run`, `sqladmin`, `artifactregistry`, `secretmanager`, `cloudbuild` APIs.
2. **Database** — Cloud SQL for PostgreSQL 16, region `europe-west1` (Belgium) or `europe-west2` (London), `db-g1-small` (~€25/mo) is ample for this scale; enable automated backups + point-in-time recovery.
3. **Secrets** — Secret Manager: `DATABASE_URL`, `AUTH_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
4. **Container** — add a `Dockerfile` using Next.js `output: "standalone"`; build with Cloud Build into Artifact Registry.
5. **Run** — Cloud Run service in the same region, `--add-cloudsql-instances`, min instances 0–1, max 5; map your domain.
6. **CI/CD** — GitHub Actions with Workload Identity Federation (no keys): build → `drizzle-kit migrate` → `gcloud run deploy`.

Ask and the Dockerfile + workflow can be added to that branch. Data can be moved from D1 with `wrangler d1 export dilis-db --remote` and a small import script.

## Project layout

```
src/
  app/            routes: /setup, /director, /vendor, /admin, /orders/[id], /invoices/[id], /api/stripe/webhook, /api/health
  app/actions.ts  all server actions (setup, auth, cases, orders, rate card, payments, admin)
  db/             Drizzle schema + client (D1 on Workers, libsql in Node scripts/tests)
  lib/domain.ts   business rules: tenancy checks, order lifecycle, invoice issue/pay/void
  lib/demo.ts     demo data used by /setup and the seed script
  lib/stripe.ts   Connect onboarding, Checkout, webhook handling
  lib/money.ts    VAT and service-charge maths
drizzle/          SQL migrations (applied by wrangler to D1)
scripts/seed.ts   local demo data
tests/            unit + integration tests
```

## Before going live — open items

- **VAT/legal review.** The platform invoices the director for vendor goods *and* its own service charge on one document. Confirm with an accountant whether you act as agent (disclosed) or principal, and whether vendor lines need the vendor as issuer under Irish VAT rules.
- **Email notifications** (new order, status change, invoice issued) — not in v1. Resend or Postmark from Workers is a small addition.
- **Password reset / staff invites** for multiple users per funeral home.
- **Photo uploads** (currently image URLs) — Cloudflare R2.
- **GDPR**: case data includes the deceased's and family's details; add a retention policy and DPA with vendors. D1 is created in the EU (`weur`).
- **Backups**: D1 Time Travel restores to any point in the last 30 days (paid plan); add a scheduled `wrangler d1 export` for off-site copies.
- Rate limiting on `/login` (Cloudflare WAF rule).
