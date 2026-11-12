import { drizzle as drizzleD1, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

/**
 * One DB type across runtimes. On Cloudflare it's D1; in Node (tests, seed,
 * `next dev` without bindings) it's libsql against a local SQLite file.
 * Both drivers expose the same async API (select/insert/update/batch/run/all/query).
 */
export type DB = DrizzleD1Database<typeof schema>;

const globalForDb = globalThis as unknown as { __dilisDb?: DB };

async function nodeDb(url: string): Promise<DB> {
  if (!globalForDb.__dilisDb) {
    const { createClient } = await import("@libsql/client");
    const { drizzle } = await import("drizzle-orm/libsql");
    const client = createClient({ url });
    await client.execute("PRAGMA foreign_keys = ON");
    globalForDb.__dilisDb = drizzle(client, { schema }) as unknown as DB;
  }
  return globalForDb.__dilisDb;
}

export async function getDb(): Promise<DB> {
  // Local scripts/tests/dev: SQLITE_URL=file:./local.db
  const local = process.env.SQLITE_URL;
  if (local) return nodeDb(local);

  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = await getCloudflareContext({ async: true });
  return drizzleD1((env as unknown as CloudflareEnv).DB, { schema });
}

export { schema };
