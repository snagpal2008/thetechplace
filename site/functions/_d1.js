// Cloudflare D1 adapter for db/store.mjs (same SQL as the local node:sqlite adapter).
import { makeStore } from "../db/store.mjs";
import { SCHEMA } from "../db/schema.mjs";
import { splitSql } from "../db/split-schema.mjs";

// Create any missing tables once per Worker instance (every statement is CREATE ... IF NOT EXISTS),
// so a new or empty D1 database, including the one a preview deploy uses, works without a manual step.
let ready = null;
export function ensureSchema(env) {
  if (!env.DB) return Promise.reject(new Error("D1 binding 'DB' is missing: see wrangler.toml and docs/08-hosting.md"));
  ready ??= env.DB.batch(splitSql(SCHEMA).map((s) => env.DB.prepare(s))).catch((e) => { ready = null; throw e; });
  return ready;
}
export const resetSchemaCache = () => { ready = null; }; // tests only

export async function d1Store(env) {
  await ensureSchema(env);
  return makeStore({
    async run(sql, params) { const r = await env.DB.prepare(sql).bind(...params).run(); return { changes: r.meta?.changes ?? 0 }; },
    async all(sql, params) { const r = await env.DB.prepare(sql).bind(...params).all(); return r.results ?? []; }
  });
}
export const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
