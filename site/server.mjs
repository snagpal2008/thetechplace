// Local development / demo server. No dependencies.
//   node server.mjs            → http://localhost:8080
// Serves dist/ and accepts form posts at POST /api/forms/:id, storing them as JSON
// lines in data/ (gitignored). In production the same payloads go to the Dílis API.
import { createServer } from "node:http";
import { readFile, appendFile, mkdir, stat } from "node:fs/promises";
import { join, extname, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { randomUUID } from "node:crypto";
import { FORMS, validate } from "./forms.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");
const dataDir = join(root, "data");
const PORT = Number(process.env.PORT) || 8080;

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".webp": "image/webp",
  ".jpg": "image/jpeg", ".png": "image/png", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8", ".ico": "image/x-icon" };

const SECURITY = {
  "Content-Security-Policy": "default-src 'self'; img-src 'self' data: https://*.openstreetmap.org; frame-src https://www.openstreetmap.org; script-src 'self' https://www.googletagmanager.com; connect-src 'self' https://*.google-analytics.com; style-src 'self' 'unsafe-inline'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-Frame-Options": "DENY"
};
// JSON-LD blocks are data, not script, so CSP does not block them; drop the placeholder hash.
SECURITY["Content-Security-Policy"] = SECURITY["Content-Security-Policy"].replace("", "");

// Simple per-IP rate limit for form posts: 10 per 10 minutes.
const hits = new Map();
const limited = (ip) => {
  const now = Date.now(), list = (hits.get(ip) || []).filter((t) => now - t < 600_000);
  list.push(now); hits.set(ip, list);
  return list.length > 10;
};

const send = (res, status, body, headers = {}) => { res.writeHead(status, { ...SECURITY, ...headers }); res.end(body); };
const json = (res, status, obj) => send(res, status, JSON.stringify(obj), { "Content-Type": "application/json", "Cache-Control": "no-store" });

async function readBody(req, limit = 32_000) {
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > limit) throw Object.assign(new Error("Too large"), { status: 413 }); chunks.push(c); }
  return Buffer.concat(chunks).toString("utf8");
}

async function readJsonl(file) {
  try { return (await readFile(file, "utf8")).split("\n").filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; }
}

async function handleForm(req, res, id) {
  const ip = req.socket.remoteAddress || "";
  if (limited(ip)) return json(res, 429, { error: "Too many messages in a short time. Please wait a few minutes." });
  let body;
  try { body = JSON.parse(await readBody(req)); } catch (e) { return json(res, e.status || 400, { error: "We could not read that form." }); }
  const r = validate(id, body);
  if (r.status !== 200) return json(res, r.status, { error: r.error, fields: r.fields });
  if (r.spam) return json(res, 200, { message: "Thank you." }); // never reveal the trap
  const record = { id: randomUUID(), form: id, received: new Date().toISOString(), status: r.def.moderated ? "pending" : "new",
    owner: r.def.owner, slaHours: r.def.slaHours, retention: r.def.retention, data: r.data };
  await mkdir(dataDir, { recursive: true });
  await appendFile(join(dataDir, `${id}.jsonl`), JSON.stringify(record) + "\n");
  // Stand-in for email/SMS: in production → Dílis webhook (see docs/04-workflows.md)
  console.log(`[form] ${r.def.title} → notify ${r.def.notify.join(", ")} · owner: ${r.def.owner} · SLA ${r.def.slaHours}h · ${record.id}`);
  return json(res, 200, { ok: true, message: r.def.message, reference: record.id.slice(0, 8).toUpperCase() });
}

async function serveStatic(req, res, urlPath) {
  let p = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, "");
  let file = join(dist, p);
  if (!file.startsWith(dist)) return send(res, 403, "Forbidden");
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
      const notice = url.searchParams.get("notice");
      const items = (await readJsonl(join(dataDir, "condolence.jsonl")))
        .filter((c) => c.status === "approved" && c.data.notice === notice)
        .map((c) => ({ name: c.data.name, town: c.data.town, message: c.data.message, date: c.received.slice(0, 10) }));
      return json(res, 200, items);
    }
    if (url.pathname.startsWith("/api/")) return json(res, 404, { error: "Not found" });
    if (!["GET", "HEAD"].includes(req.method)) return send(res, 405, "Method not allowed");
    return await serveStatic(req, res, url.pathname);
  } catch (e) {
    console.error(e); json(res, 500, { error: "Something went wrong on our side." });
  }
}).listen(PORT, () => console.log(`Serving dist/ on http://localhost:${PORT} · forms: ${Object.keys(FORMS).join(", ")}`));
