import { current } from "@/lib/current";
import { listInvoices } from "@/lib/domain";
import { PageHeader } from "@/components/ui";
import { InvoicesTable } from "@/components/tables";

export const metadata = { title: "All invoices" };

export default async function AdminInvoices() {
  const { db, session } = await current("admin");
  return (
    <>
      <PageHeader title="All invoices" />
      <InvoicesTable rows={await listInvoices(db, session, { limit: 500 })} show="both" />
    </>
  );
}
