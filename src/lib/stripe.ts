import Stripe from "stripe";
import { eq } from "drizzle-orm";
import type { DB } from "@/db";
import { invoices, organizations, type Invoice, type Organization } from "@/db/schema";
import { DomainError, markInvoicePaid } from "./domain";

export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let client: Stripe | null = null;
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new DomainError("Stripe is not configured (STRIPE_SECRET_KEY missing)");
  // Fetch-based client works on both Node and Cloudflare Workers.
  client ??= new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
  return client;
}

export function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

/* ---------- Connect: vendor onboarding (Express accounts) ---------- */

export async function vendorOnboardingLink(db: DB, vendor: Organization): Promise<string> {
  const s = stripe();
  let accountId = vendor.stripeAccountId;
  if (!accountId) {
    const acct = await s.accounts.create({
      type: "express",
      country: "IE",
      email: vendor.email,
      business_profile: { name: vendor.name },
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      metadata: { orgId: vendor.id },
    });
    accountId = acct.id;
    await db.update(organizations).set({ stripeAccountId: accountId }).where(eq(organizations.id, vendor.id));
  }
  const link = await s.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${appUrl()}/vendor/payments?refresh=1`,
    return_url: `${appUrl()}/vendor/payments?return=1`,
  });
  return link.url;
}

export async function refreshVendorStripeStatus(db: DB, vendor: Organization): Promise<boolean> {
  if (!vendor.stripeAccountId) return false;
  const acct = await stripe().accounts.retrieve(vendor.stripeAccountId);
  const enabled = Boolean(acct.charges_enabled && acct.payouts_enabled);
  await db.update(organizations).set({ stripeChargesEnabled: enabled }).where(eq(organizations.id, vendor.id));
  return enabled;
}

export async function vendorDashboardLink(vendor: Organization): Promise<string> {
  if (!vendor.stripeAccountId) throw new DomainError("Stripe account not connected");
  return (await stripe().accounts.createLoginLink(vendor.stripeAccountId)).url;
}

/* ---------- Checkout: director pays invoice (destination charge) ---------- */

export async function createInvoiceCheckout(db: DB, inv: Invoice, vendor: Organization, payerEmail: string) {
  if (inv.status !== "issued") throw new DomainError("Invoice is not payable");
  if (!vendor.stripeAccountId || !vendor.stripeChargesEnabled)
    throw new DomainError("This vendor hasn't finished Stripe onboarding yet — pay by bank transfer or ask them to connect Stripe");

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: payerEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: inv.currency,
          unit_amount: inv.totalCents,
          product_data: { name: `Invoice ${inv.number}`, description: `${vendor.name} via Dílis` },
        },
      },
    ],
    payment_intent_data: {
      // Platform keeps its service charge (+VAT); the rest settles to the vendor.
      application_fee_amount: inv.platformFeeCents + inv.platformFeeVatCents,
      transfer_data: { destination: vendor.stripeAccountId },
      metadata: { invoiceId: inv.id, invoiceNumber: inv.number },
    },
    metadata: { invoiceId: inv.id },
    success_url: `${appUrl()}/invoices/${inv.id}?checkout={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/invoices/${inv.id}?cancelled=1`,
  });
  await db.update(invoices).set({ stripeCheckoutSessionId: session.id }).where(eq(invoices.id, inv.id));
  return session.url!;
}

/** Called on the success redirect so the invoice flips to paid even before the webhook lands. */
export async function reconcileCheckout(db: DB, invoiceId: string, sessionId: string) {
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  if (session.metadata?.invoiceId !== invoiceId) return false;
  if (session.payment_status !== "paid") return false;
  await markInvoicePaid(db, invoiceId, {
    method: "stripe",
    checkoutSessionId: session.id,
    paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
  });
  return true;
}

/* ---------- Webhook ---------- */

export async function handleStripeEvent(db: DB, event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const s = event.data.object as Stripe.Checkout.Session;
      const invoiceId = s.metadata?.invoiceId;
      if (invoiceId && s.payment_status === "paid") {
        await markInvoicePaid(db, invoiceId, {
          method: "stripe",
          checkoutSessionId: s.id,
          paymentIntentId: typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id,
        });
      }
      break;
    }
    case "account.updated": {
      const a = event.data.object as Stripe.Account;
      await db
        .update(organizations)
        .set({ stripeChargesEnabled: Boolean(a.charges_enabled && a.payouts_enabled) })
        .where(eq(organizations.stripeAccountId, a.id));
      break;
    }
  }
}
