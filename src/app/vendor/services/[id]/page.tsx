import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { services } from "@/db/schema";
import { current } from "@/lib/current";
import { PageHeader } from "@/components/ui";
import { ServiceForm } from "@/components/ServiceForm";

export default async function EditService({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, session } = await current("vendor");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [svc] = await db.select().from(services).where(and(eq(services.id, id), eq(services.vendorOrgId, session.orgId)));
  if (!svc) notFound();
  return (
    <>
      <PageHeader eyebrow="Rate card" title="Edit service" />
      <ServiceForm service={svc} />
    </>
  );
}
