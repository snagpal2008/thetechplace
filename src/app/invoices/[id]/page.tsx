import Link from "next/link";
import { notFound } from "next/navigation";
import { adminInvoiceAction, payInvoiceAction } from "@/app/actions";
import { ActionForm, Submit } from "@/components/forms";
import { fmtDate, InvoiceBadge, Money, Notice } from "@/components/ui";
import { PrintButton } from "@/components/PrintButton";
import { current } from "@/lib/current";
import { loadInvoice } from "@/lib/domain";
import { formatRate } from "@/lib/money";
import { reconcileCheckout, stripeEnabled } from "@/lib/stripe";

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ checkout?: string; cancelled?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { db, session } = await current();
  let justPaid = false;
  if (sp.checkout && stripeEnabled()) {
    try {
      justPaid = await reconcileCheckout(db, id, sp.checkout);
    } catch {
      /* webhook will reconcile */
    }
  }
  const inv = await loadInvoice(db, session, id);
  if (!inv) notFound();
  const items = inv.lines.filter((l) => l.kind === "item");
  const fee = inv.lines.find((l) => l.kind === "platform_fee");

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link href={`/orders/${inv.orderId}`} className="link text-sm">← Order #{inv.order.number}</Link>
        <PrintButton />
      </div>
      {justPaid && <div className="no-print"><Notice tone="ok">Payment received — thank you.</Notice></div>}
      {sp.cancelled && <div className="no-print"><Notice tone="warn">Payment was cancelled. The invoice is still open.</Notice></div>}

      <article className="card mx-auto max-w-3xl p-6 sm:p-10">
        <header className="flex flex-col gap-6 border-b border-paper-line pb-6 sm:flex-row sm:justify-between">
          <div>
            <p className="font-serif text-3xl">Invoice</p>
            <p className="mt-1 text-sm text-ink-mute">{inv.number}</p>
            <div className="mt-2"><InvoiceBadge status={inv.status} dueAt={inv.dueAt} /></div>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:text-right">
            <dt className="text-ink-mute">Issued</dt><dd>{fmtDate(inv.issuedAt)}</dd>
            <dt className="text-ink-mute">Due</dt><dd>{fmtDate(inv.dueAt)}</dd>
            {inv.paidAt && (<><dt className="text-ink-mute">Paid</dt><dd>{fmtDate(inv.paidAt)}</dd></>)}
            <dt className="text-ink-mute">Case</dt><dd>{inv.order.case.reference}</dd>
          </dl>
        </header>

        <section className="grid gap-6 border-b border-paper-line py-6 text-sm sm:grid-cols-2">
          <div>
            <p className="label">Bill to</p>
            <p className="font-semibold">{inv.director.name}</p>
            <p className="text-ink-soft">{inv.director.address || inv.director.county || ""}</p>
            {inv.director.vatNumber && <p className="text-ink-mute">VAT {inv.director.vatNumber}</p>}
          </div>
          <div>
            <p className="label">Supplied by</p>
            <p className="font-semibold">{inv.vendor.name}</p>
            <p className="text-ink-soft">{inv.vendor.address || inv.vendor.county || ""}</p>
            {inv.vendor.vatNumber && <p className="text-ink-mute">VAT {inv.vendor.vatNumber}</p>}
          </div>
          <div className="sm:col-span-2 text-ink-soft">
            Re: funeral of <span className="text-ink">{inv.order.case.deceasedName}</span> — order #{inv.order.number}
          </div>
        </section>

        <div className="overflow-x-auto">
          <table className="table min-w-[520px]">
            <thead><tr><th className="!px-0">Description</th><th className="text-right">Qty</th><th className="text-right">Unit</th><th className="text-right">VAT</th><th className="text-right !px-0">Net</th></tr></thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id}>
                  <td className="!px-0">{l.description}</td>
                  <td className="text-right tabular-nums">{l.quantity}</td>
                  <td className="text-right"><Money cents={l.unitPriceCents} /></td>
                  <td className="text-right text-ink-mute">{formatRate(l.vatRateBps)}</td>
                  <td className="text-right !px-0"><Money cents={l.netCents} /></td>
                </tr>
              ))}
              {fee && (
                <tr className="text-ink-soft">
                  <td className="!px-0">{fee.description}<div className="text-xs text-ink-mute">Charged by Dílis (FuneralDirector.ie)</div></td>
                  <td className="text-right">1</td>
                  <td className="text-right"><Money cents={fee.unitPriceCents} /></td>
                  <td className="text-right text-ink-mute">{formatRate(fee.vatRateBps)}</td>
                  <td className="text-right !px-0"><Money cents={fee.netCents} /></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <dl className="ml-auto mt-4 max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-ink-mute">Goods & services</dt><dd><Money cents={inv.subtotalCents} /></dd></div>
          <div className="flex justify-between"><dt className="text-ink-mute">VAT</dt><dd><Money cents={inv.vatCents} /></dd></div>
          <div className="flex justify-between"><dt className="text-ink-mute">Service charge</dt><dd><Money cents={inv.platformFeeCents} /></dd></div>
          <div className="flex justify-between"><dt className="text-ink-mute">VAT on service charge</dt><dd><Money cents={inv.platformFeeVatCents} /></dd></div>
          <div className="flex justify-between border-t border-paper-line pt-2 text-lg font-semibold"><dt>Total due</dt><dd><Money cents={inv.totalCents} /></dd></div>
        </dl>
      </article>

      {session.role === "director" && inv.status === "issued" && (
        <div className="no-print mx-auto max-w-3xl">
          <ActionForm action={payInvoiceAction} className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <input type="hidden" name="invoiceId" value={inv.id} />
            <p className="text-sm text-ink-soft">
              {stripeEnabled() && inv.vendor.stripeChargesEnabled
                ? "Pay securely by card or Apple/Google Pay via Stripe."
                : "Card payment isn't available for this vendor yet — please pay by bank transfer quoting the invoice number."}
            </p>
            {stripeEnabled() && inv.vendor.stripeChargesEnabled && <Submit>Pay <Money cents={inv.totalCents} /></Submit>}
          </ActionForm>
        </div>
      )}

      {session.role === "vendor" && (
        <div className="no-print mx-auto max-w-3xl">
          <Notice>
            Your payout for this invoice is <strong><Money cents={inv.subtotalCents + inv.vatCents} /></strong> (goods + VAT). The service charge is collected by Dílis.
          </Notice>
        </div>
      )}

      {session.role === "admin" && inv.status === "issued" && (
        <div className="no-print mx-auto max-w-3xl">
          <ActionForm action={adminInvoiceAction} className="card flex flex-wrap items-center gap-2 p-5">
            <input type="hidden" name="invoiceId" value={inv.id} />
            <p className="mr-auto text-sm text-ink-soft">Admin: record an off-platform payment or void this invoice.</p>
            <select name="method" className="input w-auto" defaultValue="bank_transfer">
              <option value="bank_transfer">Bank transfer</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
            <Submit name="op" value="paid">Mark paid</Submit>
            <Submit name="op" value="void" variant="danger">Void</Submit>
          </ActionForm>
        </div>
      )}
    </div>
  );
}
