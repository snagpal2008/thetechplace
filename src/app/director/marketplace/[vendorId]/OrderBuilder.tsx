"use client";

import { useMemo, useState } from "react";
import { placeOrderAction } from "@/app/actions";
import { ActionForm, Submit } from "@/components/forms";
import { computeInvoiceTotals, formatEUR, formatRate } from "@/lib/money";

type Svc = { id: string; name: string; description: string | null; unit: string; unitPriceCents: number; vatRateBps: number; imageUrl: string | null };
type CaseOpt = { id: string; label: string; location: string | null; funeralDate: string | null };

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function OrderBuilder(props: { vendorOrgId: string; services: Svc[]; cases: CaseOpt[]; defaultCaseId: string; platformFeeBps: number; minFeeCents: number }) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [caseId, setCaseId] = useState(props.defaultCaseId);
  const selectedCase = props.cases.find((c) => c.id === caseId);

  const totals = useMemo(() => {
    const lines = props.services.filter((s) => (qty[s.id] ?? 0) > 0).map((s) => ({ quantity: qty[s.id], unitPriceCents: s.unitPriceCents, vatRateBps: s.vatRateBps }));
    return lines.length ? computeInvoiceTotals(lines, props.platformFeeBps, props.minFeeCents) : null;
  }, [qty, props.services, props.platformFeeBps, props.minFeeCents]);

  const bump = (id: string, d: number) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(999, (q[id] ?? 0) + d)) }));

  return (
    <ActionForm action={placeOrderAction} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <input type="hidden" name="vendorOrgId" value={props.vendorOrgId} />
      <div className="space-y-3">
        <h2 className="text-xl">Rate card</h2>
        {props.services.map((s) => (
          <div key={s.id} className={`card flex gap-4 p-4 ${qty[s.id] ? "border-sage/50" : ""}`}>
            {s.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{s.name}</p>
              {s.description && <p className="mt-0.5 text-sm text-ink-soft">{s.description}</p>}
              <p className="mt-1 text-sm">
                <span className="font-semibold tabular-nums">{formatEUR(s.unitPriceCents)}</span>
                <span className="text-ink-mute"> / {s.unit} · VAT {formatRate(s.vatRateBps)}</span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" onClick={() => bump(s.id, -1)} className="btn-secondary btn-sm h-8 w-8 p-0" aria-label={`Fewer ${s.name}`}>−</button>
              <input
                name={`qty:${s.id}`}
                inputMode="numeric"
                value={qty[s.id] ?? 0}
                onChange={(e) => setQty((q) => ({ ...q, [s.id]: Math.max(0, Math.min(999, Number(e.target.value.replace(/\D/g, "")) || 0)) }))}
                className="input w-12 px-1 py-1 text-center"
                aria-label={`Quantity of ${s.name}`}
              />
              <button type="button" onClick={() => bump(s.id, 1)} className="btn-secondary btn-sm h-8 w-8 p-0" aria-label={`More ${s.name}`}>+</button>
            </div>
          </div>
        ))}
      </div>

      <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-6">
        <h2 className="text-xl">Order details</h2>
        <div>
          <label className="label" htmlFor="caseId">For case</label>
          <select id="caseId" name="caseId" value={caseId} onChange={(e) => setCaseId(e.target.value)} className="input">
            {props.cases.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="requiredBy">Needed by</label>
          <input key={caseId + "d"} id="requiredBy" name="requiredBy" type="datetime-local" defaultValue={toLocalInput(selectedCase?.funeralDate ?? null)} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="deliveryAddress">Deliver to</label>
          <input key={caseId + "a"} id="deliveryAddress" name="deliveryAddress" defaultValue={selectedCase?.location ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="notes">Instructions</label>
          <textarea id="notes" name="notes" rows={3} className="input" placeholder="Colours, wording on cards, timings…" />
        </div>
        <div className="border-t border-paper-line pt-4 text-sm">
          {totals ? (
            <dl className="space-y-1.5">
              <Row k="Services (ex VAT)" v={totals.subtotalCents} />
              <Row k="VAT" v={totals.vatCents} />
              <Row k={`Service charge (${props.platformFeeBps / 100}%)`} v={totals.platformFeeCents} />
              <Row k="VAT on service charge" v={totals.platformFeeVatCents} />
              <div className="flex justify-between border-t border-paper-line pt-2 text-base font-semibold">
                <dt>Estimated total</dt>
                <dd className="tabular-nums">{formatEUR(totals.totalCents)}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-ink-mute">Add services to see the total.</p>
          )}
        </div>
        <Submit className="w-full">Send order to vendor</Submit>
        <p className="text-xs text-ink-mute">You'll be invoiced once the vendor confirms delivery.</p>
      </aside>
    </ActionForm>
  );
}

function Row({ k, v }: { k: string; v: number }) {
  return (
    <div className="flex justify-between text-ink-soft">
      <dt>{k}</dt>
      <dd className="tabular-nums">{formatEUR(v)}</dd>
    </div>
  );
}
