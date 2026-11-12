import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["director", "vendor", "admin"]);
export const orgTypeEnum = pgEnum("org_type", ["funeral_home", "vendor", "platform"]);
export const orgStatusEnum = pgEnum("org_status", ["pending", "approved", "suspended"]);
export const vendorCategoryEnum = pgEnum("vendor_category", [
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
]);
export const caseStatusEnum = pgEnum("case_status", ["open", "closed"]);
export const orderStatusEnum = pgEnum("order_status", [
  "requested",
  "accepted",
  "declined",
  "in_progress",
  "delivered",
  "cancelled",
]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["issued", "paid", "void"]);
export const lineKindEnum = pgEnum("line_kind", ["item", "platform_fee"]);
export const messageKindEnum = pgEnum("message_kind", ["user", "system"]);

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const organizations = pgTable(
  "organizations",
  {
    id: id(),
    type: orgTypeEnum("type").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    address: text("address"),
    county: text("county"),
    vatNumber: text("vat_number"),
    description: text("description"),
    category: vendorCategoryEnum("category"),
    status: orgStatusEnum("status").notNull().default("pending"),
    stripeAccountId: text("stripe_account_id"),
    stripeChargesEnabled: boolean("stripe_charges_enabled").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("org_type_status_idx").on(t.type, t.status)],
);

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: roleEnum("role").notNull(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_email_uq").on(sql`lower(${t.email})`)],
);

export const services = pgTable(
  "services",
  {
    id: id(),
    vendorOrgId: uuid("vendor_org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    unit: text("unit").notNull().default("each"),
    unitPriceCents: integer("unit_price_cents").notNull(),
    /** VAT rate in basis points: 2300 = 23%, 1350 = 13.5%, 0 = exempt */
    vatRateBps: integer("vat_rate_bps").notNull().default(2300),
    imageUrl: text("image_url"),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("services_vendor_idx").on(t.vendorOrgId)],
);

export const funeralCases = pgTable(
  "funeral_cases",
  {
    id: id(),
    directorOrgId: uuid("director_org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    reference: text("reference").notNull(),
    deceasedName: text("deceased_name").notNull(),
    funeralDate: timestamp("funeral_date", { withTimezone: true }),
    location: text("location"),
    familyContact: text("family_contact"),
    notes: text("notes"),
    status: caseStatusEnum("status").notNull().default("open"),
    createdAt: createdAt(),
  },
  (t) => [index("cases_director_idx").on(t.directorOrgId)],
);

export const orders = pgTable(
  "orders",
  {
    id: id(),
    number: integer("number").generatedAlwaysAsIdentity({ startWith: 1001 }).notNull(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => funeralCases.id, { onDelete: "restrict" }),
    directorOrgId: uuid("director_org_id")
      .notNull()
      .references(() => organizations.id),
    vendorOrgId: uuid("vendor_org_id")
      .notNull()
      .references(() => organizations.id),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    status: orderStatusEnum("status").notNull().default("requested"),
    requiredBy: timestamp("required_by", { withTimezone: true }),
    deliveryAddress: text("delivery_address"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("orders_director_idx").on(t.directorOrgId, t.status),
    index("orders_vendor_idx").on(t.vendorOrgId, t.status),
    index("orders_case_idx").on(t.caseId),
  ],
);

export const orderItems = pgTable("order_items", {
  id: id(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").references(() => services.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  vatRateBps: integer("vat_rate_bps").notNull(),
});

export const orderMessages = pgTable(
  "order_messages",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "set null" }),
    kind: messageKindEnum("kind").notNull().default("user"),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("messages_order_idx").on(t.orderId, t.createdAt)],
);

/** Gap-tolerant counter used to build invoice numbers like DIL-2026-000042 */
export const invoiceNumberSeq = pgSequence("invoice_number_seq", { startWith: 1 });

export const invoices = pgTable(
  "invoices",
  {
    id: id(),
    number: text("number").notNull(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    directorOrgId: uuid("director_org_id")
      .notNull()
      .references(() => organizations.id),
    vendorOrgId: uuid("vendor_org_id")
      .notNull()
      .references(() => organizations.id),
    status: invoiceStatusEnum("status").notNull().default("issued"),
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
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
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

export const invoiceLines = pgTable("invoice_lines", {
  id: id(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  kind: lineKindEnum("kind").notNull().default("item"),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  vatRateBps: integer("vat_rate_bps").notNull(),
  netCents: integer("net_cents").notNull(),
  vatCents: integer("vat_cents").notNull(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
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
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type Invoice = typeof invoices.$inferSelect;
export type VendorCategory = (typeof vendorCategoryEnum.enumValues)[number];
export type Role = (typeof roleEnum.enumValues)[number];
