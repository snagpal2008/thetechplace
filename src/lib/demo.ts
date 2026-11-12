import { eq, inArray } from "drizzle-orm";
import type { DB } from "@/db";
import { organizations, services, type VendorCategory } from "@/db/schema";
import { createCase, createOrder, registerAccount, transitionOrder, type Actor } from "./domain";

export const DEMO_PASSWORD = "dilis-demo-2026";

type VendorDef = { org: string; name: string; email: string; cat: VendorCategory; desc: string; approved: boolean; svc: [string, number, number, string?][] };

const VENDORS: VendorDef[] = [
  { org: "Clondalkin Flowers", name: "Niamh Byrne", email: "niamh@clondalkinflowers.ie", cat: "florist", approved: true, desc: "Family florist serving west Dublin funeral homes for 30 years. Same-day casket sprays and wreaths.", svc: [["Casket spray — white lilies & roses", 18000, 1350], ["Wreath, 18 inch", 9500, 1350], ["Letter tribute (per letter)", 4500, 1350], ["Sympathy posy", 3500, 1350]] },
  { org: "Dublin Prestige Limousines", name: "Paul Reilly", email: "paul@prestigelimos.ie", cat: "transport_limousine", approved: true, desc: "Black Mercedes limousines with uniformed chauffeurs.", svc: [["Limousine, up to 7 passengers", 32000, 2300, "car"], ["Additional hour", 6000, 2300, "hour"]] },
  { org: "Gathering Table Catering", name: "Sinéad Walsh", email: "sinead@gatheringtable.ie", cat: "catering", approved: true, desc: "Post-funeral receptions in hotels, halls and homes.", svc: [["Sandwich & soup reception", 1450, 1350, "person"], ["Hot buffet", 2450, 1350, "person"], ["Tea, coffee & scones", 650, 1350, "person"]] },
  { org: "Memorial Print Co.", name: "Brian Doyle", email: "brian@memorialprint.ie", cat: "printing_stationery", approved: true, desc: "Mass booklets, memorial cards and acknowledgement cards — 24h turnaround.", svc: [["Mass booklet (8 page), per 100", 22000, 2300, "100 copies"], ["Memorial cards, per 100", 9000, 2300, "100 cards"]] },
  { org: "Grace Presentation Services", name: "Mary Keane", email: "mary@gracepresentation.ie", cat: "embalming_presentation", approved: true, desc: "Qualified embalmers and presentation specialists.", svc: [["Embalming", 35000, 2300], ["Hair & make-up presentation", 9000, 2300]] },
  { org: "Harmony Celebrants", name: "Fiona Nolan", email: "fiona@harmonycelebrants.ie", cat: "celebrant_music", approved: false, desc: "Humanist celebrants and soloists.", svc: [["Soloist for church service", 25000, 0]] },
];

/** Loads demo funeral homes, vendors, rate cards and a live case with orders in several states. */
export async function loadDemoData(db: DB) {
  const fh1 = await registerAccount(db, { kind: "director", orgName: "Kavanagh & Sons Funeral Directors", name: "Aoife Kavanagh", email: "aoife@kavanagh.ie", password: DEMO_PASSWORD, county: "Dublin", phone: "01 457 0000", vatNumber: "IE6388047V" });
  await registerAccount(db, { kind: "director", orgName: "Liffey Valley Funeral Home", name: "Declan Murphy", email: "declan@liffeyvalley.ie", password: DEMO_PASSWORD, county: "Dublin" });

  const v: Record<string, Actor> = {};
  for (const [i, d] of VENDORS.entries()) {
    const { user, org } = await registerAccount(db, { kind: "vendor", orgName: d.org, name: d.name, email: d.email, password: DEMO_PASSWORD, category: d.cat, county: "Dublin", vatNumber: `IE${3100000 + i}A` });
    await db.update(organizations).set({ description: d.desc, status: d.approved ? "approved" : "pending" }).where(eq(organizations.id, org.id));
    await db.insert(services).values(d.svc.map(([name, cents, vat, unit]) => ({ vendorOrgId: org.id, name, unitPriceCents: cents, vatRateBps: vat, unit: unit ?? "each" })));
    v[d.cat] = { uid: user.id, role: "vendor", orgId: org.id, name: user.name };
  }

  const director: Actor = { uid: fh1.user.id, role: "director", orgId: fh1.org.id, name: fh1.user.name };
  const funeral = new Date(Date.now() + 2 * 86400000);
  funeral.setUTCHours(10, 0, 0, 0);
  const c1 = await createCase(db, director, { deceasedName: "Patrick O'Sullivan", funeralDate: funeral, location: "Church of the Immaculate Conception, Clondalkin", familyContact: "Mary O'Sullivan (daughter) 087 123 4567" });
  await createCase(db, director, { deceasedName: "Bridget Healy", location: "Newlands Cross Crematorium" });

  const svcIds = async (a: Actor) => (await db.select({ id: services.id }).from(services).where(inArray(services.vendorOrgId, [a.orgId]))).map((s) => s.id);

  const fl = await svcIds(v.florist);
  const o1 = await createOrder(db, director, { vendorOrgId: v.florist.orgId, caseId: c1.id, items: [{ serviceId: fl[0], quantity: 1 }, { serviceId: fl[2], quantity: 4 }], notes: "Letters: DADA. White and green only please." });
  await transitionOrder(db, v.florist, o1.id, "accept");
  await transitionOrder(db, v.florist, o1.id, "deliver"); // issues an invoice

  const li = await svcIds(v.transport_limousine);
  const o2 = await createOrder(db, director, { vendorOrgId: v.transport_limousine.orgId, caseId: c1.id, items: [{ serviceId: li[0], quantity: 2 }] });
  await transitionOrder(db, v.transport_limousine, o2.id, "accept");

  const ca = await svcIds(v.catering);
  await createOrder(db, director, { vendorOrgId: v.catering.orgId, caseId: c1.id, items: [{ serviceId: ca[0], quantity: 80 }, { serviceId: ca[2], quantity: 40 }], deliveryAddress: "Bewley's Hotel, Newlands Cross" });
}

export const DEMO_ACCOUNTS = [
  ["aoife@kavanagh.ie", "Funeral director"],
  ["declan@liffeyvalley.ie", "Funeral director (second home)"],
  ["niamh@clondalkinflowers.ie", "Vendor — florist"],
  ["paul@prestigelimos.ie", "Vendor — limousines"],
  ["sinead@gatheringtable.ie", "Vendor — catering"],
] as const;
