import { current } from "@/lib/current";
import { listInvoices } from "@/lib/domain";
import { Money, PageHeader, Stat } from "@/components/ui";
import { InvoicesTable } from "@/components/tables";

export const metadata = { title: "Invoices" };

export default async function Invoices() {
  const { db, session } = await current("director");
  const rows = await listInvoices(db, session);
  const unpaid = rows.filter((r) => r.status === "issued");
  const overdue = unpaid.filter((r) => r.dueAt.getTime() < Date.now());
  return (
    <>
      <PageHeader title="Invoices" />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Outstanding" value={<Money cents={unpaid.reduce((s, r) => s + r.totalCents, 0)} />} />
        <Stat label="Overdue" value={<Money cents={overdue.reduce((s, r) => s + r.totalCents, 0)} />} hint={`${overdue.length} invoice(s)`} />
        <Stat label="Paid to date" value={<Money cents={rows.filter((r) => r.status === "paid").reduce((s, r) => s + r.totalCents, 0)} />} />
      </div>
      <InvoicesTable rows={rows} show="vendor" />
    </>
  );
}
