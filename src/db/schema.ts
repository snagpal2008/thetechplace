import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/* Enum value lists (SQLite has no enum type; drizzle enforces these in TypeScript). */
export const ROLES = ["director", "vendor", "admin"] as const;
export const ORG_TYPES = ["funeral_home", "vendor", "platform"] as const;
export const ORG_STATUSES = ["pending", "approved", "suspended"] as const;
export const VENDOR_CATEGORIES = [
  "florist",
  "coffins_caskets",
  "transport_limousine",
  "hearse_ambulance",
  "embalming_presentation",
  "celebrant_music",
  "catering",
  "printing_stationery",
  "crematorium",
  "cemetery_monuments",
  "other",
] as const;
export const CASE_STATUSES = ["open", "closed"] as const;
export const ORDER_STATUSES = ["requested", "accepted", "declined", "in_progress", "delivered", "cancelled"] as const;
export const INVOICE_STATUSES = ["issued", "paid", "void"] as const;
export const LINE_KINDS = ["item", "platform_fee"] as const;
export const MESSAGE_KINDS = ["user", "system"] as const;

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const ts = (name: string) => integer(name, { mode: "timestamp_ms" });
const createdAt = () =>
  ts("created_at")
    .notNull()
    .$defaultFn(() => new Date());
const bool = (name: string) => integer(name, { mode: "boolean" });

export const organizations = sqliteTable(
  "organizations",
  {
    id: id(),
    type: text("type", { enum: ORG_TYPES }).notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    address: text("address"),
    county: text("county"),
    vatNumber: text("vat_number"),
    description: text("description"),
    category: text("category", { enum: VENDOR_CATEGORIES }),
    status: text("status", { enum: ORG_STATUSES }).notNull().default("pending"),
    stripeAccountId: text("stripe_account_id"),
    stripeChargesEnabled: bool("stripe_charges_enabled").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("org_type_status_idx").on(t.type, t.status), index("org_stripe_idx").on(t.stripeAccountId)],
);

export const users = sqliteTable(
  "users",
  {
    id: id(),
    /** Always stored lower-cased */
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ROLES }).notNull(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email)],
);

export const services = sqliteTable(
  "services",
  {
    id: id(),
    vendorOrgId: text("vendor_org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    unit: text("unit").notNull().default("each"),
    unitPriceCents: integer("unit_price_cents").notNull(),
    /** VAT rate in basis points: 2300 = 23%, 1350 = 13.5%, 0 = exempt */
    vatRateBps: integer("vat_rate_bps").notNull().default(2300),
    imageUrl: text("image_url"),
    active: bool("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("services_vendor_idx").on(t.vendorOrgId)],
);

export const funeralCases = sqliteTable(
  "funeral_cases",
  {
    id: id(),
    directorOrgId: text("director_org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    reference: text("reference").notNull(),
    deceasedName: text("deceased_name").notNull(),
    funeralDate: ts("funeral_date"),
    location: text("location"),
    familyContact: text("family_contact"),
    notes: text("notes"),
    status: text("status", { enum: CASE_STATUSES }).notNull().default("open"),
    createdAt: createdAt(),
  },
  (t) => [index("cases_director_idx").on(t.directorOrgId)],
);

export const orders = sqliteTable(
  "orders",
  {
    id: id(),
    /** Human-friendly number, allocated from the counters table */
    number: integer("number").notNull(),
    caseId: text("case_id")
      .notNull()
      .references(() => funeralCases.id, { onDelete: "restrict" }),
    directorOrgId: text("director_org_id")
      .notNull()
      .references(() => organizations.id),
    vendorOrgId: text("vendor_org_id")
      .notNull()
      .references(() => organizations.id),
    createdByUserId: text("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    status: text("status", { enum: ORDER_STATUSES }).notNull().default("requested"),
    requiredBy: ts("required_by"),
    deliveryAddress: text("delivery_address"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: ts("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("orders_number_uq").on(t.number),
    index("orders_director_idx").on(t.directorOrgId, t.status),
    index("orders_vendor_idx").on(t.vendorOrgId, t.status),
    index("orders_case_idx").on(t.caseId),
  ],
);

export const orderItems = sqliteTable(
  "order_items",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    serviceId: text("service_id").references(() => services.id, { onDelete: "set null" }),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    vatRateBps: integer("vat_rate_bps").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const orderMessages = sqliteTable(
  "order_messages",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    authorUserId: text("author_user_id").references(() => users.id, { onDelete: "set null" }),
    kind: text("kind", { enum: MESSAGE_KINDS }).notNull().default("user"),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("messages_order_idx").on(t.orderId, t.createdAt)],
);

export const invoices = sqliteTable(
  "invoices",
  {
    id: id(),
    number: text("number").notNull(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    directorOrgId: text("director_org_id")
      .notNull()
      .references(() => organizations.id),
    vendorOrgId: text("vendor_org_id")
      .notNull()
      .references(() => organizations.id),
    status: text("status", { enum: INVOICE_STATUSES }).notNull().default("issued"),
    currency: text("currency").notNull().default("eur"),
    /** Vendor goods/services, ex VAT */
    subtotalCents: integer("subtotal_cents").notNull(),
    /** VAT on vendor goods/services */
    vatCents: integer("vat_cents").notNull(),
    /** Platform service charge ex VAT */
    platformFeeCents: integer("platform_fee_cents").notNull(),
    /** VAT on the platform service charge */
    platformFeeVatCents: integer("platform_fee_vat_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    issuedAt: ts("issued_at")
      .notNull()
      .$defaultFn(() => new Date()),
    dueAt: ts("due_at").notNull(),
    paidAt: ts("paid_at"),
    paymentMethod: text("payment_method"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
  },
  (t) => [
    uniqueIndex("invoices_number_uq").on(t.number),
    uniqueIndex("invoices_order_uq").on(t.orderId),
    index("invoices_director_idx").on(t.directorOrgId, t.status),
    index("invoices_vendor_idx").on(t.vendorOrgId, t.status),
  ],
);

export const invoiceLines = sqliteTable(
  "invoice_lines",
  {
    id: id(),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: LINE_KINDS }).notNull().default("item"),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    vatRateBps: integer("vat_rate_bps").notNull(),
    netCents: integer("net_cents").notNull(),
    vatCents: integer("vat_cents").notNull(),
  },
  (t) => [index("invoice_lines_invoice_idx").on(t.invoiceId)],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/** Atomic counters for human-readable numbers (orders, invoices, case refs). */
export const counters = sqliteTable("counters", {
  key: text("key").primaryKey(),
  value: integer("value").notNull().default(0),
});

/* ---------- relations (for db.query.*) ---------- */

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  services: many(services),
}));
export const usersRelations = relations(users, ({ one }) => ({
  org: one(organizations, { fields: [users.orgId], references: [organizations.id] }),
}));
export const servicesRelations = relations(services, ({ one }) => ({
  vendor: one(organizations, { fields: [services.vendorOrgId], references: [organizations.id] }),
}));
export const casesRelations = relations(funeralCases, ({ one, many }) => ({
  director: one(organizations, { fields: [funeralCases.directorOrgId], references: [organizations.id] }),
  orders: many(orders),
}));
export const ordersRelations = relations(orders, ({ one, many }) => ({
  case: one(funeralCases, { fields: [orders.caseId], references: [funeralCases.id] }),
  director: one(organizations, {
    fields: [orders.directorOrgId],
    references: [organizations.id],
    relationName: "orderDirector",
  }),
  vendor: one(organizations, {
    fields: [orders.vendorOrgId],
    references: [organizations.id],
    relationName: "orderVendor",
  }),
  items: many(orderItems),
  messages: many(orderMessages),
  invoice: one(invoices, { fields: [orders.id], references: [invoices.orderId] }),
}));
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));
export const orderMessagesRelations = relations(orderMessages, ({ one }) => ({
  order: one(orders, { fields: [orderMessages.orderId], references: [orders.id] }),
  author: one(users, { fields: [orderMessages.authorUserId], references: [users.id] }),
}));
export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  order: one(orders, { fields: [invoices.orderId], references: [orders.id] }),
  director: one(organizations, {
    fields: [invoices.directorOrgId],
    references: [organizations.id],
    relationName: "invoiceDirector",
  }),
  vendor: one(organizations, {
    fields: [invoices.vendorOrgId],
    references: [organizations.id],
    relationName: "invoiceVendor",
  }),
  lines: many(invoiceLines),
}));
export const invoiceLinesRelations = relations(invoiceLines, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceLines.invoiceId], references: [invoices.id] }),
}));

export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type Service = typeof services.$inferSelect;
export type FuneralCase = typeof funeralCases.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type Invoice = typeof invoices.$inferSelect;
export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];
export type Role = (typeof ROLES)[number];

export { sql };
