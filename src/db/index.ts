import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;

const isWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

/** Connection string: DATABASE_URL locally / in scripts, Hyperdrive binding on Cloudflare. */
async function connectionString(): Promise<string> {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = await getCloudflareContext({ async: true });
  return (env as unknown as CloudflareEnv).HYPERDRIVE.connectionString;
}

// Node (local dev, scripts): one shared pool for the process.
const globalForDb = globalThis as unknown as { __dilisPool?: Pool };

function nodeDb(url: string): DB {
  globalForDb.__dilisPool ??= new Pool({ connectionString: url, max: 10 });
  return drizzle(globalForDb.__dilisPool, { schema });
}

// Workers: sockets can't be shared across requests, so build one client per request,
// keyed on that request's ExecutionContext. Hyperdrive does the real pooling at the edge.
const perRequest = new WeakMap<object, DB>();

async function workersDb(): Promise<DB> {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env, ctx } = await getCloudflareContext({ async: true });
  const hit = perRequest.get(ctx);
  if (hit) return hit;
  const pool = new Pool({ connectionString: (env as unknown as CloudflareEnv).HYPERDRIVE.connectionString, max: 5 });
  const db = drizzle(pool, { schema });
  perRequest.set(ctx, db);
  return db;
}

export async function getDb(): Promise<DB> {
  if (isWorkers && !process.env.DATABASE_URL) return workersDb();
  return nodeDb(await connectionString());
}

export { schema };
