/**
 * Local demo data.  Usage:  npm run db:seed  [-- --reset]
 * Uses SQLITE_URL (default file:./local.db). For the deployed site, use /setup instead.
 */
import { sql } from "drizzle-orm";
process.env.SQLITE_URL ??= "file:./local.db";

async function main() {
  const { getDb } = await import("../src/db");
  const { registerAccount, setSetting } = await import("../src/lib/domain");
  const { loadDemoData, DEMO_PASSWORD, DEMO_ACCOUNTS } = await import("../src/lib/demo");
  const db = await getDb();
  const [{ n }] = await db.all<{ n: number }>(sql`select count(*) as n from users`);
  if (n > 0 && !process.argv.includes("--reset")) {
    console.log("Database already has users — run with --reset to wipe and reseed.");
    return;
  }
  for (const t of ["invoice_lines", "invoices", "order_messages", "order_items", "orders", "funeral_cases", "services", "users", "organizations", "settings", "counters"])
    await db.run(sql.raw(`delete from ${t}`));

  await setSetting(db, "platform_fee_bps", "1000");
  await registerAccount(db, { kind: "admin", orgName: "Dílis (FuneralDirector.ie)", name: "Platform Admin", email: "admin@dilis.ie", password: DEMO_PASSWORD });
  await loadDemoData(db);
  console.log(`Seeded. Password for all accounts: ${DEMO_PASSWORD}\n  admin@dilis.ie  Platform admin\n` + DEMO_ACCOUNTS.map(([e, r]) => `  ${e}  ${r}`).join("\n"));
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
