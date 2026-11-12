import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { funeralCases, organizations, services } from "@/db/schema";
import { current } from "@/lib/current";
import { getSettings } from "@/lib/domain";
import { CATEGORY_LABELS } from "@/lib/labels";
import { Notice, PageHeader } from "@/components/ui";
import { OrderBuilder } from "./OrderBuilder";

export default async function VendorPage({ params, searchParams }: { params: Promise<{ vendorId: string }>; searchParams: Promise<{ case?: string }> }) {
  const { vendorId } = await params;
  const sp = await searchParams;
  const { db, session } = await current("director");
  if (!/^[0-9a-f-]{36}$/i.test(vendorId)) notFound();
  const [vendor] = await db
    .select()
    .from(organizations)
    .where(and(eq(organizations.id, vendorId), eq(organizations.type, "vendor"), eq(organizations.status, "approved")));
  if (!vendor) notFound();
  const [svc, cases, cfg] = await Promise.all([
    db.select().from(services).where(and(eq(services.vendorOrgId, vendor.id), eq(services.active, true))).orderBy(asc(services.unitPriceCents)),
    db
      .select()
      .from(funeralCases)
      .where(and(eq(funeralCases.directorOrgId, session.orgId), eq(funeralCases.status, "open")))
      .orderBy(desc(funeralCases.createdAt)),
    getSettings(db),
  ]);

  return (
    <>
      <PageHeader eyebrow={vendor.category ? CATEGORY_LABELS[vendor.category] : "Vendor"} title={vendor.name} />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="card p-5 md:col-span-2 text-sm text-ink-soft whitespace-pre-wrap">{vendor.description || "No description yet."}</div>
        <div className="card p-5 text-sm">
          <p className="label">Contact</p>
          <p>{vendor.phone || "—"}</p>
          <p className="truncate">{vendor.email}</p>
          <p className="mt-2 text-ink-mute">{vendor.address || vendor.county || ""}</p>
          {!vendor.stripeChargesEnabled && <p className="mt-3 text-xs text-brass">Card payment not yet set up — invoices payable by bank transfer.</p>}
        </div>
      </div>
      {!cases.length ? (
        <Notice tone="warn">Open a funeral case first — every order is attached to a case.</Notice>
      ) : !svc.length ? (
        <Notice>This vendor hasn't published a rate card yet.</Notice>
      ) : (
        <OrderBuilder
          vendorOrgId={vendor.id}
          services={svc.map((s) => ({ id: s.id, name: s.name, description: s.description, unit: s.unit, unitPriceCents: s.unitPriceCents, vatRateBps: s.vatRateBps, imageUrl: s.imageUrl }))}
          cases={cases.map((c) => ({ id: c.id, label: `${c.deceasedName} (${c.reference})`, location: c.location, funeralDate: c.funeralDate?.toISOString() ?? null }))}
          defaultCaseId={cases.some((c) => c.id === sp.case) ? sp.case! : cases[0].id}
          platformFeeBps={Number(cfg.platform_fee_bps)}
          minFeeCents={Number(cfg.platform_fee_min_cents)}
        />
      )}
    </>
  );
}
