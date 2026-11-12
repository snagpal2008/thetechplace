import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { services } from "@/db/schema";
import { toggleServiceAction } from "@/app/actions";
import { current } from "@/lib/current";
import { formatRate } from "@/lib/money";
import { Badge, Empty, Money, PageHeader } from "@/components/ui";

export const metadata = { title: "Rate card" };

export default async function Services() {
  const { db, session } = await current("vendor");
  const rows = await db.select().from(services).where(eq(services.vendorOrgId, session.orgId)).orderBy(asc(services.name));
  return (
    <>
      <PageHeader eyebrow="What directors can order" title="Rate card">
        <Link href="/vendor/services/new" className="btn-primary">Add service</Link>
      </PageHeader>
      {!rows.length ? (
        <Empty title="No services yet"><Link href="/vendor/services/new" className="link">Add your first service</Link> with a price and photo.</Empty>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table min-w-[600px]">
            <thead><tr><th>Service</th><th className="text-right">Price</th><th>VAT</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td>
                    <p className="font-semibold">{s.name}</p>
                    {s.description && <p className="text-xs text-ink-mute line-clamp-1">{s.description}</p>}
                  </td>
                  <td className="text-right whitespace-nowrap"><Money cents={s.unitPriceCents} /> <span className="text-ink-mute">/ {s.unit}</span></td>
                  <td>{formatRate(s.vatRateBps)}</td>
                  <td>{s.active ? <Badge className="bg-sage-light text-sage-dark">Live</Badge> : <Badge className="bg-paper text-ink-mute">Hidden</Badge>}</td>
                  <td className="whitespace-nowrap text-right">
                    <Link href={`/vendor/services/${s.id}`} className="link mr-3 text-xs">Edit</Link>
                    <form action={toggleServiceAction} className="inline">
                      <input type="hidden" name="serviceId" value={s.id} />
                      <input type="hidden" name="active" value={String(!s.active)} />
                      <button className="link text-xs">{s.active ? "Hide" : "Publish"}</button>
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
