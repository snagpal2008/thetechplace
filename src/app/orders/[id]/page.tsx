import Link from "next/link";
import { notFound } from "next/navigation";
import { orderTransitionAction, postMessageAction } from "@/app/actions";
import { ActionForm, Submit } from "@/components/forms";
import { fmtDate, InvoiceBadge, Money, Notice, OrderBadge, PageHeader } from "@/components/ui";
import { current } from "@/lib/current";
import { loadOrder } from "@/lib/domain";
import { lineNet, lineVat, formatRate } from "@/lib/money";
import { availableActions, ORDER_ACTIONS } from "@/lib/order-flow";

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ placed?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { db, session } = await current();
  const o = await loadOrder(db, session, id);
  if (!o) notFound();
  const actions = availableActions(o.status, session.role);
  const net = o.items.reduce((s, i) => s + lineNet(i), 0);
  const vat = o.items.reduce((s, i) => s + lineVat(i), 0);
  const counterpart = session.role === "vendor" ? o.director : o.vendor;

  return (
    <>
      <PageHeader eyebrow={`Order #${o.number}`} title={o.case.deceasedName}>
        <OrderBadge status={o.status} />
      </PageHeader>
      {sp.placed && <div className="mb-6"><Notice tone="ok">Order sent to {o.vendor.name}. You'll see their response here.</Notice></div>}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="card overflow-x-auto">
            <table className="table min-w-[520px]">
              <thead>
                <tr><th>Item</th><th className="text-right">Qty</th><th className="text-right">Unit</th><th className="text-right">VAT</th><th className="text-right">Net</th></tr>
              </thead>
              <tbody>
                {o.items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.description}</td>
                    <td className="text-right tabular-nums">{i.quantity}</td>
                    <td className="text-right"><Money cents={i.unitPriceCents} /></td>
                    <td className="text-right text-ink-mute">{formatRate(i.vatRateBps)}</td>
                    <td className="text-right"><Money cents={lineNet(i)} /></td>
                  </tr>
                ))}
                <tr><td colSpan={4} className="text-right text-ink-mute">Subtotal ex VAT</td><td className="text-right font-semibold"><Money cents={net} /></td></tr>
                <tr><td colSpan={4} className="text-right text-ink-mute">VAT</td><td className="text-right"><Money cents={vat} /></td></tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="mb-3 text-xl">Conversation</h2>
            <div className="card divide-y divide-paper-line">
              {o.messages.map((m) =>
                m.kind === "system" ? (
                  <div key={m.id} className="px-4 py-2.5 text-xs text-ink-mute">
                    <span className="tabular-nums">{fmtDate(m.createdAt, true)}</span> · {m.body}
                  </div>
                ) : (
                  <div key={m.id} className="px-4 py-3">
                    <p className="text-xs text-ink-mute">
                      <span className="font-semibold text-ink">{m.author?.name ?? "Unknown"}</span>
                      {m.author?.role ? ` · ${m.author.role}` : ""} · {fmtDate(m.createdAt, true)}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{m.body}</p>
                  </div>
                ),
              )}
              <ActionForm action={postMessageAction} className="p-4">
                <input type="hidden" name="orderId" value={o.id} />
                <label className="sr-only" htmlFor="body">Message</label>
                <textarea id="body" name="body" rows={2} required className="input" placeholder={`Message ${counterpart.name}…`} />
                <div className="mt-2 flex justify-end"><Submit variant="secondary">Send</Submit></div>
              </ActionForm>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          {actions.length > 0 && (
            <ActionForm action={orderTransitionAction} className="card space-y-3 p-5">
              <input type="hidden" name="orderId" value={o.id} />
              <p className="label">Next step</p>
              {actions.includes("decline") || actions.includes("cancel") ? (
                <input name="reason" className="input" placeholder="Reason (optional, shared on the order)" />
              ) : null}
              <div className="flex flex-wrap gap-2">
                {actions.map((a) => (
                  <Submit key={a} name="action" value={a} variant={a === "decline" || a === "cancel" ? "danger" : "primary"}>
                    {ORDER_ACTIONS[a].label}
                  </Submit>
                ))}
              </div>
            </ActionForm>
          )}

          {o.invoice && (
            <Link href={`/invoices/${o.invoice.id}`} className="card block p-5 hover:border-sage/40">
              <p className="label">Invoice</p>
              <div className="flex items-center justify-between">
                <span className="font-semibold">{o.invoice.number}</span>
                <InvoiceBadge status={o.invoice.status} dueAt={o.invoice.dueAt} />
              </div>
              <p className="mt-1 font-serif text-2xl"><Money cents={o.invoice.totalCents} /></p>
            </Link>
          )}

          <div className="card space-y-3 p-5 text-sm">
            <div><p className="label">Needed by</p><p>{fmtDate(o.requiredBy, true)}</p></div>
            <div><p className="label">Deliver to</p><p>{o.deliveryAddress || "—"}</p></div>
            {o.notes && <div><p className="label">Instructions</p><p className="whitespace-pre-wrap">{o.notes}</p></div>}
            <div>
              <p className="label">{session.role === "vendor" ? "Funeral home" : "Vendor"}</p>
              <p className="font-semibold">{counterpart.name}</p>
              <p className="text-ink-mute">{counterpart.phone || ""} {counterpart.email}</p>
            </div>
            <div><p className="label">Funeral</p><p>{fmtDate(o.case.funeralDate, true)} · {o.case.location || "—"}</p></div>
            {session.role === "director" && (
              <Link href={`/director/cases/${o.case.id}`} className="link text-xs">View case {o.case.reference}</Link>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
