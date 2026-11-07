# 08 · Hosting for free: Cloudflare Pages + D1 (SQLite)

**Cost: €0.** Cloudflare's free plan includes static hosting with unlimited bandwidth, free HTTPS, 100,000 form/API requests a day, and a 5 GB D1 database (D1 is hosted SQLite). The only thing you will eventually pay for is your own domain name (about €10–30 a year).

| | Local (`npm start`) | Cloudflare (live) |
|---|---|---|
| Pages | `dist/`, served by `server.mjs` | `dist/`, served by Cloudflare |
| Forms | `server.mjs` → `forms.mjs` validation | `functions/api/forms/[id].js` → the **same** `forms.mjs` |
| Database | `data/funeral.db` (node:sqlite) | D1 database `funeral-db` |
| Schema | `db/schema.sql` | the **same** `db/schema.sql` |
| Queries | `db/store.mjs` | the **same** `db/store.mjs` |

## One-time setup (about 15 minutes, all in a web browser)

1. **Create a free account** at dash.cloudflare.com.
2. **Create the database.** Go to *Storage & Databases → D1 → Create*, name it `funeral-db`, and create it. Open its **Console** tab, paste the whole of `site/db/schema.sql`, and run it.
3. **Connect the site.** Go to *Workers & Pages → Create → Pages → Connect to Git*, choose `snagpal2008/thetechplace`, and enter:
   - Production branch: `master`
   - Root directory: `site`
   - Build command: `node build.mjs`
   - Build output directory: `dist`
   - Environment variable: `NODE_VERSION` = `22`
4. **Bind the database.** In the new Pages project, go to *Settings → Bindings → Add → D1 database*. Set the variable name to `DB` and the database to `funeral-db`.
5. **Add the rate-limit secret.** Go to *Settings → Variables and secrets → Add*, type **Secret**, name `RATE_LIMIT_SECRET`, value: any long random text (for example, 40 random letters and numbers). It keys the hash used for per-visitor rate limiting, so visitors' IP addresses are never stored. Save, then *Deployments → Retry deployment*.
6. The site is live at **`https://<project-name>.pages.dev`**, and every merge to `master` redeploys it automatically.

## Form alerts to Gmail (free)

Every form except condolences sends an email to **snagpal2008@gmail.com** through a small Google Apps Script that runs under that Gmail account (`tools/gmail-alert.gs`; the setup steps are at the top of that file):

- **Urgent forms** (someone has died, call-back requests) get a 🔴 subject line with the caller's **name and phone**, so you can ring back within 15 minutes.
- Other forms include the name, contact details and reference. Free-text messages are **not** emailed: read them in the database.
- The script checks a secret key in its URL, so nobody else can send emails through it.
- Set the script's URL (including `?key=…`) as the Pages secret `ALERT_WEBHOOK_URL`.
- Tip: in the Gmail app, give the "Website alerts" sender its own notification sound, so urgent forms are heard at night.

## Day-to-day admin

| Task | Command (run from `site/`, after `npx wrangler login`) |
|---|---|
| See open requests | `npx wrangler d1 execute funeral-db --remote --command "SELECT substr(id,1,8) ref, form, respond_by, json_extract(data,'$.name') name FROM submissions WHERE status='new' ORDER BY respond_by"` |
| Mark one as dealt with | `npx wrangler d1 execute funeral-db --remote --command "UPDATE submissions SET status='contacted' WHERE id LIKE 'ab12cd34%'"` |
| Condolences waiting | `npx wrangler d1 execute funeral-db --remote --command "SELECT substr(id,1,8), notice, name, message FROM condolences WHERE status='pending'"` |
| Approve a condolence | `npx wrangler d1 execute funeral-db --remote --command "UPDATE condolences SET status='approved', moderated_at=datetime('now') WHERE id LIKE 'ab12cd34%'"` |
| Monthly GDPR clean-up | `npx wrangler d1 execute funeral-db --remote --file=db/purge.sql` |

You can also run any of these SQL lines in the D1 **Console** tab in the dashboard, with no command line needed. Locally, the same jobs are `npm run admin -- queue | pending | approve <id> | export <form> | purge`.

There is deliberately **no admin web page** on the public site: no login means nothing to break into. A proper staff screen belongs in Dílis.

## Security settings to turn on (free)

- Per-visitor rate limiting (10 form posts per 10 minutes) is **built in**: it uses the `rate_hits` table, holds only a daily-rotated keyed hash of the IP address, and deletes entries after an hour. Set `RATE_LIMIT_SECRET` (step 5).
- Optional extra: *Security → WAF → Rate limiting rules* (the free plan includes one rule) to stop floods before they reach the function.
- *SSL/TLS:* "Full (strict)" and "Always use HTTPS" (on by default for `pages.dev`).
- Optional later: **Cloudflare Turnstile** (free, no puzzles) on the condolence and newsletter forms if spam appears.
- Security headers are already set in `site/src/_headers`.

## Your own domain (when you're ready to pay ~€10–30 a year)

Buy the domain (for a `.ie`, from an IE Domain Registry-accredited registrar), then go to *Pages project → Custom domains → Set up a domain*. If the domain's DNS is on Cloudflare (free), it is a single click. HTTPS stays free. Then set `"domain"` in `site/config.json` to the new address so the canonical links, sitemap and schema use it.

## Alternative: GitHub Pages (pages only, no forms)

`.github/workflows/deploy-pages.yml` can publish a static copy to `https://snagpal2008.github.io/thetechplace/`. Forms cannot work there because there is no server or database, so use it only as a preview.
