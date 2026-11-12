/**
 * Full order → invoice → payment flow against real SQLite (same engine as D1),
 * with the real migrations applied. `npm test` uses an in-memory database.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";

const enabled = Boolean(process.env.SQLITE_URL);

test("order lifecycle issues a correct invoice and records payment", { skip: !enabled }, async () => {
  const { getDb } = await import("../src/db");
  const { organizations, services, invoices, invoiceLines } = await import("../src/db/schema");
  const d = await import("../src/lib/domain");
  const db = await getDb();
  const { migrate } = await import("drizzle-orm/libsql/migrator");
  await migrate(db as never, { migrationsFolder: "drizzle" });
  const tag = Date.now().toString(36);

  const fh = await d.registerAccount(db, { kind: "director", orgName: `FH ${tag}`, name: "Dir", email: `d-${tag}@t.ie`, password: "password123" });
  const vn = await d.registerAccount(db, { kind: "vendor", orgName: `V ${tag}`, name: "Ven", email: `v-${tag}@t.ie`, password: "password123", category: "florist" });
  const director = { uid: fh.user.id, role: "director" as const, orgId: fh.org.id, name: "Dir" };
  const vendor = { uid: vn.user.id, role: "vendor" as const, orgId: vn.org.id, name: "Ven" };
  const other = await d.registerAccount(db, { kind: "director", orgName: `FH2 ${tag}`, name: "Other", email: `o-${tag}@t.ie`, password: "password123" });
  const otherActor = { uid: other.user.id, role: "director" as const, orgId: other.org.id, name: "Other" };

  const [svc] = await db.insert(services).values({ vendorOrgId: vn.org.id, name: "Wreath", unitPriceCents: 10000, vatRateBps: 1350 }).returning();
  const c = await d.createCase(db, director, { deceasedName: "Test Person" });

  // Pending vendors can't be ordered from
  await assert.rejects(d.createOrder(db, director, { vendorOrgId: vn.org.id, caseId: c.id, items: [{ serviceId: svc.id, quantity: 1 }] }), /not available/);
  await db.update(organizations).set({ status: "approved" }).where(eq(organizations.id, vn.org.id));

  const o = await d.createOrder(db, director, { vendorOrgId: vn.org.id, caseId: c.id, items: [{ serviceId: svc.id, quantity: 2 }] });
  // Price snapshot: later rate-card change doesn't affect the order
  await db.update(services).set({ unitPriceCents: 99999 }).where(eq(services.id, svc.id));

  // Other director can't see or touch it
  assert.equal(await d.loadOrder(db, otherActor, o.id), null);
  await assert.rejects(d.transitionOrder(db, otherActor, o.id, "cancel"), /not found/i);
  // Director can't accept
  await assert.rejects(d.transitionOrder(db, director, o.id, "accept"));

  await d.postMessage(db, director, o.id, "Please use white flowers");
  await d.transitionOrder(db, vendor, o.id, "accept");
  const r = await d.transitionOrder(db, vendor, o.id, "deliver");
  assert.ok(r.invoiceId);

  const [inv] = await db.select().from(invoices).where(eq(invoices.id, r.invoiceId!));
  const cfg = await d.getSettings(db);
  const feeBps = Number(cfg.platform_fee_bps);
  assert.equal(inv.subtotalCents, 20000);
  assert.equal(inv.vatCents, 2700);
  assert.equal(inv.platformFeeCents, Math.round((20000 * feeBps) / 10000));
  assert.equal(inv.totalCents, inv.subtotalCents + inv.vatCents + inv.platformFeeCents + inv.platformFeeVatCents);
  assert.match(inv.number, /^DIL-\d{4}-\d{6}$/);
  const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, inv.id));
  assert.equal(lines.reduce((s, l) => s + l.netCents + l.vatCents, 0), inv.totalCents);

  // Stale/concurrent transitions are rejected (optimistic concurrency)
  await assert.rejects(d.transitionOrder(db, vendor, o.id, "deliver"), /Cannot deliver/);

  // Sequential order numbers
  const o2 = await d.createOrder(db, director, { vendorOrgId: vn.org.id, caseId: c.id, items: [{ serviceId: svc.id, quantity: 1 }] });
  assert.equal(o2.number, o.number + 1);

  // Idempotent issue
  assert.equal((await d.issueInvoice(db, o.id)).id, inv.id);

  // Payment is idempotent
  await d.markInvoicePaid(db, inv.id, { method: "stripe", paymentIntentId: "pi_test" });
  const again = await d.markInvoicePaid(db, inv.id, { method: "stripe" });
  assert.equal(again.status, "paid");
  assert.equal(again.stripePaymentIntentId, "pi_test");

  const loaded = await d.loadOrder(db, director, o.id);
  assert.ok(loaded!.messages.some((m) => m.body.includes("paid")));
  assert.ok(loaded!.messages.some((m) => m.body === "Please use white flowers"));
  process.nextTick(() => process.exit(0));
});
