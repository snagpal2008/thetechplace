// POST /api/forms/:id — same validation as the local server (forms.mjs), stored in D1.
import { validate } from "../../../forms.mjs";
import { d1Store, json } from "../../_d1.js";

export async function onRequestPost({ request, params, env, waitUntil }) {
  if (!/^application\/json\b/i.test(request.headers.get("content-type") || "")) return json(415, { error: "Unsupported form encoding." });
  // Only accept posts from our own pages (blocks other sites from submitting on a visitor's behalf).
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json(403, { error: "Forbidden." });
  const text = await request.text();
  if (text.length > 32_000) return json(413, { error: "That message is too long." });
  let body;
  try { body = JSON.parse(text); } catch { return json(400, { error: "We could not read that form." }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json(400, { error: "We could not read that form." });

  const r = validate(params.id, body);
  if (r.status !== 200) return json(r.status, { error: r.error, fields: r.fields });
  if (r.spam) return json(200, { message: "Thank you." });

  const id = await d1Store(env).save(params.id, r.def, r.data);
  // Optional alert email/SMS: set ALERT_WEBHOOK_URL (e.g. a Formspree or Make/Zapier webhook) in the Pages settings.
  // Only the form name and reference are sent, never the personal details.
  if (env.ALERT_WEBHOOK_URL) {
    // waitUntil lets the alert finish after the visitor already has their reply
    waitUntil(fetch(env.ALERT_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ form: r.def.title, owner: r.def.owner, respond_within_hours: r.def.slaHours, reference: id.slice(0, 8).toUpperCase() }) })
      .catch(() => {}));
  }
  return json(200, { ok: true, message: r.def.message, reference: id.slice(0, 8).toUpperCase() });
}

export const onRequest = () => json(405, { error: "Method not allowed." });
