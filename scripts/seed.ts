/**
 * Demo data for local dev / staging.  Usage:  npm run db:seed  [-- --reset]
 * All demo accounts use the password below.
 */
import { sql } from "drizzle-orm";
import { hashPassword } from "../src/lib/password";
import { getDb } from "../src/db";
import { organizations, services, users, type VendorCategory } from "../src/db/schema";
import { createCase, createOrder, registerAccount, setSetting, transitionOrder, type Actor } from "../src/lib/domain";

const PASSWORD = "dilis-demo-2026";

async function main() {
  const db = await getDb();
  const reset = process.argv.includes("--reset");
  const [{ n }] = (await db.execute(sql`select count(*)::int as n from users`)).rows as { n: number }[];
  if (n > 0 && !reset) {
    console.log("Database already has users — run with --reset to wipe and reseed.");
    process.exit(0);
  }
  if (reset) {
    await db.execute(sql`truncate invoice_lines, invoices, order_messages, order_items, orders, funeral_cases, services, users, organizations, settings restart identity cascade`);
    await db.execute(sql`alter sequence invoice_number_seq restart with 1`);
  }

  await setSetting(db, "platform_fee_bps", "1000");
  await setSetting(db, "payment_terms_days", "14");

  // Platform admin
  const [platform] = await db.insert(organizations).values({ type: "platform", name: "Dílis (FuneralDirector.ie)", email: "admin@dilis.ie", status: "approved" }).returning();
  await db.insert(users).values({ email: "admin@dilis.ie", name: "Platform Admin", role: "admin", orgId: platform.id, passwordHash: await hashPassword(PASSWORD) });

  // Funeral homes
  const fh1 = await registerAccount(db, { kind: "director", orgName: "Kavanagh & Sons Funeral Directors", name: "Aoife Kavanagh", email: "aoife@kavanagh.ie", password: PASSWORD, county: "Dublin", phone: "01 457 0000", vatNumber: "IE6388047V" });
  await registerAccount(db, { kind: "director", orgName: "Liffey Valley Funeral Home", name: "Declan Murphy", email: "declan@liffeyvalley.ie", password: PASSWORD, county: "Dublin" });

  // Vendors + rate cards
  const vendorDefs: { org: string; name: string; email: string; cat: VendorCategory; desc: string; svc: [string, number, number, string?][] }[] = [
    { org: "Clondalkin Flowers", name: "Niamh Byrne", email: "niamh@clondalkinflowers.ie", cat: "florist", desc: "Family florist serving west Dublin funeral homes for 30 years. Same-day casket sprays and wreaths.", svc: [["Casket spray — white lilies & roses", 18000, 1350], ["Wreath, 18 inch", 9500, 1350], ["Letter tribute (per letter)", 4500, 1350], ["Sympathy posy", 3500, 1350]] },
    { org: "Dublin Prestige Limousines", name: "Paul Reilly", email: "paul@prestigelimos.ie", cat: "transport_limousine", desc: "Black Mercedes limousines with uniformed chauffeurs.", svc: [["Limousine, up to 7 passengers", 32000, 2300, "car"], ["Additional hour", 6000, 2300, "hour"]] },
    { org: "Gathering Table Catering", name: "Sinéad Walsh", email: "sinead@gatheringtable.ie", cat: "catering", desc: "Post-funeral receptions in hotels, halls and homes.", svc: [["Sandwich & soup reception", 1450, 1350, "person"], ["Hot buffet", 2450, 1350, "person"], ["Tea, coffee & scones", 650, 1350, "person"]] },
    { org: "Memorial Print Co.", name: "Brian Doyle", email: "brian@memorialprint.ie", cat: "printing_stationery", desc: "Mass booklets, memorial cards and acknowledgement cards — 24h turnaround.", svc: [["Mass booklet (8 page), per 100", 22000, 2300, "100 copies"], ["Memorial cards, per 100", 9000, 2300, "100 cards"]] },
    { org: "Grace Presentation Services", name: "Mary Keane", email: "mary@gracepresentation.ie", cat: "embalming_presentation", desc: "Qualified embalmers and presentation specialists (BIE).", svc: [["Embalming", 35000, 2300], ["Hair & make-up presentation", 9000, 2300]] },
    { org: "Harmony Celebrants", name: "Fiona Nolan", email: "fiona@harmonycelebrants.ie", cat: "celebrant_music", desc: "Humanist celebrants and soloists.", svc: [["Soloist for church service", 25000, 0]] },
  ];
  const vendors: Record<string, { orgId: string; uid: string; name: string }> = {};
  for (const [i, v] of vendorDefs.entries()) {
    const { user, org } = await registerAccount(db, { kind: "vendor", orgName: v.org, name: v.name, email: v.email, password: PASSWORD, category: v.cat, county: "Dublin", vatNumber: `IE${3100000 + i}A` });
    // Last vendor stays pending to show the approval queue.
    if (i < vendorDefs.length - 1) await db.execute(sql`update organizations set status = 'approved', description = ${v.desc} where id = ${org.id}`);
    else await db.execute(sql`update organizations set description = ${v.desc} where id = ${org.id}`);
    await db.insert(services).values(v.svc.map(([name, cents, vat, unit]) => ({ vendorOrgId: org.id, name, unitPriceCents: cents, vatRateBps: vat, unit: unit ?? "each" })));
    vendors[v.cat] = { orgId: org.id, uid: user.id, name: user.name };
  }

  // A live case with orders in different states
  const director: Actor = { uid: fh1.user.id, role: "director", orgId: fh1.org.id, name: fh1.user.name };
  const funeral = new Date(Date.now() + 2 * 86400000);
  funeral.setUTCHours(10, 0, 0, 0);
  const c1 = await createCase(db, director, { deceasedName: "Patrick O'Sullivan", funeralDate: funeral, location: "Church of the Immaculate Conception, Clondalkin", familyContact: "Mary O'Sullivan (daughter) 087 123 4567" });
  await createCase(db, director, { deceasedName: "Bridget Healy", location: "Newlands Cross Crematorium" });

  const svcOf = async (cat: string) => (await db.select().from(services).where(sql`vendor_org_id = ${vendors[cat].orgId}`)).map((s) => s.id);
  const vActor = (cat: string): Actor => ({ uid: vendors[cat].uid, role: "vendor", orgId: vendors[cat].orgId, name: vendors[cat].name });

  const flowers = await svcOf("florist");
  const o1 = await createOrder(db, director, { vendorOrgId: vendors.florist.orgId, caseId: c1.id, items: [{ serviceId: flowers[0], quantity: 1 }, { serviceId: flowers[2], quantity: 4 }], notes: "Letters: DADA. White and green only please." });
  await transitionOrder(db, vActor("florist"), o1.id, "accept");
  await transitionOrder(db, vActor("florist"), o1.id, "deliver"); // issues an invoice

  const limo = await svcOf("transport_limousine");
  const o2 = await createOrder(db, director, { vendorOrgId: vendors.transport_limousine.orgId, caseId: c1.id, items: [{ serviceId: limo[0], quantity: 2 }] });
  await transitionOrder(db, vActor("transport_limousine"), o2.id, "accept");

  const food = await svcOf("catering");
  await createOrder(db, director, { vendorOrgId: vendors.catering.orgId, caseId: c1.id, items: [{ serviceId: food[0], quantity: 80 }, { serviceId: food[2], quantity: 40 }], deliveryAddress: "Bewley's Hotel, Newlands Cross" });

  console.log(`Seeded. Sign in with any of these (password: ${PASSWORD}):
  admin@dilis.ie            platform admin
  aoife@kavanagh.ie         funeral director
  niamh@clondalkinflowers.ie vendor (florist)
  paul@prestigelimos.ie     vendor (limousines)
  sinead@gatheringtable.ie  vendor (catering)`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
