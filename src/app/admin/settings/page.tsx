import { saveSettingsAction } from "@/app/actions";
import { ActionForm, Submit } from "@/components/forms";
import { Notice, PageHeader } from "@/components/ui";
import { current } from "@/lib/current";
import { getSettings } from "@/lib/domain";
import { stripeEnabled } from "@/lib/stripe";

export const metadata = { title: "Settings" };

export default async function Settings() {
  const { db } = await current("admin");
  const s = await getSettings(db);
  return (
    <>
      <PageHeader title="Platform settings" />
      <div className="max-w-2xl space-y-4">
        <Notice tone={stripeEnabled() ? "ok" : "warn"}>
          Stripe is {stripeEnabled() ? "configured" : "not configured — set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET as Worker secrets"}.
        </Notice>
        <ActionForm action={saveSettingsAction} className="card space-y-5 p-6">
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="platformFeePct">Service charge %</label>
              <input id="platformFeePct" name="platformFeePct" inputMode="decimal" defaultValue={Number(s.platform_fee_bps) / 100} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="platformFeeMin">Minimum charge €</label>
              <input id="platformFeeMin" name="platformFeeMin" inputMode="decimal" defaultValue={(Number(s.platform_fee_min_cents) / 100).toFixed(2)} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="paymentTermsDays">Payment terms (days)</label>
              <input id="paymentTermsDays" name="paymentTermsDays" inputMode="numeric" defaultValue={s.payment_terms_days} className="input" />
            </div>
          </div>
          <p className="text-xs text-ink-mute">The service charge is added on top of vendor prices (plus 23% VAT) and retained via Stripe's application fee. Changes apply to invoices issued from now on.</p>
          <Submit>Save settings</Submit>
        </ActionForm>
      </div>
    </>
  );
}
