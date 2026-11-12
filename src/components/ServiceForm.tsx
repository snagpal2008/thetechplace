import type { Service } from "@/db/schema";
import { saveServiceAction } from "@/app/actions";
import { VAT_RATES } from "@/lib/labels";
import { ActionForm, Submit } from "./forms";

export function ServiceForm({ service }: { service?: Service }) {
  return (
    <ActionForm action={saveServiceAction} className="card max-w-2xl space-y-5 p-6">
      {service && <input type="hidden" name="serviceId" value={service.id} />}
      <div>
        <label className="label" htmlFor="name">Service name</label>
        <input id="name" name="name" required defaultValue={service?.name} className="input" placeholder="e.g. Casket spray — white lilies" />
      </div>
      <div>
        <label className="label" htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={3} defaultValue={service?.description ?? ""} className="input" />
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="price">Price (€, ex VAT)</label>
          <input id="price" name="price" required inputMode="decimal" defaultValue={service ? (service.unitPriceCents / 100).toFixed(2) : ""} className="input" placeholder="120.00" />
        </div>
        <div>
          <label className="label" htmlFor="unit">Per</label>
          <input id="unit" name="unit" defaultValue={service?.unit ?? "each"} className="input" placeholder="each / hour / car" />
        </div>
        <div>
          <label className="label" htmlFor="vatRateBps">VAT rate</label>
          <select id="vatRateBps" name="vatRateBps" defaultValue={String(service?.vatRateBps ?? 2300)} className="input">
            {VAT_RATES.map((r) => <option key={r.bps} value={r.bps}>{r.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="imageUrl">Photo URL (optional)</label>
        <input id="imageUrl" name="imageUrl" type="url" defaultValue={service?.imageUrl ?? ""} className="input" placeholder="https://…" />
      </div>
      <Submit>{service ? "Save changes" : "Add to rate card"}</Submit>
    </ActionForm>
  );
}
