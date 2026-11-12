import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { funeralCases, orders } from "@/db/schema";
import { current } from "@/lib/current";
import { Badge, Empty, fmtDate, PageHeader } from "@/components/ui";

export const metadata = { title: "Funeral cases" };

export default async function Cases() {
  const { db, session } = await current("director");
  const rows = await db
    .select({
      c: funeralCases,
      orderCount: sql<number>`(select count(*)::int from ${orders} where ${orders.caseId} = ${funeralCases.id})`,
    })
    .from(funeralCases)
    .where(eq(funeralCases.directorOrgId, session.orgId))
    .orderBy(desc(funeralCases.createdAt));

  return (
    <>
      <PageHeader title="Funeral cases">
        <Link href="/director/cases/new" className="btn-primary">New case</Link>
      </PageHeader>
      {!rows.length ? (
        <Empty title="No cases yet">
          <Link href="/director/cases/new" className="link">Open your first case</Link> to start ordering services.
        </Empty>
      ) : (
        <div className="grid gap-3">
          {rows.map(({ c, orderCount }) => (
            <Link key={c.id} href={`/director/cases/${c.id}`} className="card flex flex-col gap-1 p-4 hover:border-sage/40 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-serif text-lg">{c.deceasedName}</p>
                <p className="text-xs text-ink-mute">{c.reference} · {c.location || "Venue TBC"}</p>
              </div>
              <div className="flex items-center gap-4 text-sm text-ink-soft">
                <span>Funeral {fmtDate(c.funeralDate, true)}</span>
                <span>{orderCount} order{orderCount === 1 ? "" : "s"}</span>
                <Badge className={c.status === "open" ? "bg-sage-light text-sage-dark" : "bg-paper text-ink-mute"}>{c.status}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
