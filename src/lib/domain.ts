import { hashPassword, verifyPassword } from "./password";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { DB } from "@/db";
import {
  funeralCases,
  invoiceLines,
  invoices,
  orderItems,
  orderMessages,
  orders,
  organizations,
  services,
  settings,
  users,
  type Role,
  type VendorCategory,
} from "@/db/schema";
import { computeInvoiceTotals, lineNet, lineVat, PLATFORM_FEE_VAT_BPS } from "./money";
import { nextStatus, ORDER_ACTIONS, type OrderAction } from "./order-flow";
import { ORDER_STATUS_LABELS } from "./labels";

export type Actor = { uid: string; role: Role; orgId: string; name: string };

export class DomainError extends Error {}

/* ---------------- settings ---------------- */

export const DEFAULT_SETTINGS = {
  platform_fee_bps: "1000", // 10% service charge on vendor subtotal
  platform_fee_min_cents: "0",
  payment_terms_days: "14",
};
export type SettingKey = keyof typeof DEFAULT_SETTINGS;

export async function getSettings(db: DB): Promise<Record<SettingKey, string>> {
  const rows = await db.select().from(settings);
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in out) out[r.key as SettingKey] = r.value;
  return out;
}

export async function setSetting(db: DB, key: SettingKey, value: string) {
  await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}

/* ---------------- accounts ---------------- */

export async function registerAccount(
  db: DB,
  input: {
    kind: "director" | "vendor";
    orgName: string;
    name: string;
    email: string;
    password: string;
    phone?: string;
    county?: string;
    vatNumber?: string;
    category?: VendorCategory;
  },
) {
  const email = input.email.trim().toLowerCase();
  if (input.password.length < 8) throw new DomainError("Password must be at least 8 characters");
  const existing = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${email}`);
  if (existing.length) throw new DomainError("An account with this email already exists");
  if (input.kind === "vendor" && !input.category) throw new DomainError("Choose a service category");

  const passwordHash = await hashPassword(input.password);
  return db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organizations)
      .values({
        type: input.kind === "vendor" ? "vendor" : "funeral_home",
        name: input.orgName.trim(),
        email,
        phone: input.phone || null,
        county: input.county || null,
        vatNumber: input.vatNumber || null,
        category: input.kind === "vendor" ? input.category : null,
        // Vendors are vetted by the platform before directors can order from them.
        status: input.kind === "vendor" ? "pending" : "approved",
      })
      .returning();
    const [user] = await tx
      .insert(users)
      .values({ email, name: input.name.trim(), passwordHash, role: input.kind, orgId: org.id })
      .returning();
    return { user, org };
  });
}

export async function authenticate(db: DB, email: string, password: string) {
  const [u] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`);
  if (!u) return null;
  return (await verifyPassword(password, u.passwordHash)) ? u : null;
}

/* ---------------- cases ---------------- */

export async function createCase(
  db: DB,
  actor: Actor,
  input: { deceasedName: string; funeralDate?: Date | null; location?: string; familyContact?: string; notes?: string },
) {
  if (actor.role !== "director") throw new DomainError("Only funeral directors create cases");
  if (!input.deceasedName.trim()) throw new DomainError("Name of the deceased is required");
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(funeralCases)
    .where(eq(funeralCases.directorOrgId, actor.orgId));
  const reference = `C-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
  const [row] = await db
    .insert(funeralCases)
    .values({
      directorOrgId: actor.orgId,
      reference,
      deceasedName: input.deceasedName.trim(),
      funeralDate: input.funeralDate ?? null,
      location: input.location || null,
      familyContact: input.familyContact || null,
      notes: input.notes || null,
    })
    .returning();
  return row;
}

/* ---------------- orders ---------------- */

export async function createOrder(
  db: DB,
  actor: Actor,
  input: {
    vendorOrgId: string;
    caseId: string;
    items: { serviceId: string; quantity: number }[];
    requiredBy?: Date | null;
    deliveryAddress?: string;
    notes?: string;
  },
) {
  if (actor.role !== "director") throw new DomainError("Only funeral directors place orders");
  const items = input.items.filter((i) => i.quantity > 0);
  if (!items.length) throw new DomainError("Add at least one service to the order");

  const [vendor] = await db.select().from(organizations).where(eq(organizations.id, input.vendorOrgId));
  if (!vendor || vendor.type !== "vendor" || vendor.status !== "approved")
    throw new DomainError("This vendor is not available");

  const [fcase] = await db
    .select()
    .from(funeralCases)
    .where(and(eq(funeralCases.id, input.caseId), eq(funeralCases.directorOrgId, actor.orgId)));
  if (!fcase) throw new DomainError("Case not found");
  if (fcase.status !== "open") throw new DomainError("Case is closed");

  const svc = await db
    .select()
    .from(services)
    .where(
      and(
        eq(services.vendorOrgId, vendor.id),
        eq(services.active, true),
        inArray(
          services.id,
          items.map((i) => i.serviceId),
        ),
      ),
    );
  const byId = new Map(svc.map((s) => [s.id, s]));
  for (const i of items) {
    if (!byId.has(i.serviceId)) throw new DomainError("A selected service is no longer available");
    if (!Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > 999) throw new DomainError("Invalid quantity");
  }

  return db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        caseId: fcase.id,
        directorOrgId: actor.orgId,
        vendorOrgId: vendor.id,
        createdByUserId: actor.uid,
        requiredBy: input.requiredBy ?? fcase.funeralDate ?? null,
        deliveryAddress: input.deliveryAddress || fcase.location || null,
        notes: input.notes || null,
      })
      .returning();
    await tx.insert(orderItems).values(
      items.map((i) => {
        const s = byId.get(i.serviceId)!;
        // Snapshot price + VAT so later rate-card changes don't alter this order.
        return {
          orderId: order.id,
          serviceId: s.id,
          description: s.name,
          quantity: i.quantity,
          unitPriceCents: s.unitPriceCents,
          vatRateBps: s.vatRateBps,
        };
      }),
    );
    await tx.insert(orderMessages).values({
      orderId: order.id,
      authorUserId: actor.uid,
      kind: "system",
      body: `Order #${order.number} placed by ${actor.name}`,
    });
    return order;
  });
}

function canAccessOrder(actor: Actor, o: { directorOrgId: string; vendorOrgId: string }) {
  return actor.role === "admin" || o.directorOrgId === actor.orgId || o.vendorOrgId === actor.orgId;
}

export async function loadOrder(db: DB, actor: Actor, orderId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return null;
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      case: true,
      director: true,
      vendor: true,
      items: true,
      invoice: true,
      messages: { with: { author: { columns: { name: true, role: true } } }, orderBy: (m, { asc }) => [asc(m.createdAt)] },
    },
  });
  if (!order || !canAccessOrder(actor, order)) return null;
  return order;
}

export async function transitionOrder(db: DB, actor: Actor, orderId: string, action: OrderAction, reason?: string) {
  return db.transaction(async (tx) => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!o || !canAccessOrder(actor, o)) throw new DomainError("Order not found");
    if (actor.role === "vendor" && o.vendorOrgId !== actor.orgId) throw new DomainError("Not your order");
    if (actor.role === "director" && o.directorOrgId !== actor.orgId) throw new DomainError("Not your order");

    let to;
    try {
      to = nextStatus(o.status, action, actor.role);
    } catch (e) {
      throw new DomainError((e as Error).message);
    }
    await tx.update(orders).set({ status: to, updatedAt: new Date() }).where(eq(orders.id, o.id));
    await tx.insert(orderMessages).values({
      orderId: o.id,
      authorUserId: actor.uid,
      kind: "system",
      body: `${actor.name} changed status to ${ORDER_STATUS_LABELS[to]}${reason ? ` — ${reason}` : ""}`,
    });
    let invoiceId: string | null = null;
    if (to === "delivered") invoiceId = (await issueInvoice(tx as unknown as DB, o.id)).id;
    return { status: to, invoiceId, label: ORDER_ACTIONS[action].label };
  });
}

export async function postMessage(db: DB, actor: Actor, orderId: string, body: string) {
  const text = body.trim();
  if (!text) throw new DomainError("Message is empty");
  if (text.length > 4000) throw new DomainError("Message is too long");
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!o || !canAccessOrder(actor, o)) throw new DomainError("Order not found");
  await db.insert(orderMessages).values({ orderId, authorUserId: actor.uid, body: text });
}

/* ---------------- invoices ---------------- */

/** Creates the invoice for a delivered order. Idempotent: returns the existing one if present. */
export async function issueInvoice(db: DB, orderId: string) {
  const [existing] = await db.select().from(invoices).where(eq(invoices.orderId, orderId));
  if (existing) return existing;

  const [o] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!o) throw new DomainError("Order not found");
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const cfg = await getSettings(db);
  const t = computeInvoiceTotals(items, Number(cfg.platform_fee_bps), Number(cfg.platform_fee_min_cents));

  const [{ n }] = (await db.execute(sql`select nextval('invoice_number_seq')::int as n`)).rows as { n: number }[];
  const number = `DIL-${new Date().getFullYear()}-${String(n).padStart(6, "0")}`;
  const dueAt = new Date(Date.now() + Number(cfg.payment_terms_days) * 86400000);

  const [inv] = await db
    .insert(invoices)
    .values({
      number,
      orderId,
      directorOrgId: o.directorOrgId,
      vendorOrgId: o.vendorOrgId,
      subtotalCents: t.subtotalCents,
      vatCents: t.vatCents,
      platformFeeCents: t.platformFeeCents,
      platformFeeVatCents: t.platformFeeVatCents,
      totalCents: t.totalCents,
      dueAt,
    })
    .returning();

  const lines: (typeof invoiceLines.$inferInsert)[] = items.map((i) => ({
    invoiceId: inv.id,
    kind: "item",
    description: i.description,
    quantity: i.quantity,
    unitPriceCents: i.unitPriceCents,
    vatRateBps: i.vatRateBps,
    netCents: lineNet(i),
    vatCents: lineVat(i),
  }));
  if (t.platformFeeCents > 0) {
    lines.push({
      invoiceId: inv.id,
      kind: "platform_fee",
      description: `Platform service charge (${Number(cfg.platform_fee_bps) / 100}%)`,
      quantity: 1,
      unitPriceCents: t.platformFeeCents,
      vatRateBps: PLATFORM_FEE_VAT_BPS,
      netCents: t.platformFeeCents,
      vatCents: t.platformFeeVatCents,
    });
  }
  await db.insert(invoiceLines).values(lines);
  await db.insert(orderMessages).values({
    orderId,
    kind: "system",
    body: `Invoice ${number} issued`,
  });
  return inv;
}

export async function loadInvoice(db: DB, actor: Actor, invoiceId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(invoiceId)) return null;
  const inv = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    with: {
      lines: { orderBy: (l, { asc }) => [asc(l.kind)] },
      director: true,
      vendor: true,
      order: { with: { case: true } },
    },
  });
  if (!inv || !canAccessOrder(actor, inv)) return null;
  return inv;
}

export async function markInvoicePaid(
  db: DB,
  invoiceId: string,
  info: { method: string; paymentIntentId?: string | null; checkoutSessionId?: string | null },
) {
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!inv) throw new DomainError("Invoice not found");
  if (inv.status === "paid") return inv; // idempotent (webhook + return URL can both fire)
  if (inv.status === "void") throw new DomainError("Invoice is void");
  const [updated] = await db
    .update(invoices)
    .set({
      status: "paid",
      paidAt: new Date(),
      paymentMethod: info.method,
      stripePaymentIntentId: info.paymentIntentId ?? inv.stripePaymentIntentId,
      stripeCheckoutSessionId: info.checkoutSessionId ?? inv.stripeCheckoutSessionId,
    })
    .where(eq(invoices.id, invoiceId))
    .returning();
  await db.insert(orderMessages).values({
    orderId: inv.orderId,
    kind: "system",
    body: `Invoice ${inv.number} paid (${info.method})`,
  });
  return updated;
}

export async function voidInvoice(db: DB, actor: Actor, invoiceId: string) {
  if (actor.role !== "admin") throw new DomainError("Only admins can void invoices");
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!inv) throw new DomainError("Invoice not found");
  if (inv.status === "paid") throw new DomainError("Paid invoices must be refunded in Stripe, not voided");
  await db.update(invoices).set({ status: "void" }).where(eq(invoices.id, invoiceId));
  await db.insert(orderMessages).values({ orderId: inv.orderId, kind: "system", body: `Invoice ${inv.number} voided by admin` });
}

/* ---------------- listings ---------------- */

export async function listOrders(db: DB, actor: Actor, opts: { status?: string[]; limit?: number } = {}) {
  const scope =
    actor.role === "admin"
      ? undefined
      : actor.role === "vendor"
        ? eq(orders.vendorOrgId, actor.orgId)
        : eq(orders.directorOrgId, actor.orgId);
  const statusFilter = opts.status?.length ? inArray(orders.status, opts.status as never[]) : undefined;
  return db.query.orders.findMany({
    where: and(scope, statusFilter),
    with: { case: true, vendor: true, director: true, items: true },
    orderBy: [desc(orders.createdAt)],
    limit: opts.limit ?? 100,
  });
}

export async function listInvoices(db: DB, actor: Actor, opts: { limit?: number } = {}) {
  const scope =
    actor.role === "admin"
      ? undefined
      : actor.role === "vendor"
        ? eq(invoices.vendorOrgId, actor.orgId)
        : eq(invoices.directorOrgId, actor.orgId);
  return db.query.invoices.findMany({
    where: scope,
    with: { vendor: true, director: true, order: { with: { case: true } } },
    orderBy: [desc(invoices.issuedAt)],
    limit: opts.limit ?? 200,
  });
}
