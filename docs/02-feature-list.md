# 02 · Feature list

Status key: ✅ built in this repo · 🔌 built as a stub, to connect to Dílis · 📝 specified, not built yet

## Must-have (launch)

| Feature | Notes | Status |
|---|---|---|
| **Immediate-help "Someone has died" page** | Click-to-call above the fold; steps by place of death (home / hospital, nursing home, hospice / sudden death: 112/999, Gardaí, coroner); registration within 3 months; first-notification form | ✅ `/someone-has-died/` |
| 24/7 number on every page | Top bar + sticky mobile call bar + footer; `tel:` links; clicks tracked as `click_to_call` (with consent) | ✅ |
| Services | Burial, cremation, direct cremation, humanist and non-religious, repatriation, aftercare | ✅ `/services/` |
| **Pricing transparency** | Itemised tables for our fees per package; third-party costs passed on at cost; **Irish price guide** (graves, crematorium, church offering, RIP.ie, papers, flowers, limousine, certificates); help with costs (Exceptional Needs Payment) | ✅ `/prices/` (sample figures) |
| Death notices + **RIP.ie** link | Notice list, search/filter, single notice page, "View on RIP.ie"; family approval before publishing | ✅ / 🔌 list fed by Dílis |
| Condolence / tribute book with moderation | Messages held as `pending`, published after approval; emails never shown | ✅ / 🔌 (`moderate.mjs` locally) |
| Branches, map, opening hours | Two branches; OpenStreetMap that loads only on request (no third-party cookies by default); directions link | ✅ `/contact/` |
| Contact / urgent call-back | Routed by reason; 15-minute SLA for deaths | ✅ |
| Trust signals | IAFD membership, family story and founding year, team, reviews, written-estimate promise | ✅ (placeholders for photos and reviews) |
| **Accessibility, WCAG 2.2 AA** | Contrast ≥ 4.5:1, focus outline, skip link, labelled fields, errors in text, 44 px targets, reduced motion, no focus traps; accessibility statement | ✅ Lighthouse a11y 100 |
| **Cookie / GDPR consent** | Analytics opt-in only; "Essential only" as prominent as "Accept"; reopen from the footer; privacy and cookie notices | ✅ |
| Mobile-first and fast | No frameworks or web fonts; WebP responsive images; lazy loading below the fold | ✅ Lighthouse perf 100 |
| Local SEO foundations | `FuneralHome` JSON-LD, canonical URLs, sitemap, robots.txt, town page | ✅ |
| Form spam protection | Honeypot, minimum fill time, per-IP rate limit, server-side validation | ✅ |

## Should-have (within 3 months)

| Feature | Notes | Status |
|---|---|---|
| **Pre-need planning calculator** | Live ranges; "send me this estimate" pre-fills the enquiry | ✅ `/pre-planning/` |
| FAQs with `FAQPage` schema | 9 questions, Irish context | ✅ `/faqs/` |
| Bereavement support resources | Samaritans, Pieta, Irish Hospice Foundation, Barnardos, HSE, Citizens Information | ✅ `/support/` |
| Staff pages | Team grid now; individual profiles later | ✅ grid / 📝 profiles |
| Appointment booking | Request a slot; confirmed by staff | ✅ / 🔌 calendar sync |
| Quote request | Itemised estimate within 1 working day | ✅ |
| Feedback / complaints | Goes to the MD; published complaints process | ✅ |
| Grief-support letter sign-up | Double opt-in; 1, 3, 6 and 12-month letters | ✅ / 🔌 email platform |
| Live Google reviews feed | Places API, cached daily | 📝 |
| Multilingual-ready | `lang="en-IE"`, hreflang slots, all strings in templates, config-driven; Irish (`/ga/`) pages next | ✅ ready / 📝 translations |
| Additional town pages | One per town served, with genuinely local content | ✅ template / 📝 content |
| Live-stream links on notices | Per-notice field | 📝 |

## Later (Dílis integration and beyond)

| Feature | Notes |
|---|---|
| **Kin portal** | Family login to see the arrangement, documents, the estimate and invoice, and to approve notice wording |
| **Vendor hub** | Florists, printers, celebrants, caterers receive orders and confirm |
| **Online payment** | Deposits and final account (card / Open Banking); payment plans for pre-need |
| Online arrangement builder | Choose coffin, flowers and music with live pricing |
| Online donations "in lieu" | Per notice, paid to the charity |
| Memorial pages | Photo galleries, anniversaries, candle lighting |
| Irish-language site | Full `/ga/` mirror for key pages |
| WhatsApp / SMS updates | Opt-in updates for the next of kin |
