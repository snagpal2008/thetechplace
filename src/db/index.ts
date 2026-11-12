import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;

/*
 * One pool per container instance. On Cloud Run, DATABASE_URL points at the
 * Cloud SQL unix socket, e.g.
 *   postgres://dilis_app:PASS@/dilis?host=/cloudsql/PROJECT:REGION:INSTANCE
 * Keep DB_POOL_MAX x max-instances below the instance's connection limit.
 */
const globalForDb = globalThis as unknown as { __dilisDb?: DB };

export async function getDb(): Promise<DB> {
  if (!globalForDb.__dilisDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const pool = new Pool({
      connectionString: url,
      max: Number(process.env.DB_POOL_MAX ?? 5),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    globalForDb.__dilisDb = drizzle(pool, { schema });
  }
  return globalForDb.__dilisDb;
}

export { schema };
