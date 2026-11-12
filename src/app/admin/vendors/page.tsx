import Link from "next/link";
import { and, asc, eq, sql } from "drizzle-orm";
import { organizations, services } from "@/db/schema";
import { setVendorStatusAction } from "@/app/actions";
import { current } from "@/lib/current";
import { CATEGORY_LABELS } from "@/lib/labels";
import { Badge, Empty, fmtDate, PageHeader } from "@/components/ui";

export const metadata = { title: "Vendors" };

const TONE = { approved: "bg-sage-light text-sage-dark", pending: "bg-brass-light text-brass", suspended: "bg-alert-light text-alert" };

export default async function Vendors({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const { db } = await current("admin");
  const filter = status === "pending" || status === "approved" || status === "suspended" ? status : undefined;
  const rows = await db
    .select({ v: organizations, svc: sql<number>`count(${services.id})::int` })
    .from(organizations)
    .leftJoin(services, eq(services.vendorOrgId, organizations.id))
    .where(and(eq(organizations.type, "vendor"), filter ? eq(organizations.status, filter) : undefined))
    .groupBy(organizations.id)
    .orderBy(sql`case ${organizations.status} when 'pending' then 0 when 'approved' then 1 else 2 end`, asc(organizations.name));

  return (
    <>
      <PageHeader title="Vendors" />
      <div className="mb-4 flex gap-2 text-sm">
        {[undefined, "pending", "approved", "suspended"].map((s) => (
          <Link key={s ?? "all"} href={s ? `/admin/vendors?status=${s}` : "/admin/vendors"} className={`rounded-full border px-3 py-1 ${filter === s ? "border-sage bg-sage text-white" : "border-paper-line bg-white"}`}>
            {s ?? "all"}
          </Link>
        ))}
      </div>
      {!rows.length ? (
        <Empty title="No vendors" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table min-w-[760px]">
            <thead><tr><th>Vendor</th><th>Category</th><th>Contact</th><th>Services</th><th>Stripe</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map(({ v, svc }) => (
                <tr key={v.id}>
                  <td><p className="font-semibold">{v.name}</p><p className="text-xs text-ink-mute">Joined {fmtDate(v.createdAt)} · {v.county || "—"} · VAT {v.vatNumber || "—"}</p></td>
                  <td>{v.category ? CATEGORY_LABELS[v.category] : "—"}</td>
                  <td className="text-xs">{v.email}<br />{v.phone}</td>
                  <td>{svc}</td>
                  <td>{v.stripeChargesEnabled ? "✓" : "—"}</td>
                  <td><Badge className={TONE[v.status]}>{v.status}</Badge></td>
                  <td className="whitespace-nowrap text-right">
                    <form action={setVendorStatusAction} className="inline-flex gap-1">
                      <input type="hidden" name="orgId" value={v.id} />
                      {v.status !== "approved" && <button name="status" value="approved" className="btn-primary btn-sm">Approve</button>}
                      {v.status !== "suspended" && <button name="status" value="suspended" className="btn-danger btn-sm">Suspend</button>}
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
