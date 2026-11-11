// Cloudflare Worker entry (Workers + static assets: Cloudflare's current setup).
// Static pages in dist/ are served by Cloudflare directly; only /api/* requests reach this code.
// It reuses the same handlers as the Pages Functions in functions/, so there is one copy of the logic.
import { onRequestPost as postForm } from "./functions/api/forms/[id].js";
import { onRequestGet as getCondolences } from "./functions/api/condolences.js";
import { onRequestGet as getReviews } from "./functions/api/reviews.js";
import { onRequestGet as getHealth } from "./functions/api/health.js";
import { json } from "./functions/_d1.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const context = (params = {}) => ({ request, env, params, waitUntil: (p) => ctx.waitUntil(p) });

    const form = url.pathname.match(/^\/api\/forms\/([\w-]+)$/);
    if (form) return request.method === "POST" ? postForm(context({ id: form[1] })) : json(405, { error: "Method not allowed." });
    if (url.pathname === "/api/condolences") return request.method === "GET" ? getCondolences(context()) : json(405, { error: "Method not allowed." });
    if (url.pathname === "/api/reviews") return request.method === "GET" ? getReviews(context()) : json(405, { error: "Method not allowed." });
    if (url.pathname === "/api/health") return request.method === "GET" ? getHealth(context()) : json(405, { error: "Method not allowed." });
    if (url.pathname.startsWith("/api/")) return json(404, { error: "Not found." });

    // Anything else that isn't a file: let the static-assets layer answer (it serves 404.html).
    return env.ASSETS.fetch(request);
  }
};
