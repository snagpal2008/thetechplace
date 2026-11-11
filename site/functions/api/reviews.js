// GET /api/reviews — approved family reviews (published fields only) and the average rating.
import { d1Store, json } from "../_d1.js";

export async function onRequestGet({ request, env }) {
  const store = await d1Store(env);
  const limit = Number(new URL(request.url).searchParams.get("limit")) || 50;
  return json(200, { summary: await store.reviewSummary(), reviews: await store.approvedReviews(limit) });
}
