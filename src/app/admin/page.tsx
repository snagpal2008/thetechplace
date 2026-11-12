import Link from "next/link";
import { and, eq, gte, sql } from "drizzle-orm";
import { invoices, orders, organizations } from "@/db/schema";
import { current } from "@/lib/current";
import { Money, PageHeader, Stat } from "@/components/ui";

export default async function AdminHome() {
  const { db } = await current("admin");
  const since = new Date(Date.now() - 30 * 86400000);
  const [[orgStats], [inv], [inv30], [ord]] = await Promise.all([
    db
      .select({
        directors: sql<number>`count(*) filter (where ${organizations.type} = 'funeral_home')::int`,
        vendors: sql<number>`count(*) filter (where ${organizations.type} = 'vendor' and ${organizations.status} = 'approved')::int`,
        pending: sql<number>`count(*) filter (where ${organizations.type} = 'vendor' and ${organizations.status} = 'pending')::int`,
      })
      .from(organizations),
    db
      .select({
        gmv: sql<number>`coalesce(sum(${invoices.totalCents}) filter (where ${invoices.status} = 'paid'), 0)::int`,
        fees: sql<number>`coalesce(sum(${invoices.platformFeeCents}) filter (where ${invoices.status} = 'paid'), 0)::int`,
        outstanding: sql<number>`coalesce(sum(${invoices.totalCents}) filter (where ${invoices.status} = 'issued'), 0)::int`,
        overdue: sql<number>`count(*) filter (where ${invoices.status} = 'issued' and ${invoices.dueAt} < now())::int`,
      })
      .from(invoices),
    db
      .select({ fees: sql<number>`coalesce(sum(${invoices.platformFeeCents}), 0)::int` })
      .from(invoices)
      .where(and(eq(invoices.status, "paid"), gte(invoices.paidAt, since))),
    db
      .select({
        total: sql<number>`count(*)::int`,
        open: sql<number>`count(*) filter (where ${orders.status} in ('requested','accepted','in_progress'))::int`,
      })
      .from(orders),
  ]);

  return (
    <>
      <PageHeader eyebrow="Dílis platform" title="Overview" />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Paid GMV" value={<Money cents={inv.gmv} />} hint="All paid invoices, incl. VAT" />
        <Stat label="Service charge earned" value={<Money cents={inv.fees} />} hint={`Last 30 days: ${(inv30.fees / 100).toLocaleString("en-IE", { style: "currency", currency: "EUR" })}`} />
        <Stat label="Outstanding" value={<Money cents={inv.outstanding} />} hint={`${inv.overdue} overdue`} href="/admin/invoices" />
        <Stat label="Orders" value={ord.total} hint={`${ord.open} open`} href="/admin/orders" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Funeral homes" value={orgStats.directors} />
        <Stat label="Approved vendors" value={orgStats.vendors} href="/admin/vendors" />
        <Stat label="Vendors awaiting review" value={orgStats.pending} href="/admin/vendors?status=pending" />
      </div>
      {orgStats.pending > 0 && (
        <p className="mt-6 text-sm"><Link href="/admin/vendors?status=pending" className="link">Review {orgStats.pending} pending vendor application(s) →</Link></p>
      )}
    </>
  );
}
