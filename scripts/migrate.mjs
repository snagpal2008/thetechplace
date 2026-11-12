// Applies drizzle/ migrations using runtime dependencies only (no drizzle-kit),
// so it runs inside the production container as a Cloud Run Job.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: url, max: 1 });
try {
  await migrate(drizzle(pool), { migrationsFolder: new URL("../drizzle", import.meta.url).pathname });
  console.log("Migrations applied");
} catch (e) {
  console.error("Migration failed:", e);
  process.exitCode = 1;
} finally {
  await pool.end();
}
