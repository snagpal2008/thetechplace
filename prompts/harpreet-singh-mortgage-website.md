# Prompt: Personal website for Harpreet Singh, Mortgage Professional

> Paste everything below the line into the **Realtor** project. Before pasting, fill in every `[[…]]` placeholder in the "Inputs" section. Leave a placeholder as-is if you don't have it yet; the build must show a clear TODO rather than invent anything.

---

## Role and goal

You are a senior web designer and front-end engineer who specialises in real-estate and mortgage websites. Build a **best-in-class, standalone personal website for Harpreet Singh, a mortgage professional**. The site has one job: turn visitors (home buyers, people renewing or refinancing, investors and realtor partners) into booked consultations and pre-approval applications, while building trust through Harpreet's own videos, accolades and real client reviews.

## Inputs (fill these in before sending)

| Item | Value |
|---|---|
| Full name and title | Harpreet Singh, [[Mortgage Agent / Mortgage Broker / Loan Officer]] |
| Brokerage / lender affiliation | [[Brokerage name]] |
| Licence number(s) and regulator | [[e.g. FSRA licence # / NMLS #]] |
| Service area | [[City, region]] |
| Phone / WhatsApp | [[phone]] |
| Email | [[email]] |
| Office address | [[address]] |
| Booking link (Calendly etc.) | [[link or "use built-in form"]] |
| Languages spoken | [[e.g. English, Punjabi, Hindi]] |
| YouTube channel URL | [[https://www.youtube.com/@…]] |
| YouTube videos to feature (3–6) | [[video URLs]] |
| Facebook page URL | [[https://www.facebook.com/…]] |
| Facebook posts/videos to feature | [[post URLs]] |
| Google Business Profile URL | [[optional]] |
| Instagram / LinkedIn / TikTok | [[optional]] |
| Accolades / awards (with year and issuer) | [[e.g. "Top 1% Mortgage Agent, [Issuer], 2025"]] |
| Stats Harpreet can verify | [[e.g. years of experience, families helped, $ volume funded, lender partners]] |
| Client reviews (verbatim text, first name + last initial, date, source) | [[paste from Facebook reviews / Google]] |
| Headshot and brand photos | [[attach or link]] |
| Brand colours / logo | [[attach, or "propose one"]] |

## Design reference

Use **https://bennettpros.com/listings/** (and its home page) as the **style and quality benchmark only**: the polished, premium agent-brand feel, large photographic hero, clean card grid, strong sticky header with a clear call to action, generous whitespace and confident typography. Do **not** copy its text, images, logos, code or branding, and do **not** reproduce its MLS listing search. Adapt the feel to a mortgage business: where that site shows property listings, this site shows **mortgage solutions, videos and reviews**.

## Hard constraints

1. **No MLS / IDX integration.** No property feeds, listing search, or listing widgets of any kind.
2. **Individual site for Harpreet Singh only.** No team pages for other agents, no brokerage-wide templates. Brokerage named only where compliance requires it.
3. **Never fabricate anything.** Every review, award, statistic, rate and testimonial must come from the Inputs above. If an input is missing, render a visible placeholder marked `TODO` and list it in the final checklist. No stock "5,000 happy families" numbers, no invented quotes.
4. **Reviews are verbatim** and shown with first name + last initial, date and source (Facebook / Google). Link each to the original where possible. Only use reviews Harpreet is permitted to republish.
5. **Mortgage compliance:** licence number and brokerage in the footer and on the contact page; "rates subject to change, OAC (on approved credit)" style disclaimer next to any rate or calculator; privacy policy and consent checkbox on every form; (if US) Equal Housing Opportunity logo and NMLS Consumer Access link.

## Site map

1. **Home**
   - Hero: professional photo of Harpreet, headline (e.g. "Your mortgage, made simple"), sub-headline with service area and languages, two CTAs: **Get Pre-Approved** and **Book a Free Consultation**.
   - Trust strip: licence/brokerage, verified stats, star rating summary with review count and source.
   - "How I can help" cards: First-time buyers, Purchase, Renewal & switch, Refinance & debt consolidation, Self-employed, New to the country, Investment & rental properties, Reverse/private (only those Harpreet offers).
   - 3-step process: Consult → Pre-approval → Keys.
   - Featured video (latest YouTube video, lite embed).
   - Reviews carousel (6–9 real reviews) + link to all reviews.
   - Accolades / awards row.
   - Mortgage calculator teaser.
   - Final CTA band with phone, WhatsApp and booking.
2. **About Harpreet** – story, credentials, languages, community involvement, photo gallery, awards timeline.
3. **Services** – one section (or sub-page) per mortgage solution above: who it's for, what's needed, FAQs, CTA.
4. **Calculators** – payment calculator, affordability calculator, and (Canada) land-transfer-tax / CMHC insurance estimate or (US) PMI estimate. Clear "estimates only" disclaimer.
5. **Videos** – YouTube gallery grouped by topic (playlists), each with title and short description; click-to-load embeds.
6. **Reviews & Accolades** – all reviews with filters (source, service type), aggregate rating, awards with year and issuer, embedded Facebook posts.
7. **Resources / Blog** – first-time buyer guide, document checklist (downloadable PDF), glossary, FAQ. Structure ready for future posts.
8. **Realtor Partners** – for real-estate agents who refer clients: fast pre-approvals, communication promise, referral contact form.
9. **Apply / Get Pre-Approved** – multi-step form (goal → property & price → income & employment → contact & consent) with progress bar; saves progress; no SIN/SSN or bank details collected on the site.
10. **Contact** – form, click-to-call, WhatsApp, email, office map, hours, booking widget.
11. **Privacy, Terms, Accessibility, Licensing disclosure.**

## Social integration (YouTube + Facebook)

- **YouTube:** use a lightweight "lite" embed (thumbnail + play button, loads the iframe via `youtube-nocookie.com` only on click) so pages stay fast. Featured video on Home; full gallery on Videos page. Add `VideoObject` schema for each video.
- **Facebook:** embed the Facebook Page plugin (timeline) on Reviews and selected posts/videos via the official embed, **loaded only after cookie consent**. Facebook and YouTube icons in header and footer link to Harpreet's profiles.
- Reviews from Facebook are also rendered as **static HTML** on the site (not only in an iframe), so they are indexed by search engines, load instantly and survive if the embed breaks.
- Open Graph and Twitter card tags on every page so shared links look good on Facebook/WhatsApp.

## Best-in-class quality bar

- **Design:** premium, warm and trustworthy. Suggested palette: deep navy or emerald primary, warm gold accent, off-white backgrounds (adapt to Harpreet's brand if provided). Modern serif for headings + clean sans for body. Real photography of Harpreet over stock. Subtle motion only (respect `prefers-reduced-motion`).
- **Mobile-first:** sticky bottom bar on phones with Call / WhatsApp / Book. Tap targets ≥ 44px. No horizontal scroll.
- **Performance:** Lighthouse ≥ 95 in all four categories on mobile; LCP < 2.0s; CLS < 0.05. Responsive WebP/AVIF images with width/height, lazy loading below the fold, no heavy page builders, third-party scripts deferred until interaction/consent.
- **Accessibility:** WCAG 2.2 AA – contrast, keyboard navigation, focus states, form labels and error messages, alt text, captions on videos where available.
- **SEO / local SEO:** unique titles and meta descriptions; `LocalBusiness`/`FinancialService` + `Person` + `Review`/`AggregateRating` (only for real first-party reviews) + `FAQPage` schema; city-specific landing copy ("Mortgage agent in [[City]]"); XML sitemap, robots.txt, canonical URLs; Punjabi/Hindi language version if Harpreet wants it (with `hreflang`).
- **Conversion:** a CTA visible on every screen; short forms; instant confirmation message + email to Harpreet; optional SMS/WhatsApp alert; spam protection (honeypot + Turnstile/reCAPTCHA); analytics events on CTA clicks, calls and form submissions (GA4 or privacy-friendly alternative, consent-aware).
- **Security & privacy:** HTTPS, security headers, minimal data collection, consent checkbox, clear retention statement.
- **Maintainability:** all contact details, licence info, social links, reviews and awards in **one config/data file** so Harpreet can update them without touching layout code.

## Deliverables

1. The complete site source code, organised and commented, with a README covering how to run locally, edit content, and deploy (Netlify, Vercel, Cloudflare Pages or GitHub Pages).
2. A content data file pre-filled with the Inputs above.
3. All page copy written in a friendly, plain-English, professional voice (Grade 7–8 reading level), in Harpreet's first person.
4. A **launch checklist** listing every remaining `TODO` placeholder, plus the Lighthouse scores and accessibility checks you ran.
5. A short list of recommended next steps (e.g. Google Business Profile optimisation, review-request automation, monthly YouTube → blog repurposing).

Before you start building, briefly confirm the site map and design direction, and list any missing inputs you need from me.
