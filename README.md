# Dílis — B2B portal for funeral directors (Google Cloud / PostgreSQL)

*Dílis — faithful to every family.* A FuneralDirector.ie product.

Funeral directors open a case, order services from vetted vendors (florists, limousines, caterers, printers, embalmers, celebrants…), talk to the vendor on the order, and get one clear invoice they can pay by card. Vendors are paid out through Stripe Connect; the platform keeps a configurable service charge.

> **Branches**
> - `dilis-portal-postgres` — **this one.** PostgreSQL, packaged as a container for **Google Cloud Run + Cloud SQL**. Production target.
> - `dilis-portal` — same app on Cloudflare Workers + D1. Used for the demo site.

## What's in v1

| Area | Features |
|---|---|
| **Funeral directors** | Funeral cases · marketplace by category/search · order builder with live totals · order tracking · per-order conversation · invoices with card payment · printable invoices |
| **Vendors** | Rate card (price, unit, VAT rate, photo) · accept/decline/progress/deliver orders · delivery auto-issues the invoice · payout view · Stripe Connect onboarding |
| **Platform admin** | First-run setup (protected by a setup code) · vendor approval · all orders and invoices · mark paid / void · service charge %, minimum and payment terms · GMV and fee revenue |
| **Invoicing** | Sequential numbers `DIL-YYYY-NNNNNN` · per-line VAT (23 / 13.5 / 9 / 0%) · service charge + 23% VAT as its own line · prices snapshotted at order time · idempotent issue and payment |
| **Payments** | Stripe Checkout destination charges: director pays the total, platform keeps service charge + VAT, the rest goes to the vendor |

**Stack:** TypeScript · Next.js 15 (standalone Node server) · PostgreSQL 16 · Drizzle ORM · Stripe Connect · Tailwind.

## Architecture on Google Cloud

```
GitHub push ──► GitHub Actions ──(keyless OIDC)──► Artifact Registry (image)
                                                  ├─► Cloud Run Job  "dilis-migrate"  (applies drizzle/ migrations)
                                                  └─► Cloud Run      "dilis-portal"   (0–5 instances, europe-west1)
                                                            │ unix socket
                                                            ▼
                                                     Cloud SQL Postgres 16  ◄── Secret Manager
                                                     (daily backups + PITR)     (DATABASE_URL, AUTH_SECRET,
                                                                                 SETUP_TOKEN, STRIPE_*)
```

## Deploy (about 20 minutes, mostly waiting for Cloud SQL)

1. **Google Cloud project** — console.cloud.google.com → create a project (e.g. `dilis-prod`) and link a billing account.
2. **Run the setup script** — open **Cloud Shell** (the `>_` icon, top right) and run:
   ```bash
   git clone -b dilis-portal-postgres https://github.com/snagpal2008/thetechplace dilis && cd dilis
   PROJECT_ID=dilis-prod GITHUB_REPO=snagpal2008/thetechplace bash infra/gcp-setup.sh
   ```
   It creates the database, secrets, service accounts and keyless GitHub access, then prints five values and a **setup code**. It's safe to re-run.
3. **GitHub variables** — repo → Settings → Secrets and variables → Actions → **Variables** tab → add `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_WIF_PROVIDER`, `GCP_DEPLOY_SA`, `GCP_SQL_INSTANCE` exactly as printed. (These are identifiers, not secrets — no keys are stored in GitHub.)
4. **Deploy** — Actions → *Deploy to Google Cloud* → *Run workflow* (or push to `dilis-portal-postgres`). It builds the image, migrates the database, deploys and health-checks. The run summary shows the URL.
5. **First visit** — `https://<url>/setup`, enter the setup code, create the admin account, optionally load demo data. The page locks once an admin exists.

Optional:
- **Custom domain** — Cloud Run → `dilis-portal` → *Manage custom domains* (or a load balancer for apex domains). Then set repo variable `APP_URL`.
- **Stripe** — `printf '%s' sk_live_… | gcloud secrets create STRIPE_SECRET_KEY --data-file=-` (same for `STRIPE_WEBHOOK_SECRET`) and redeploy; the workflow attaches them automatically. Webhook URL: `https://<url>/api/stripe/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `account.updated`.
- **Demo-only cost saving** — `SQL_TIER=db-f1-micro` when running the setup script.

## Sizing: 50 funeral directors, 1,000 vendors

| | Setting | Why |
|---|---|---|
| Cloud Run | 1 vCPU, 512 MiB, 0–5 instances, 80 concurrent requests each | Peak load at this scale is a few requests/second; one instance handles it, five give ample headroom |
| DB pool | 5 per instance (`DB_POOL_MAX`) → max 25 connections | `db-g1-small` allows ~50 |
| Cloud SQL | `db-g1-small`, 10 GB SSD auto-growing, daily backups (14 kept) + point-in-time recovery | Data stays well under 1 GB for years |
| Region | `europe-west1` (Belgium) | EU data residency; `europe-west2` (London) also fine |

**Approximate monthly cost:** Cloud SQL `db-g1-small` ~€25–30 · Cloud Run €0–10 (scales to zero) · Artifact Registry/Secrets < €1. Set `--min-instances 1` in the workflow (~€10–15 more) to avoid a 2–3 s cold start after idle periods.

When to scale up: move Cloud SQL to `db-custom-1-3840` (dedicated core) and `--availability-type=regional` (HA) once you have paying customers relying on it.

## Run locally

```bash
npm install
cp .env.example .env.local        # DATABASE_URL to a local Postgres
npm run db:migrate
npm run db:seed                   # demo data; or open /setup
npm run dev                       # http://localhost:3000
```

Tests: `npm test` (unit tests; the full order → invoice → payment test runs when `DATABASE_URL` is set).
Container locally: `docker build -t dilis . && docker run -p 8080:8080 -e DATABASE_URL=… -e AUTH_SECRET=… dilis`.
Schema change: edit `src/db/schema.ts` → `npm run db:generate` → commit `drizzle/`; the deploy's migration job applies it.

CI (`ci.yml`) runs type-check, tests against Postgres, `next build`, **and builds the production image, runs the migration in it and health-checks the container** on every push.

## How the money works

For a €450 hearse hire (23% VAT) with a 10% service charge: vendor goods €450.00 + VAT €103.50 + service charge €45.00 + its VAT €10.35 = **€608.85 paid by the director**; the vendor receives €553.50 and the platform keeps €55.35 (minus Stripe fees). Logic and tests: `src/lib/money.ts`.

## Project layout

```
src/app/          routes: /setup, /director, /vendor, /admin, /orders/[id], /invoices/[id], /api/stripe/webhook, /api/health
src/app/actions.ts  server actions
src/db/           Drizzle schema + Postgres pool
src/lib/          domain rules, demo data, Stripe, money maths
drizzle/          SQL migrations
scripts/          migrate.mjs (runs in the container), seed.ts (local)
infra/            gcp-setup.sh (one-time Google Cloud setup)
Dockerfile        production image (Next.js standalone, non-root, port 8080)
```

## Before going live — open items

- **VAT/legal review** of the combined invoice (agent vs principal; whether vendor lines need the vendor as issuer).
- **Email notifications**, **password reset / staff invites**, **photo uploads** (Cloud Storage) — not in v1.
- **GDPR**: retention policy for case data; DPA with vendors.
- Rate limiting on `/login` (Cloud Armor, or a small in-app limiter).
