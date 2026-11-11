// GET /api/health — is the Worker running and can it reach the D1 database? No personal data.
// Open https://<your-site>/api/health after a deploy (preview or live) to check the database connection.
import { ensureSchema, json } from "../_d1.js";

const TABLES = ["submissions", "condolences", "reviews", "rate_hits"];

export async function onRequestGet({ env }) {
  try {
    await ensureSchema(env);
    const { results = [] } = await env.DB.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${TABLES.map(() => "?").join(", ")}) ORDER BY name`
    ).bind(...TABLES).all();
    const found = results.map((r) => r.name);
    const ok = TABLES.every((t) => found.includes(t));
    return json(ok ? 200 : 503, { ok, database: ok ? "connected" : "tables missing", tables: found });
  } catch (e) {
    return json(503, { ok: false, database: "unreachable", error: String(e.message || e).slice(0, 200) });
  }
}
