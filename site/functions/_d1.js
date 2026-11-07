// Cloudflare D1 adapter for db/store.mjs (same SQL as the local node:sqlite adapter).
import { makeStore } from "../db/store.mjs";

export function d1Store(env) {
  if (!env.DB) throw new Error("D1 binding 'DB' is missing: see wrangler.toml and docs/08-hosting.md");
  return makeStore({
    async run(sql, params) { const r = await env.DB.prepare(sql).bind(...params).run(); return { changes: r.meta?.changes ?? 0 }; },
    async all(sql, params) { const r = await env.DB.prepare(sql).bind(...params).all(); return r.results ?? []; }
  });
}

export const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
