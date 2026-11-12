import { current } from "@/lib/current";
import { listInvoices } from "@/lib/domain";
import { PageHeader } from "@/components/ui";
import { InvoicesTable } from "@/components/tables";

export const metadata = { title: "Invoices" };

export default async function Invoices() {
  const { db, session } = await current("vendor");
  return (
    <>
      <PageHeader title="Invoices" />
      <InvoicesTable rows={await listInvoices(db, session)} show="director" amount="payout" />
    </>
  );
}
