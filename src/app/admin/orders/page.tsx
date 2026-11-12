import { current } from "@/lib/current";
import { listOrders } from "@/lib/domain";
import { PageHeader } from "@/components/ui";
import { OrdersTable } from "@/components/tables";

export const metadata = { title: "All orders" };

export default async function AdminOrders() {
  const { db, session } = await current("admin");
  return (
    <>
      <PageHeader title="All orders" />
      <OrdersTable rows={await listOrders(db, session, { limit: 300 })} show="both" />
    </>
  );
}
