import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { funeralCases } from "@/db/schema";
import { current } from "@/lib/current";
import { listInvoices, listOrders } from "@/lib/domain";
import { Money, Notice, PageHeader, Stat } from "@/components/ui";
import { OrdersTable } from "@/components/tables";

export default async function DirectorHome({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const { db, session, org } = await current("director");
  const [openCases, orders, invoices] = await Promise.all([
    db.select().from(funeralCases).where(and(eq(funeralCases.directorOrgId, session.orgId), eq(funeralCases.status, "open"))),
    listOrders(db, session, { limit: 8 }),
    listInvoices(db, session),
  ]);
  const active = orders.filter((o) => ["requested", "accepted", "in_progress"].includes(o.status));
  const unpaid = invoices.filter((i) => i.status === "issued");

  return (
    <>
      <PageHeader eyebrow={org.name} title={`Good to see you, ${session.name.split(" ")[0]}`}>
        <Link href="/director/cases/new" className="btn-primary">New funeral case</Link>
        <Link href="/director/marketplace" className="btn-secondary">Browse vendors</Link>
      </PageHeader>
      {welcome && (
        <div className="mb-6">
          <Notice tone="ok">Your account is ready. Start by opening a funeral case, then order services from the marketplace.</Notice>
        </div>
      )}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Open cases" value={openCases.length} href="/director/cases" />
        <Stat label="Active orders" value={active.length} hint="Requested, accepted or in progress" href="/director/orders" />
        <Stat
          label="To pay"
          value={<Money cents={unpaid.reduce((s, i) => s + i.totalCents, 0)} />}
          hint={`${unpaid.length} unpaid invoice${unpaid.length === 1 ? "" : "s"}`}
          href="/director/invoices"
        />
      </div>
      <h2 className="mb-3 text-xl">Recent orders</h2>
      <OrdersTable rows={orders} show="vendor" />
    </>
  );
}
