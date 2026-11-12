import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { funeralCases, orders } from "@/db/schema";
import { closeCaseAction } from "@/app/actions";
import { current } from "@/lib/current";
import { lineNet } from "@/lib/money";
import { Badge, fmtDate, Money, PageHeader } from "@/components/ui";
import { OrdersTable } from "@/components/tables";

export default async function CaseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, session } = await current("director");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const c = await db.query.funeralCases.findFirst({
    where: and(eq(funeralCases.id, id), eq(funeralCases.directorOrgId, session.orgId)),
    with: { orders: { with: { vendor: true, director: true, items: true, case: true }, orderBy: [desc(orders.createdAt)] } },
  });
  if (!c) notFound();
  const live = c.orders.filter((o) => !["declined", "cancelled"].includes(o.status));
  const committed = live.reduce((s, o) => s + o.items.reduce((a, i) => a + lineNet(i), 0), 0);

  return (
    <>
      <PageHeader eyebrow={`Case ${c.reference}`} title={c.deceasedName}>
        {c.status === "open" && <Link href={`/director/marketplace?case=${c.id}`} className="btn-primary">Order a service</Link>}
        <form action={closeCaseAction}>
          <input type="hidden" name="caseId" value={c.id} />
          <input type="hidden" name="status" value={c.status === "open" ? "closed" : "open"} />
          <button className="btn-secondary">{c.status === "open" ? "Close case" : "Reopen case"}</button>
        </form>
      </PageHeader>
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="card p-5 md:col-span-2">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="label">Funeral</dt><dd>{fmtDate(c.funeralDate, true)}</dd></div>
            <div><dt className="label">Venue</dt><dd>{c.location || "—"}</dd></div>
            <div><dt className="label">Family contact</dt><dd>{c.familyContact || "—"}</dd></div>
            <div><dt className="label">Status</dt><dd><Badge className={c.status === "open" ? "bg-sage-light text-sage-dark" : "bg-paper text-ink-mute"}>{c.status}</Badge></dd></div>
            {c.notes && <div className="sm:col-span-2"><dt className="label">Notes</dt><dd className="whitespace-pre-wrap">{c.notes}</dd></div>}
          </dl>
        </div>
        <div className="card p-5">
          <p className="label">Committed with vendors</p>
          <p className="font-serif text-3xl"><Money cents={committed} /></p>
          <p className="mt-1 text-xs text-ink-mute">{live.length} active order{live.length === 1 ? "" : "s"}, ex VAT & service charge</p>
        </div>
      </div>
      <h2 className="mb-3 text-xl">Orders for this case</h2>
      <OrdersTable rows={c.orders} show="vendor" />
    </>
  );
}
