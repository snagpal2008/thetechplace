import Link from "next/link";
import { and, asc, eq, sql } from "drizzle-orm";
import { organizations, services, VENDOR_CATEGORIES, type VendorCategory } from "@/db/schema";
import { current } from "@/lib/current";
import { CATEGORY_LABELS } from "@/lib/labels";
import { Empty, Money, PageHeader } from "@/components/ui";

export const metadata = { title: "Marketplace" };

export default async function Marketplace({ searchParams }: { searchParams: Promise<{ category?: string; q?: string; case?: string }> }) {
  const sp = await searchParams;
  const { db } = await current("director");
  const category = (VENDOR_CATEGORIES as readonly string[]).includes(sp.category ?? "") ? (sp.category as VendorCategory) : undefined;
  const q = (sp.q ?? "").trim();

  const vendors = await db
    .select({
      v: organizations,
      serviceCount: sql<number>`count(${services.id})`,
      fromCents: sql<number | null>`min(${services.unitPriceCents})`,
    })
    .from(organizations)
    .leftJoin(services, and(eq(services.vendorOrgId, organizations.id), eq(services.active, true)))
    .where(
      and(
        eq(organizations.type, "vendor"),
        eq(organizations.status, "approved"),
        category ? eq(organizations.category, category) : undefined,
        q ? sql`(lower(${organizations.name}) like ${"%" + q.toLowerCase() + "%"} or lower(coalesce(${organizations.description}, '')) like ${"%" + q.toLowerCase() + "%"})` : undefined,
      ),
    )
    .groupBy(organizations.id)
    .orderBy(asc(organizations.name));

  const caseQS = sp.case ? `?case=${sp.case}` : "";
  const chip = (c: VendorCategory | undefined, label: string) => {
    const params = new URLSearchParams();
    if (c) params.set("category", c);
    if (sp.case) params.set("case", sp.case);
    return (
      <Link
        key={label}
        href={`/director/marketplace?${params}`}
        className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm ${category === c ? "border-sage bg-sage text-white" : "border-paper-line bg-white text-ink-soft hover:border-sage/40"}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      <PageHeader eyebrow="Vetted suppliers" title="Marketplace" />
      <form className="mb-4 flex gap-2">
        {category && <input type="hidden" name="category" value={category} />}
        {sp.case && <input type="hidden" name="case" value={sp.case} />}
        <input name="q" defaultValue={q} placeholder="Search vendors…" className="input max-w-sm" />
        <button className="btn-secondary">Search</button>
      </form>
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {chip(undefined, "All")}
        {VENDOR_CATEGORIES.map((c) => chip(c, CATEGORY_LABELS[c]))}
      </div>
      {!vendors.length ? (
        <Empty title="No vendors match">Try another category, or check back as new suppliers are approved.</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map(({ v, serviceCount, fromCents }) => (
            <Link key={v.id} href={`/director/marketplace/${v.id}${caseQS}`} className="card flex flex-col p-5 hover:border-sage/40">
              <p className="eyebrow">{v.category ? CATEGORY_LABELS[v.category] : "Vendor"}</p>
              <p className="mt-1 font-serif text-xl">{v.name}</p>
              <p className="mt-2 line-clamp-3 flex-1 text-sm text-ink-soft">{v.description || "—"}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-ink-mute">
                <span>{v.county || "Ireland"} · {serviceCount} service{serviceCount === 1 ? "" : "s"}</span>
                {fromCents != null && <span>from <Money cents={fromCents} className="font-semibold text-ink" /></span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
