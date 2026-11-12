"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { funeralCases, organizations, services, users, vendorCategoryEnum } from "@/db/schema";
import { homeFor } from "@/lib/auth-token";
import { current } from "@/lib/current";
import {
  authenticate,
  createCase,
  createOrder,
  DomainError,
  markInvoicePaid,
  postMessage,
  registerAccount,
  setSetting,
  transitionOrder,
  voidInvoice,
  loadInvoice,
} from "@/lib/domain";
import { parseEurosToCents } from "@/lib/money";
import type { OrderAction } from "@/lib/order-flow";
import { clearSession, setSessionCookie } from "@/lib/session";
import {
  createInvoiceCheckout,
  refreshVendorStripeStatus,
  stripeEnabled,
  vendorDashboardLink,
  vendorOnboardingLink,
} from "@/lib/stripe";

type Result = { error?: string; ok?: string } | undefined;

/** Turn expected errors into form messages; let redirects and real bugs propagate. */
async function guard(fn: () => Promise<Result | void>): Promise<Result> {
  try {
    return (await fn()) ?? undefined;
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    if (e instanceof z.ZodError) return { error: e.issues[0]?.message ?? "Invalid input" };
    if (e instanceof Error && /Invalid amount/.test(e.message)) return { error: e.message };
    throw e;
  }
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const optDate = (v: string) => (v ? new Date(v) : null);

/* ---------------- auth ---------------- */

export async function loginAction(_: Result, fd: FormData): Promise<Result> {
  const db = await getDb();
  const user = await authenticate(db, str(fd, "email"), str(fd, "password"));
  if (!user) return { error: "Email or password is incorrect" };
  await setSessionCookie({ uid: user.id, role: user.role, orgId: user.orgId, name: user.name });
  const next = str(fd, "next");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : homeFor(user.role));
}

const RegisterSchema = z.object({
  kind: z.enum(["director", "vendor"]),
  orgName: z.string().min(2, "Business name is required"),
  name: z.string().min(2, "Your name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
  county: z.string().optional(),
  vatNumber: z.string().optional(),
  category: z.enum(vendorCategoryEnum.enumValues).optional(),
});

export async function registerAction(_: Result, fd: FormData): Promise<Result> {
  const res = await guard(async () => {
    const input = RegisterSchema.parse({
      kind: str(fd, "kind"),
      orgName: str(fd, "orgName"),
      name: str(fd, "name"),
      email: str(fd, "email"),
      password: String(fd.get("password") ?? ""),
      phone: str(fd, "phone") || undefined,
      county: str(fd, "county") || undefined,
      vatNumber: str(fd, "vatNumber") || undefined,
      category: str(fd, "category") || undefined,
    });
    const db = await getDb();
    const { user } = await registerAccount(db, input);
    await setSessionCookie({ uid: user.id, role: user.role, orgId: user.orgId, name: user.name });
  });
  if (res?.error) return res;
  redirect(str(fd, "kind") === "vendor" ? "/vendor?welcome=1" : "/director?welcome=1");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

/* ---------------- director: cases & orders ---------------- */

export async function createCaseAction(_: Result, fd: FormData): Promise<Result> {
  let id = "";
  const res = await guard(async () => {
    const { db, session } = await current("director");
    const c = await createCase(db, session, {
      deceasedName: str(fd, "deceasedName"),
      funeralDate: optDate(str(fd, "funeralDate")),
      location: str(fd, "location"),
      familyContact: str(fd, "familyContact"),
      notes: str(fd, "notes"),
    });
    id = c.id;
  });
  if (res?.error) return res;
  redirect(`/director/cases/${id}`);
}

export async function closeCaseAction(fd: FormData) {
  const { db, session } = await current("director");
  const id = str(fd, "caseId");
  const status = str(fd, "status") === "open" ? "open" : "closed";
  await db
    .update(funeralCases)
    .set({ status })
    .where(and(eq(funeralCases.id, id), eq(funeralCases.directorOrgId, session.orgId)));
  revalidatePath(`/director/cases/${id}`);
}

export async function placeOrderAction(_: Result, fd: FormData): Promise<Result> {
  let id = "";
  const res = await guard(async () => {
    const { db, session } = await current("director");
    const items: { serviceId: string; quantity: number }[] = [];
    for (const [k, v] of fd.entries()) {
      if (k.startsWith("qty:")) {
        const q = Number(v);
        if (q > 0) items.push({ serviceId: k.slice(4), quantity: Math.floor(q) });
      }
    }
    const caseId = str(fd, "caseId");
    if (!caseId) throw new DomainError("Choose which funeral case this order is for");
    const o = await createOrder(db, session, {
      vendorOrgId: str(fd, "vendorOrgId"),
      caseId,
      items,
      requiredBy: optDate(str(fd, "requiredBy")),
      deliveryAddress: str(fd, "deliveryAddress"),
      notes: str(fd, "notes"),
    });
    id = o.id;
  });
  if (res?.error) return res;
  redirect(`/orders/${id}?placed=1`);
}

/* ---------------- shared: order workflow ---------------- */

export async function orderTransitionAction(_: Result, fd: FormData): Promise<Result> {
  const orderId = str(fd, "orderId");
  return guard(async () => {
    const { db, session } = await current();
    const r = await transitionOrder(db, session, orderId, str(fd, "action") as OrderAction, str(fd, "reason") || undefined);
    revalidatePath(`/orders/${orderId}`);
    return { ok: r.invoiceId ? "Marked delivered — invoice issued to the funeral director." : "Order updated." };
  });
}

export async function postMessageAction(_: Result, fd: FormData): Promise<Result> {
  const orderId = str(fd, "orderId");
  return guard(async () => {
    const { db, session } = await current();
    await postMessage(db, session, orderId, str(fd, "body"));
    revalidatePath(`/orders/${orderId}`);
  });
}

/* ---------------- payments ---------------- */

export async function payInvoiceAction(_: Result, fd: FormData): Promise<Result> {
  let url = "";
  const res = await guard(async () => {
    const { db, session } = await current("director");
    if (!stripeEnabled()) throw new DomainError("Card payments aren't enabled yet. Please pay by bank transfer.");
    const inv = await loadInvoice(db, session, str(fd, "invoiceId"));
    if (!inv) throw new DomainError("Invoice not found");
    const [me] = await db.select().from(users).where(eq(users.id, session.uid));
    url = await createInvoiceCheckout(db, inv, inv.vendor, me.email);
  });
  if (res?.error) return res;
  redirect(url);
}

export async function connectStripeAction(_: Result): Promise<Result> {
  let url = "";
  const res = await guard(async () => {
    const { db, org } = await current("vendor");
    url = await vendorOnboardingLink(db, org);
  });
  if (res?.error) return res;
  redirect(url);
}

export async function stripeDashboardAction(_: Result): Promise<Result> {
  let url = "";
  const res = await guard(async () => {
    const { org } = await current("vendor");
    url = await vendorDashboardLink(org);
  });
  if (res?.error) return res;
  redirect(url);
}

export async function refreshStripeAction(_: Result): Promise<Result> {
  return guard(async () => {
    const { db, org } = await current("vendor");
    const ok = await refreshVendorStripeStatus(db, org);
    revalidatePath("/vendor/payments");
    return ok ? { ok: "Stripe is connected — you can receive card payments." } : { error: "Stripe onboarding isn't complete yet." };
  });
}

/* ---------------- vendor: rate card & profile ---------------- */

const ServiceSchema = z.object({
  name: z.string().min(2, "Service name is required").max(120),
  description: z.string().max(1000).optional(),
  unit: z.string().min(1).max(30),
  unitPriceCents: z.number().int().min(0).max(10_000_000),
  vatRateBps: z.number().int().refine((v) => [0, 900, 1350, 2300].includes(v), "Choose a valid VAT rate"),
  imageUrl: z.string().url("Image must be a full URL (https://…)").optional(),
});

function parseService(fd: FormData) {
  return ServiceSchema.parse({
    name: str(fd, "name"),
    description: str(fd, "description") || undefined,
    unit: str(fd, "unit") || "each",
    unitPriceCents: parseEurosToCents(str(fd, "price")),
    vatRateBps: Number(str(fd, "vatRateBps")),
    imageUrl: str(fd, "imageUrl") || undefined,
  });
}

export async function saveServiceAction(_: Result, fd: FormData): Promise<Result> {
  const res = await guard(async () => {
    const { db, session } = await current("vendor");
    const data = parseService(fd);
    const id = str(fd, "serviceId");
    if (id) {
      await db
        .update(services)
        .set({ ...data, description: data.description ?? null, imageUrl: data.imageUrl ?? null })
        .where(and(eq(services.id, id), eq(services.vendorOrgId, session.orgId)));
    } else {
      await db.insert(services).values({ ...data, vendorOrgId: session.orgId });
    }
  });
  if (res?.error) return res;
  revalidatePath("/vendor/services");
  redirect("/vendor/services");
}

export async function toggleServiceAction(fd: FormData) {
  const { db, session } = await current("vendor");
  await db
    .update(services)
    .set({ active: str(fd, "active") === "true" })
    .where(and(eq(services.id, str(fd, "serviceId")), eq(services.vendorOrgId, session.orgId)));
  revalidatePath("/vendor/services");
}

export async function saveProfileAction(_: Result, fd: FormData): Promise<Result> {
  return guard(async () => {
    const { db, session } = await current("vendor", "director");
    await db
      .update(organizations)
      .set({
        name: str(fd, "name") || undefined,
        phone: str(fd, "phone") || null,
        address: str(fd, "address") || null,
        county: str(fd, "county") || null,
        vatNumber: str(fd, "vatNumber") || null,
        description: str(fd, "description") || null,
      })
      .where(eq(organizations.id, session.orgId));
    revalidatePath("/", "layout");
    return { ok: "Profile saved." };
  });
}

/* ---------------- admin ---------------- */

export async function setVendorStatusAction(fd: FormData) {
  const { db } = await current("admin");
  const status = str(fd, "status");
  if (!["approved", "suspended", "pending"].includes(status)) return;
  await db
    .update(organizations)
    .set({ status: status as "approved" | "suspended" | "pending" })
    .where(eq(organizations.id, str(fd, "orgId")));
  revalidatePath("/admin/vendors");
  revalidatePath("/admin");
}

export async function saveSettingsAction(_: Result, fd: FormData): Promise<Result> {
  return guard(async () => {
    const { db } = await current("admin");
    const pct = Number(str(fd, "platformFeePct"));
    const terms = Number(str(fd, "paymentTermsDays"));
    if (!(pct >= 0 && pct <= 50)) throw new DomainError("Service charge must be between 0% and 50%");
    if (!(Number.isInteger(terms) && terms >= 0 && terms <= 120)) throw new DomainError("Payment terms must be 0–120 days");
    const minCents = parseEurosToCents(str(fd, "platformFeeMin") || "0");
    await setSetting(db, "platform_fee_bps", String(Math.round(pct * 100)));
    await setSetting(db, "payment_terms_days", String(terms));
    await setSetting(db, "platform_fee_min_cents", String(minCents));
    revalidatePath("/admin/settings");
    return { ok: "Settings saved. New invoices will use these values." };
  });
}

export async function adminInvoiceAction(_: Result, fd: FormData): Promise<Result> {
  return guard(async () => {
    const { db, session } = await current("admin");
    const id = str(fd, "invoiceId");
    if (str(fd, "op") === "void") await voidInvoice(db, session, id);
    else await markInvoicePaid(db, id, { method: str(fd, "method") || "bank_transfer" });
    revalidatePath(`/invoices/${id}`);
    revalidatePath("/admin/invoices");
    return { ok: "Invoice updated." };
  });
}
