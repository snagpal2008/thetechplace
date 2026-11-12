import Link from "next/link";
import { and, count, eq } from "drizzle-orm";
import { services } from "@/db/schema";
import { current } from "@/lib/current";
import { listInvoices, listOrders } from "@/lib/domain";
import { Money, Notice, PageHeader, Stat } from "@/components/ui";
import { OrdersTable } from "@/components/tables";

export default async function VendorHome({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const { db, session, org } = await current("vendor");
  const [orders, invoices, [{ n: svcCount }]] = await Promise.all([
    listOrders(db, session),
    listInvoices(db, session),
    db.select({ n: count() }).from(services).where(and(eq(services.vendorOrgId, org.id), eq(services.active, true))),
  ]);
  const requests = orders.filter((o) => o.status === "requested");
  const inFlight = orders.filter((o) => ["accepted", "in_progress"].includes(o.status));
  const payout = (st: string) => invoices.filter((i) => i.status === st).reduce((s, i) => s + i.subtotalCents + i.vatCents, 0);

  return (
    <>
      <PageHeader eyebrow={org.name} title="Overview">
        <Link href="/vendor/services/new" className="btn-primary">Add a service</Link>
      </PageHeader>
      <div className="mb-6 space-y-3">
        {welcome && <Notice tone="ok">Welcome to Dílis. Add your services and prices, then connect Stripe to receive card payments.</Notice>}
        {org.status === "pending" && (
          <Notice tone="warn">Your account is awaiting approval. Funeral directors will see you in the marketplace once the Dílis team has verified your business.</Notice>
        )}
        {org.status === "suspended" && <Notice tone="warn">Your account is suspended. Contact Dílis support.</Notice>}
        {svcCount === 0 && <Notice>You haven't published any services. <Link href="/vendor/services/new" className="link">Build your rate card</Link>.</Notice>}
        {!org.stripeChargesEnabled && <Notice><Link href="/vendor/payments" className="link">Connect Stripe</Link> so directors can pay you by card.</Notice>}
      </div>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="New requests" value={requests.length} hint="Awaiting your response" href="/vendor/orders" />
        <Stat label="In progress" value={inFlight.length} href="/vendor/orders" />
        <Stat label="Awaiting payment" value={<Money cents={payout("issued")} />} href="/vendor/invoices" />
        <Stat label="Paid to date" value={<Money cents={payout("paid")} />} href="/vendor/invoices" />
      </div>
      <h2 className="mb-3 text-xl">Needs your attention</h2>
      <OrdersTable rows={[...requests, ...inFlight]} show="director" />
    </>
  );
}
