# Harpreet Singh Chhabra: realtor website

A static two-page site (home and contact) for Harpreet Singh Chhabra, Salesperson, REALTOR® with Royal LePage Team Realty, Brokerage (Ottawa). Mortgage services are through Mortgage Intelligence (FSRA Brokerage #10428). There's no MLS® integration: listings link out to his Royal LePage profile.

- `src/`: page sources and assets. `partials/` holds the shared head, header and footer.
- `node build.mjs` builds `dist/`. Set `SITE_URL` (or pass the URL as an argument) once the final domain is known, to add canonical links and a sitemap.
- Cloudflare (Workers + static assets, set up in `wrangler.toml`): connect the repo in Workers & Pages with root directory `harpreet-site`, build command `node build.mjs`, deploy command `npx wrangler deploy`.

The contact form opens the visitor's email app with the message filled in, addressed to hchhabra@royallepage.ca. The site stores nothing, uses no cookies and has no tracking.
