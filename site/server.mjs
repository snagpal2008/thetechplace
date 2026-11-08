// Local development / demo server. No dependencies.
//   node server.mjs            → http://localhost:8080
// Serves dist/ and accepts form posts at POST /api/forms/:id, storing them in a SQLite
// database at data/funeral.db (gitignored). See db/schema.sql and admin.mjs.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { FORMS, validate } from "./forms.mjs";
import { openStore } from "./db/sqlite-node.mjs";
import { alertPayload, sendAlert } from "./alerts.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");
const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || "127.0.0.1"; // local only by default; set HOST=0.0.0.0 to expose
const store = openStore();

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".webp": "image/webp",
  ".jpg": "image/jpeg", ".png": "image/png", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8", ".ico": "image/x-icon" };

const SECURITY = {
  "Content-Security-Policy": "default-src 'self'; img-src 'self' data: https://*.openstreetmap.org; frame-src https://www.openstreetmap.org; script-src 'self' https://www.googletagmanager.com; connect-src 'self' https://*.google-analytics.com https://script.google.com https://script.googleusercontent.com; style-src 'self' 'unsafe-inline'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-Frame-Options": "DENY"
};
// Simple per-IP rate limit for form posts: 10 per 10 minutes. Old entries are swept so the
// map cannot grow without bound.
const hits = new Map();
const limited = (ip) => {
  const now = Date.now(), list = (hits.get(ip) || []).filter((t) => now - t < 600_000);
  list.push(now); hits.set(ip, list);
  return list.length > 10;
};
setInterval(() => {
  const now = Date.now();
  for (const [ip, list] of hits) if (!list.some((t) => now - t < 600_000)) hits.delete(ip);
}, 60_000).unref();

const send = (res, status, body, headers = {}) => { res.writeHead(status, { ...SECURITY, ...headers }); res.end(body); };
const json = (res, status, obj) => send(res, status, JSON.stringify(obj), { "Content-Type": "application/json", "Cache-Control": "no-store" });

async function readBody(req, limit = 32_000) {
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > limit) throw Object.assign(new Error("Too large"), { status: 413 }); chunks.push(c); }
  return Buffer.concat(chunks).toString("utf8");
}

async function handleForm(req, res, id) {
  if (!/^application\/json\b/i.test(req.headers["content-type"] || "")) return json(res, 415, { error: "Unsupported form encoding." });
  const ip = req.socket.remoteAddress || "";
  if (limited(ip)) return json(res, 429, { error: "Too many messages in a short time. Please wait a few minutes." });
  let body;
  try { body = JSON.parse(await readBody(req)); } catch (e) { return json(res, e.status || 400, { error: "We could not read that form." }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json(res, 400, { error: "We could not read that form." });
  const r = validate(id, body);
  if (r.status !== 200) return json(res, r.status, { error: r.error, fields: r.fields });
  if (r.spam) return json(res, 200, { message: "Thank you." }); // never reveal the trap
  const recordId = await store.save(id, r.def, r.data);
  // Alert email via ALERT_WEBHOOK_URL (tools/gmail-alert.gs), if set. The log line holds no personal data.
  const alerted = process.env.ALERT_WEBHOOK_URL && id !== "condolence"
    ? await sendAlert(process.env.ALERT_WEBHOOK_URL, alertPayload(id, r.def, r.data, recordId)) : null;
  console.log(`[form] ${r.def.title} · owner: ${r.def.owner} · SLA ${r.def.slaHours}h · ${recordId}${alerted === null ? " · no alert configured" : alerted ? " · alert sent" : " · ALERT FAILED"}`);
  return json(res, 200, { ok: true, message: r.def.message, reference: recordId.slice(0, 8).toUpperCase() });
}

async function serveStatic(req, res, urlPath) {
  let p;
  try { p = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, ""); } catch { return send(res, 400, "Bad request"); }
  let file = join(dist, p);
  if (file !== dist && !file.startsWith(dist + sep)) return send(res, 403, "Forbidden");
  try { if ((await stat(file)).isDirectory()) file = join(file, "index.html"); }
  catch { if (!extname(file)) file = join(file, "index.html"); }
  try {
    let buf = await readFile(file);
    const ext = extname(file);
    const headers = { "Content-Type": TYPES[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable" };
    if (/gzip/.test(req.headers["accept-encoding"] || "") && /html|css|javascript|json|svg|xml|plain/.test(headers["Content-Type"])) {
      buf = gzipSync(buf); headers["Content-Encoding"] = "gzip"; headers.Vary = "Accept-Encoding";
    }
    send(res, 200, req.method === "HEAD" ? undefined : buf, headers);
  } catch {
    const nf = await readFile(join(dist, "404.html")).catch(() => "Not found");
    send(res, 404, nf, { "Content-Type": TYPES[".html"] });
  }
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const m = url.pathname.match(/^\/api\/forms\/([\w-]+)$/);
    if (m && req.method === "POST") return await handleForm(req, res, m[1]);
    if (url.pathname === "/api/condolences" && req.method === "GET") {
      const notice = (url.searchParams.get("notice") || "").slice(0, 120);
      return json(res, 200, notice ? await store.approvedCondolences(notice) : []);
    }
    if (url.pathname.startsWith("/api/")) return json(res, 404, { error: "Not found" });
    if (!["GET", "HEAD"].includes(req.method)) return send(res, 405, "Method not allowed");
    return await serveStatic(req, res, url.pathname);
  } catch (e) {
    console.error(e); json(res, 500, { error: "Something went wrong on our side." });
  }
}).listen(PORT, HOST, () => console.log(`Serving dist/ on http://localhost:${PORT} · database: ${store.path} · forms: ${Object.keys(FORMS).join(", ")}`));
