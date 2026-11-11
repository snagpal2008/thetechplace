# CLAUDE.md

Rules for Claude sessions working in this repo. The owner may write in Hindi, English or Hinglish. **Always reply in English only**, short and simple, with clear numbered steps.

## How changes go live

```
Claude edits → push to a claude/* branch → Cloudflare builds a preview URL
→ owner checks the preview → PR merged into master → Cloudflare deploys to the live domain
```

- `master` = the live website. **Never push to `master` directly.** Work on the session's branch and push there.
- Merging to `master` publishes the site. Open or merge a PR only when the owner asks.
- Cloudflare Workers Builds deploys automatically (root `site`, build `node build.mjs`, deploy `npx wrangler deploy`). There is no manual deploy step for Claude to run.
- GitHub Actions (`.github/workflows/ci.yml`) runs the tests and both builds on every PR. Do not merge a PR with a red check.

## Before every push

Run these from `site/` and fix anything that fails:

```bash
npm test
```

```bash
node build.mjs
```

Then tell the owner, in plain words: what changed, which files, that the tests passed, and to check the preview (Cloudflare dashboard → Workers & Pages → thetechplace → Deployments) before merging.

## Project map

- `site/config.json`: business name, phone, town, prices. Every `{{token}}` in `site/src/` comes from here. Change details here, not in the pages.
- `site/src/`: the pages, plus `partials/` (layout, header, footer) and `assets/` (CSS, JS, images)
- `site/build.mjs`: turns `src/` into `dist/` (the folder that is deployed). `dist/` and `dist-static/` are build output, so don't edit or commit them.
- `site/forms.mjs`: form fields and validation. `site/db/`: SQL schema and queries shared by the local server and Cloudflare D1.
- `site/worker.js`, `site/functions/`: the Cloudflare Worker (forms API on D1). `site/server.mjs`: the local server (`npm start`, http://localhost:8080).
- `site/wrangler.toml`: the Cloudflare config. Don't change the Worker `name` or `database_id` unless the owner asks.
- `docs/`: requirements and the hosting guide (`docs/08-hosting.md`).

## Style

- No frameworks, no npm dependencies, no web fonts, and no third-party scripts without consent. Keep pages fast and mobile-first.
- Keep changes small and focused on what was asked. One idea per branch/PR.
- Never commit secrets (API keys, webhook URLs). They go in Cloudflare → Worker → Settings → Variables and Secrets.
