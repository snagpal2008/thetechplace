/** Local demo data.  Usage:  npm run db:seed  [-- --reset]   (deployed sites: use /setup) */
import { sql } from "drizzle-orm";
import { getDb } from "../src/db";
import { registerAccount, setSetting } from "../src/lib/domain";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, loadDemoData } from "../src/lib/demo";

async function main() {
  const db = await getDb();
  const [{ n }] = (await db.execute(sql`select count(*)::int as n from users`)).rows as { n: number }[];
  if (n > 0 && !process.argv.includes("--reset")) {
    console.log("Database already has users — run with --reset to wipe and reseed.");
    return;
  }
  await db.execute(sql`truncate invoice_lines, invoices, order_messages, order_items, orders, funeral_cases, services, users, organizations, settings restart identity cascade`);
  await db.execute(sql`alter sequence invoice_number_seq restart with 1`);
  await setSetting(db, "platform_fee_bps", "1000");
  await registerAccount(db, { kind: "admin", orgName: "Dílis (FuneralDirector.ie)", name: "Platform Admin", email: "admin@dilis.ie", password: DEMO_PASSWORD });
  await loadDemoData(db);
  console.log(`Seeded. Password for all accounts: ${DEMO_PASSWORD}\n  admin@dilis.ie  Platform admin\n` + DEMO_ACCOUNTS.map(([e, r]) => `  ${e}  ${r}`).join("\n"));
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
