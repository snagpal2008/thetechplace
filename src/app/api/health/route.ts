import { sql } from "drizzle-orm";
import { getDb } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    await db.run(sql`select 1`);
    return Response.json({ ok: true, db: "up" });
  } catch (e) {
    return Response.json({ ok: false, db: "down", error: (e as Error).message }, { status: 503 });
  }
}
