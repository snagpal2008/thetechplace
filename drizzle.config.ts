import { defineConfig } from "drizzle-kit";

// Generates SQLite migrations into ./drizzle. They are applied:
//  - on Cloudflare D1 with `wrangler d1 migrations apply dilis-db --remote` (deploy workflow)
//  - locally to the workerd D1 with `npm run db:migrate:local`
//  - to a plain SQLite file (tests / seed) with `npm run db:migrate:file`
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: { url: process.env.SQLITE_URL ?? "file:./local.db" },
});
