// End-to-end tests of the Cloudflare Worker (worker.js) with a real SQLite database standing in
// for Cloudflare D1: same SQL, same request handling, same responses as on Cloudflare.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import worker from "../worker.js";
import { d1Store, resetSchemaCache } from "../functions/_d1.js";
import { SCHEMA } from "../db/schema.mjs";

const ORIGIN = "https://thetechplace.example.workers.dev";
const old = String(Date.now() - 10_000); // passes the 3-second spam time trap

/** Minimal Cloudflare D1 binding backed by node:sqlite (prepare/bind/run/all/batch). */
function fakeD1() {
  const db = new DatabaseSync(":memory:");
  const stmt = (sql, params = []) => ({
    bind: (...p) => stmt(sql, p),
    async run() { const r = db.prepare(sql).run(...params); return { success: true, meta: { changes: Number(r.changes) } }; },
    async all() { return { success: true, results: db.prepare(sql).all(...params) }; }
  });
  return { prepare: (sql) => stmt(sql), batch: async (list) => Promise.all(list.map((s) => s.run())), raw: db };
}

let env, assetsHits;
beforeEach(() => {
  resetSchemaCache();
  assetsHits = [];
  env = { DB: fakeD1(), ASSETS: { fetch: async (req) => { assetsHits.push(new URL(req.url).pathname); return new Response("static", { status: 200 }); } } };
});

const call = (path, init = {}) => worker.fetch(new Request(ORIGIN + path, init), env, { waitUntil() {} });
const post = (path, body, headers = {}) =>
  call(path, { method: "POST", headers: { "content-type": "application/json", origin: ORIGIN, ...headers }, body: JSON.stringify(body) });
const review = (over = {}) => ({ name: "Áine M.", town: "Naas", email: "aine@example.ie", rating: "5", service: "burial",
  message: "Kind, calm and clear about every cost.", publish_ok: "yes", consent: "yes", _ts: old, ...over });

test("schema.mjs matches schema.sql (run `node build.mjs` after changing the schema)", () => {
  assert.equal(SCHEMA, readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
});

test("health check creates the tables on an empty database and reports connected", async () => {
  const r = await call("/api/health");
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.ok, true);
  assert.equal(j.database, "connected");
  assert.deepEqual(j.tables, ["condolences", "rate_hits", "reviews", "submissions"]);
});

test("health check reports 503 when the D1 binding is missing", async () => {
  delete env.DB;
  const r = await call("/api/health");
  assert.equal(r.status, 503);
  assert.equal((await r.json()).database, "unreachable");
});

test("a review is saved as pending, hidden until approved, then published without the email", async () => {
  const r = await post("/api/forms/review", review());
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.ok, true);
  assert.match(j.reference, /^[0-9A-F]{8}$/);

  let list = await (await call("/api/reviews")).json();
  assert.deepEqual(list, { summary: { count: 0, average: null }, reviews: [] });

  const store = await d1Store(env);
  const [pending] = await store.pendingReviews();
  assert.equal(await store.moderate(pending.id.slice(0, 8), "approved", new Date(), "review"), 1);

  list = await (await call("/api/reviews")).json();
  assert.deepEqual(list.summary, { count: 1, average: 5 });
  assert.equal(list.reviews[0].name, "Áine M.");
  assert.equal(list.reviews[0].rating, 5);
  assert.equal(list.reviews[0].email, undefined);
});

test("review summary averages approved reviews only", async () => {
  for (const rating of ["5", "4", "1"]) await post("/api/forms/review", review({ rating }));
  const store = await d1Store(env);
  const [a, b] = await store.pendingReviews();
  await store.moderate(a.id, "approved", new Date(), "review");
  await store.moderate(b.id, "approved", new Date(), "review");
  const { summary } = await (await call("/api/reviews")).json();
  assert.deepEqual(summary, { count: 2, average: 4.5 });
});

test("review validation: rating must be 1 to 5 and publishing must be agreed", async () => {
  const bad = await post("/api/forms/review", review({ rating: "6", publish_ok: "" }));
  assert.equal(bad.status, 422);
  const j = await bad.json();
  assert.deepEqual(Object.keys(j.fields).sort(), ["publish_ok", "rating"]);
});

test("forms: wrong content type, other-site origin and unknown form are refused", async () => {
  assert.equal((await call("/api/forms/review", { method: "POST", headers: { "content-type": "text/plain", origin: ORIGIN }, body: "x" })).status, 415);
  assert.equal((await post("/api/forms/review", review(), { origin: "https://evil.example" })).status, 403);
  assert.equal((await post("/api/forms/nope", {})).status, 404);
  assert.equal((await call("/api/forms/review")).status, 405);
});

test("first notification of a death is stored in the on-call queue with a 15-minute deadline", async () => {
  const r = await post("/api/forms/first-notification", { caller_name: "Seán", caller_phone: "087 123 4567", relationship: "son",
    deceased_name: "Mary Kelly", date_of_death: new Date().toISOString().slice(0, 10), place_type: "home", place_address: "Naas",
    doctor_status: "certified", consent: "yes", _ts: old });
  assert.equal(r.status, 200);
  const [row] = await (await d1Store(env)).openQueue();
  assert.equal(row.form, "first-notification");
  assert.equal(new Date(row.respond_by) - new Date(row.received_at), 15 * 60_000);
});

test("condolences API returns only approved messages for that notice", async () => {
  await post("/api/forms/condolence", { notice: "sample-notice", name: "Pat", email: "p@x.ie", message: "Thinking of you all.",
    publish_ok: "yes", consent: "yes", _ts: old });
  assert.deepEqual(await (await call("/api/condolences?notice=sample-notice")).json(), []);
  const store = await d1Store(env);
  const [c] = await store.pendingCondolences();
  await store.moderate(c.id, "approved");
  const list = await (await call("/api/condolences?notice=sample-notice")).json();
  assert.equal(list.length, 1);
  assert.equal(list[0].message, "Thinking of you all.");
});

test("rate limit: the 11th post in 10 minutes from one visitor gets 429", async () => {
  const headers = { "cf-connecting-ip": "203.0.113.9" };
  for (let i = 0; i < 10; i++) assert.notEqual((await post("/api/forms/review", review(), headers)).status, 429);
  assert.equal((await post("/api/forms/review", review(), headers)).status, 429);
  // The database stores a hash, never the IP address itself.
  const keys = env.DB.raw.prepare("SELECT DISTINCT key FROM rate_hits").all().map((r) => r.key);
  assert.ok(keys.length === 1 && !keys[0].includes("203.0.113.9"));
});

test("unknown API paths are 404 JSON; pages are passed to static assets", async () => {
  const r = await call("/api/nothing");
  assert.equal(r.status, 404);
  assert.equal(r.headers.get("content-type"), "application/json");
  assert.equal((await call("/reviews/")).status, 200);
  assert.deepEqual(assetsHits, ["/reviews/"]);
});
