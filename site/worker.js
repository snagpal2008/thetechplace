// Cloudflare Worker entry (Workers + static assets: Cloudflare's current setup).
// Static pages in dist/ are served by Cloudflare directly; only /api/* requests reach this code.
// It reuses the same handlers as the Pages Functions in functions/, so there is one copy of the logic.
import { onRequestPost as postForm } from "./functions/api/forms/[id].js";
import { onRequestGet as getCondolences } from "./functions/api/condolences.js";
import { json, d1Store } from "./functions/_d1.js";
import { sendAlert } from "./alerts.mjs";
import { formatDailyReport } from "./report.mjs";
import config from "./config.json" with { type: "json" };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const context = (params = {}) => ({ request, env, params, waitUntil: (p) => ctx.waitUntil(p) });

    const form = url.pathname.match(/^\/api\/forms\/([\w-]+)$/);
    if (form) return request.method === "POST" ? postForm(context({ id: form[1] })) : json(405, { error: "Method not allowed." });
    if (url.pathname === "/api/condolences") return request.method === "GET" ? getCondolences(context()) : json(405, { error: "Method not allowed." });
    if (url.pathname.startsWith("/api/")) return json(404, { error: "Not found." });

    // Anything else that isn't a file: let the static-assets layer answer (it serves 404.html).
    return env.ASSETS.fetch(request);
  },

  // Daily schedule (wrangler.toml → [triggers]): email the report, then delete expired data (GDPR).
  async scheduled(event, env, ctx) {
    const store = d1Store(env);
    const report = formatDailyReport(await store.dailyReport(new Date(event.scheduledTime)), { siteName: config.shortName, now: new Date(event.scheduledTime) });
    const sent = env.ALERT_WEBHOOK_URL ? await sendAlert(env.ALERT_WEBHOOK_URL, { type: "report", ...report }) : false;
    const purged = await store.purge();
    console.log(JSON.stringify({ job: "daily", reportSent: sent, ...purged }));
  }
};
