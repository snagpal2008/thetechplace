// GET /api/condolences?notice=<slug> — approved messages only, published fields only.
import { d1Store, json } from "../_d1.js";

export async function onRequestGet({ request, env }) {
  const notice = (new URL(request.url).searchParams.get("notice") || "").slice(0, 120);
  return json(200, notice ? await d1Store(env).approvedCondolences(notice) : []);
}
