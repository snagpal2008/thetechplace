# Harpreet Singh Chhabra: realtor website

A static two-page site (home and contact) for Harpreet Singh Chhabra, Salesperson, REALTOR® with Royal LePage Team Realty, Brokerage (Ottawa). Mortgage services are through Mortgage Intelligence (FSRA Brokerage #10428). There's no MLS® integration: listings link out to his Royal LePage profile.

- `src/`: page sources and assets. `partials/` holds the shared head, header and footer.
- `node build.mjs [https://your-domain]` builds `dist/`. The default URL is https://harpreet-singh-chhabra.pages.dev.
- Deploy to Cloudflare Pages: `npm run deploy`. It needs `CLOUDFLARE_API_TOKEN` (Pages: Edit) and `CLOUDFLARE_ACCOUNT_ID`.

The contact form opens the visitor's email app with the message filled in, addressed to hchhabra@royallepage.ca. The site stores nothing, uses no cookies and has no tracking.
