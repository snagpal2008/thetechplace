# Prompt: enhance the funeral-director website (DevOps + web)

Reusable prompt for a Claude Code session on this repository. Paste it as the first message, and change the **Goals** list for the next round of work. The first run of this prompt produced the November 2026 refresh (reviews, death-registration guide, meet the team, livestream, photographs, kinder wording).

---

## The prompt

> You are the DevOps engineer and web developer for this repository (a website for an Irish family funeral director: `site/`, deployed as a Cloudflare Worker with static assets and a D1 database). Read `CLAUDE.md` and `README.md` first and follow them.
>
> **Goal:** a refreshed, warmer website that is in GitHub, tested, and deployed to the Cloudflare preview environment with its database connected.
>
> **Goals for this round**
> 1. Empathy: rewrite wording so it comforts without clichés. Never say anything that dismisses a family's pain (for example “they are in a better place”, “everything happens for a reason”, “at least…”, “I know how you feel”). Use the person's name, not “the deceased” or “the body”. Add a short “how we speak with families” section.
> 2. Real photographs: use only images we may legally use (our own, commissioned, or openly licensed such as CC0 or CC BY / CC BY-SA from Wikimedia Commons), credit every one in `site/IMAGE_CREDITS.md`, and never copy images or text from other funeral homes' websites. Never use stock photos of people as if they were our staff.
> 3. Reviews: families can leave a 1–5 star review; reviews are stored in D1, hidden until a staff member approves them, and shown on the home page and a reviews page with the average rating. Sample reviews must be labelled as samples.
> 4. A plain-English guide to registering a death in Ireland that answers “who usually does the death certificate formalities?”: the doctor, the family (qualified informant) and the funeral director's role; the coroner; the 3-month limit; any civil registration office; certificates.
> 5. Meet the team, livestreaming of funeral Masses, and Irish funeral customs (reposing, removal, “house private”, month's mind) where they help.
>
> Reference sites for ideas (structure and features only, never copy their content): rip.ie death notices, masseybrosfuneralhomes.com “arranging a funeral”, fanagans.ie, churchservices.tv, conradjones.com, brianmcelroy.ie “meet the team”, ballinafuneralhome.ie “death registration”.
>
> **Engineering rules**
> - No frameworks, no npm dependencies, no web fonts. Keep pages fast, accessible and mobile-first.
> - One source of truth: business details in `site/config.json`, form rules in `site/forms.mjs`, database schema in `site/db/schema.sql`.
> - Database changes must work on both local SQLite (`node:sqlite`) and Cloudflare D1, and must be safe to re-run (`CREATE … IF NOT EXISTS`). The Worker creates missing tables itself.
> - Every visitor-supplied text is shown with `textContent`, never as HTML. Moderated content (condolences, reviews) is never published without approval. Email addresses are never published.
>
> **Tests (Node's built-in test runner, `npm test` in `site/`)**
> - Database and validation (`test/store.test.mjs`).
> - The Worker end to end with a real SQLite database standing in for D1 (`test/worker.test.mjs`): health check, every API route, moderation, rate limiting, refused requests.
> - The built website (`test/site.test.mjs`): every page has a title, description and one h1; no broken internal links or images; every image has alt text and dimensions; every form field has a label; banned clichés never appear; the new sections exist; every image is credited.
>
> **Delivery**
> 1. Work on the session's `claude/*` branch, never on `master`.
> 2. Run `npm test` and `node build.mjs` in `site/` and fix every failure.
> 3. Commit with clear messages and push the branch. Cloudflare Workers Builds then builds a preview version.
> 4. Report in plain English: what changed, the test results, the preview link location (Cloudflare → Workers & Pages → thetechplace → Deployments) and `/api/health` to confirm the database. List anything that still needs a human: real photos of the team and premises, real reviews, real business details, legal checks.

---

## Acceptance checklist

- [ ] `npm test` passes (database, Worker and website suites)
- [ ] GitHub Actions CI is green on the pull request
- [ ] Cloudflare preview build succeeded
- [ ] `/api/health` on the preview says `"database": "connected"` with 4 tables
- [ ] A test review submitted on the preview appears only after approval (see `docs/08-hosting.md`)
- [ ] Every photo is listed in `site/IMAGE_CREDITS.md` with its licence
- [ ] Death-registration facts checked against Citizens Information before launch
