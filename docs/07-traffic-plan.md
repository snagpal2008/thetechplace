# 07 · Traffic plan: local SEO, keywords, speed, analytics

Worked example: **Naas, Co. Kildare** (change `site/config.json` for the real town and county).

## 1. Google Business Profile (GBP): the biggest single lever

- Primary category **Funeral home**; secondary categories **Funeral director**, **Crematorium service** (only if offered), **Funeral celebrant service**.
- **One profile per branch**, each with its own address, phone and branch URL (`/contact/#branches`, or later a dedicated branch page).
- Hours: office hours, plus "Open 24 hours" for phone support if GBP policy allows; otherwise say "24-hour phone line" in the description.
- NAP (name, address, phone) **identical** on the website footer, GBP, RIP.ie profile, IAFD directory, Golden Pages and Facebook.
- Photos: 10+ real photos (exterior, interior, team, arrangement room, chapel). Add new ones monthly.
- **Reviews:** a post-funeral aftercare email at 4–6 weeks with a direct review link (never sooner). Reply to every review, briefly and personally. Never offer incentives.
- Posts: remembrance service, opening hours over Christmas, new pre-planning guide.
- GBP Q&A: seed real FAQs (parking, livestreaming, costs).

## 2. On-site technical SEO (built)

| Item | Where |
|---|---|
| `FuneralHome` JSON-LD (name, address, geo, opening hours, 24/7 emergency `contactPoint`, `memberOf` IAFD, areaServed) | `partials/head.html` (every page) |
| `FAQPage` JSON-LD | `/faqs/` |
| Unique `<title>` and meta description on every page, written for the town and county | each page |
| Canonical URLs, `sitemap.xml` (auto-generated), `robots.txt` | build |
| Location page `/funeral-directors-naas/` | template for each town served |
| Semantic HTML, one H1 per page, logical heading order | Lighthouse SEO 100 |
| `noindex` on sample/demo pages | sample notice |
| **To add at launch:** `BreadcrumbList` schema; an `Event` or `Article` per funeral notice (check RIP.ie overlap); a `Person` schema for staff pages | 📝 |

**Location pages:** one per town or parish served (for example Naas, Kill, Clane, Sallins, Johnstown, Newbridge, Kilcullen), each with **unique** content: churches and cemeteries, the crematorium used, directions, and testimonials from that area. 400–700 words, never spun copies of each other.

**Content calendar (1 article a month):** "What happens when someone dies at home in Kildare"; "Funeral costs in Kildare this year"; "How to write a death notice for RIP.ie"; "Removal, wake and Mass: an Irish funeral explained"; "Direct cremation in Ireland: what it is and what it costs"; "Bringing someone home from abroad".

## 3. Keyword list: Co. Kildare

Intent: 🔴 urgent / 🟠 researching / 🟢 planning / 🔵 notices

| Keyword | Intent | Target page |
|---|---|---|
| funeral directors naas | 🔴 | /funeral-directors-naas/, Home |
| undertakers naas | 🔴 | /funeral-directors-naas/ |
| funeral home naas | 🔴 | Home, /contact/ |
| funeral directors kildare / co kildare | 🔴 | Home |
| undertakers near me (local pack) | 🔴 | GBP + Home |
| 24 hour funeral director kildare | 🔴 | /someone-has-died/ |
| what to do when someone dies ireland | 🔴 | /someone-has-died/ |
| what to do when someone dies at home ireland | 🔴 | /someone-has-died/#home |
| sudden death coroner ireland what happens | 🟠 | /someone-has-died/, /faqs/ |
| funeral costs ireland / kildare | 🟠 | /prices/ |
| how much does a funeral cost in ireland | 🟠 | /prices/#guide |
| cost of a grave kildare | 🟠 | /prices/#guide |
| cremation cost ireland | 🟠 | /prices/#cremation |
| direct cremation ireland / kildare | 🟠 | /services/#direct-cremation |
| cheap / simple funeral kildare | 🟠 | /prices/#direct |
| humanist funeral kildare | 🟠 | /services/#non-religious |
| repatriation of remains ireland | 🟠 | /services/#repatriation |
| exceptional needs payment funeral | 🟠 | /prices/ (help with costs) |
| pre-paid funeral plan ireland | 🟢 | /pre-planning/ |
| plan my own funeral ireland | 🟢 | /pre-planning/ |
| funeral cost calculator ireland | 🟢 | /pre-planning/#calculator |
| death notices naas / kildare | 🔵 | /funeral-notices/ |
| rip naas / rip.ie kildare | 🔵 | /funeral-notices/ (+ RIP.ie listing) |
| how to write a death notice | 🔵 | /funeral-notices/submit/ + article |
| bereavement support kildare | 🟠 | /support/ |
| funeral directors clane / kill / sallins / newbridge / kilcullen | 🔴 | town pages |

Validate volumes in Google Keyword Planner or Search Console after launch. Volumes are small locally, so intent matters more than volume.

## 4. Page-speed targets

| Metric (mobile, 4G throttled) | Target | Measured on this build (Lighthouse 12.2.1, local) |
|---|---|---|
| Lighthouse Performance | **≥ 90** | **100** on all 12 pages tested |
| Lighthouse Accessibility / Best practices / SEO | ≥ 95 | **100 / 100 / 100** (the sample notice is SEO 66 by design: `noindex`) |
| Largest Contentful Paint | < 2.5 s | 0.9–1.3 s |
| Cumulative Layout Shift | < 0.1 | 0 |
| Total Blocking Time / INP | < 200 ms | 0–40 ms |
| Total page weight (home) | < 500 KB | ≈ 27 KB transferred on first load (gzip) |

How: no framework or web fonts; one CSS and one deferred JS file; WebP responsive images with dimensions; a preloaded hero; gzip; and long-cache headers for assets. **Keep it that way:** any third-party widget (reviews, chat, maps) must load on interaction or after consent. Run Lighthouse CI on every deploy.

## 5. Analytics setup (consent-first)

- **Consent:** analytics loads only after "Accept" in the cookie banner (`main.js` → `apply()`). Set the GA4 measurement ID in `layout.html` → `<html data-ga="G-XXXX">`. Alternative: **Plausible** or **Matomo** (cookieless, EU-hosted), which may not need a banner. Discuss with your DPO.
- **Google Consent Mode v2:** not needed while GA loads only after opt-in. If Google Ads is added later, add Consent Mode v2 with every signal defaulting to `denied`.
- **Key events** (already wired):
  - `click_to_call`: every `tel:` link, with the page
  - `form_submit`: with `form_id` (callback, first-notification, quote, preplanning, death-notice, condolence, appointment, feedback, newsletter)
- **Mark as conversions:** `click_to_call`, `form_submit` for first-notification, callback, arrangement-enquiry, quote and preplanning.
- **Search Console:** verify the domain, submit `sitemap.xml`, watch queries per town page.
- **GBP Insights:** calls, direction requests, website clicks, each month.
- **Call tracking** (optional): a dynamic number pool would break NAP consistency, so use GBP "call" stats and a UTM link (`?utm_source=gbp`) on the GBP website button instead.
- **Monthly report:** sessions by landing page, calls and forms by source, GBP actions, new reviews and rating, Core Web Vitals (Search Console). **Never** record or report personal data from form contents.

## 6. Off-site and links

- IAFD member directory listing; RIP.ie funeral-director profile; parish newsletters; local GAA and community sponsorships (link from their site); local hospice partnerships; Kildare Leader / Kildare Nationalist articles on the remembrance service.
- Citations: Golden Pages, Yelp IE, Bing Places, Apple Business Connect.
