// POST /api/forms/:id — same validation as the local server (forms.mjs), stored in D1.
import { validate } from "../../../forms.mjs";
import { d1Store, json } from "../../_d1.js";
import { alertPayload, sendAlert } from "../../../alerts.mjs";

export async function onRequestPost({ request, params, env, waitUntil }) {
  if (!/^application\/json\b/i.test(request.headers.get("content-type") || "")) return json(415, { error: "Unsupported form encoding." });
  // Only accept posts from our own pages (blocks other sites from submitting on a visitor's behalf).
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json(403, { error: "Forbidden." });
  const store = await d1Store(env);
  // 10 posts per 10 minutes per visitor, same as the local server.
  if (await store.rateLimited(await ipKey(request, env))) {
    return json(429, { error: "Too many messages in a short time. Please wait a few minutes, or call us." });
  }
  const text = await request.text();
  if (text.length > 32_000) return json(413, { error: "That message is too long." });
  let body;
  try { body = JSON.parse(text); } catch { return json(400, { error: "We could not read that form." }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json(400, { error: "We could not read that form." });

  const r = validate(params.id, body);
  if (r.status !== 200) return json(r.status, { error: r.error, fields: r.fields });
  if (r.spam) return json(200, { message: "Thank you." });

  const id = await store.save(params.id, r.def, r.data);
  // Alert email (tools/gmail-alert.gs) via ALERT_WEBHOOK_URL. Moderated forms (condolences, reviews) go to a queue, not an alert.
  // waitUntil lets the alert finish after the visitor already has their reply.
  if (env.ALERT_WEBHOOK_URL && !r.def.moderated) {
    waitUntil(sendAlert(env.ALERT_WEBHOOK_URL, alertPayload(params.id, r.def, r.data, id)));
  }
  return json(200, { ok: true, message: r.def.message, reference: id.slice(0, 8).toUpperCase() });
}

export const onRequest = () => json(405, { error: "Method not allowed." });

// Keyed hash of the visitor's IP, rotated daily, so the database never holds IP addresses.
// Set RATE_LIMIT_SECRET (any long random text) in the Worker → Settings → Variables and Secrets;
// without it the hash still works but is easier to reverse.
async function ipKey(request, env) {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(`${env.RATE_LIMIT_SECRET || "set-RATE_LIMIT_SECRET"}:${day}`),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(ip)));
  return Array.from(sig.slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
}
