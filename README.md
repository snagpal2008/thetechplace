# Funeral-home website: requirements pack and build

A calm, mobile-first, fast website for a local Irish funeral director, built to rank in local search and to connect later to the **Dílis** platform (kin portal, vendor hub, online payment).

> **Sample details.** The funeral home's name, town, phone numbers and prices are **placeholders** ("Hawthorn Family Funeral Directors", Naas, Co. Kildare). Change them in one place, `site/config.json`, and rebuild.

## Run it locally

Requires Node 18+ (no npm packages needed) and, only to regenerate images, Python 3 with Pillow.

```bash
cd site
```

```bash
npm start
```

Then open http://localhost:8080. Form submissions are saved to `site/data/*.jsonl`, and the console logs who would be notified.

```bash
node moderate.mjs
```

lists condolence messages waiting for approval; `node moderate.mjs approve <id>` publishes one.

## What's here

| Deliverable | Where |
|---|---|
| Research: UK funeral websites (verified live, 7 Nov 2026) | [docs/01-research-uk-funeral-sites.md](docs/01-research-uk-funeral-sites.md) |
| **A.** Feature list (Must / Should / Later) | [docs/02-feature-list.md](docs/02-feature-list.md) |
| **B.** Forms inventory (10 forms) | [docs/03-forms-inventory.md](docs/03-forms-inventory.md) |
| **C.** Workflow per form (flow diagrams) | [docs/04-form-workflows.md](docs/04-form-workflows.md) |
| **D.** Sitemap and wireframes | [docs/05-sitemap-and-wireframes.md](docs/05-sitemap-and-wireframes.md) |
| **E.** Images: shot list, rules, credits | [docs/06-images-shot-list.md](docs/06-images-shot-list.md), [site/IMAGE_CREDITS.md](site/IMAGE_CREDITS.md) |
| **F.** Traffic plan: GBP, schema, keywords, speed, analytics | [docs/07-traffic-plan.md](docs/07-traffic-plan.md) |
| The website (21 pages) | [site/src/](site/src/) |

## How the site is built

```
site/
  config.json          ← business details; every {{token}} in src/ is filled from here
  build.mjs            ← src/ → dist/: layout + partials + tokens + sitemap.xml
  server.mjs           ← static server + POST /api/forms/:id (validation, honeypot, rate limit)
  forms.mjs            ← form schemas: fields, validation, owner, SLA, retention
  moderate.mjs         ← condolence moderation (local stand-in for Dílis)
  src/partials/        ← layout, head (FuneralHome JSON-LD), header, footer, consent, form guard
  src/assets/          ← style.css, main.js, generated WebP images
tools/generate-images.py ← draws the CC0 placeholder artwork (3 sizes each)
```

- **No frameworks, no web fonts, no third-party scripts by default.** Analytics loads only after cookie consent, and the map only on request.
- **Quality checks run on this build:** Lighthouse mobile scored 100 for performance, accessibility, best practices and SEO on the 12 key pages; there were no console errors and no horizontal scroll at phone width; all form paths were tested end to end.
- **Dílis hand-off:** replace the `appendFile` in `server.mjs → handleForm` with a POST to the Dílis intake API. The payload is already the validated record, with owner, SLA and retention.

## Before launch

- [ ] Real details in `config.json`; rename `src/funeral-directors-naas/` to match `townSlug`
- [ ] Real prices and the Irish price guide checked against local suppliers
- [ ] Replace placeholder story, team, reviews and images (see the shot list)
- [ ] Privacy notice reviewed by a DPO; GA4 ID in `layout.html` (`data-ga`)
- [ ] Check every support helpline and link
- [ ] Connect the forms to Dílis; set up the email/SMS alerts and SLA escalation
