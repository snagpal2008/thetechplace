import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { organizations, type Role } from "@/db/schema";
import { requireSession } from "./session";

/** Session + DB + the user's organisation, for server components and actions. */
export async function current(...roles: Role[]) {
  const session = await requireSession(...roles);
  const db = await getDb();
  const [org] = await db.select().from(organizations).where(eq(organizations.id, session.orgId));
  return { session, db, org };
}
