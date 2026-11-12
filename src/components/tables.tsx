import Link from "next/link";
import type { Invoice, Order, Organization, FuneralCase } from "@/db/schema";
import { lineNet } from "@/lib/money";
import { Empty, fmtDate, InvoiceBadge, Money, OrderBadge } from "./ui";

type OrderRow = Order & {
  case: FuneralCase;
  vendor: Organization;
  director: Organization;
  items: { quantity: number; unitPriceCents: number; vatRateBps: number; description: string }[];
};

export function OrdersTable({ rows, show }: { rows: OrderRow[]; show: "vendor" | "director" | "both" }) {
  if (!rows.length) return <Empty title="No orders yet" />;
  return (
    <div className="card overflow-x-auto">
      <table className="table min-w-[640px]">
        <thead>
          <tr>
            <th>Order</th>
            <th>Case</th>
            {show !== "vendor" && <th>Vendor</th>}
            {show !== "director" && <th>Funeral home</th>}
            <th>Needed by</th>
            <th className="text-right">Value (ex VAT)</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} className="hover:bg-paper/60">
              <td>
                <Link href={`/orders/${o.id}`} className="link font-semibold">#{o.number}</Link>
                <div className="text-xs text-ink-mute">{o.items.map((i) => i.description).join(", ").slice(0, 60)}</div>
              </td>
              <td>
                <div>{o.case.deceasedName}</div>
                <div className="text-xs text-ink-mute">{o.case.reference}</div>
              </td>
              {show !== "vendor" && <td>{o.vendor.name}</td>}
              {show !== "director" && <td>{o.director.name}</td>}
              <td className="whitespace-nowrap">{fmtDate(o.requiredBy, true)}</td>
              <td className="text-right">
                <Money cents={o.items.reduce((s, i) => s + lineNet(i), 0)} />
              </td>
              <td><OrderBadge status={o.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type InvoiceRow = Invoice & { vendor: Organization; director: Organization; order: Order & { case: FuneralCase } };

export function InvoicesTable({ rows, show, amount = "total" }: { rows: InvoiceRow[]; show: "vendor" | "director" | "both"; amount?: "total" | "payout" }) {
  if (!rows.length) return <Empty title="No invoices yet">Invoices are issued automatically when a vendor marks an order delivered.</Empty>;
  return (
    <div className="card overflow-x-auto">
      <table className="table min-w-[640px]">
        <thead>
          <tr>
            <th>Invoice</th>
            {show !== "vendor" && <th>Vendor</th>}
            {show !== "director" && <th>Funeral home</th>}
            <th>Case</th>
            <th>Issued</th>
            <th>Due</th>
            <th className="text-right">{amount === "payout" ? "Your payout" : "Total"}</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => (
            <tr key={i.id} className="hover:bg-paper/60">
              <td><Link href={`/invoices/${i.id}`} className="link font-semibold whitespace-nowrap">{i.number}</Link></td>
              {show !== "vendor" && <td>{i.vendor.name}</td>}
              {show !== "director" && <td>{i.director.name}</td>}
              <td>{i.order.case.deceasedName}</td>
              <td className="whitespace-nowrap">{fmtDate(i.issuedAt)}</td>
              <td className="whitespace-nowrap">{fmtDate(i.dueAt)}</td>
              <td className="text-right font-semibold">
                <Money cents={amount === "payout" ? i.subtotalCents + i.vatCents : i.totalCents} />
              </td>
              <td><InvoiceBadge status={i.status} dueAt={i.dueAt} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
