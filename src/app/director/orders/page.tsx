import { current } from "@/lib/current";
import { listOrders } from "@/lib/domain";
import { PageHeader } from "@/components/ui";
import { OrdersTable } from "@/components/tables";

export const metadata = { title: "Orders" };

export default async function Orders() {
  const { db, session } = await current("director");
  return (
    <>
      <PageHeader title="Orders" />
      <OrdersTable rows={await listOrders(db, session)} show="vendor" />
    </>
  );
}
