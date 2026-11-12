import { connectStripeAction, refreshStripeAction, stripeDashboardAction } from "@/app/actions";
import { ActionForm, Submit } from "@/components/forms";
import { Badge, Notice, PageHeader } from "@/components/ui";
import { current } from "@/lib/current";
import { refreshVendorStripeStatus, stripeEnabled } from "@/lib/stripe";

export const metadata = { title: "Payouts" };

export default async function Payments({ searchParams }: { searchParams: Promise<{ return?: string; refresh?: string }> }) {
  const sp = await searchParams;
  const { db, org } = await current("vendor");
  let connected = org.stripeChargesEnabled;
  if ((sp.return || sp.refresh) && stripeEnabled() && org.stripeAccountId) {
    try {
      connected = await refreshVendorStripeStatus(db, org);
    } catch {
      /* show stored state */
    }
  }

  return (
    <>
      <PageHeader eyebrow="Get paid" title="Payouts" />
      <div className="card max-w-2xl space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Stripe</h2>
          {connected ? <Badge className="bg-sage-light text-sage-dark">Connected</Badge> : org.stripeAccountId ? <Badge className="bg-brass-light text-brass">Onboarding incomplete</Badge> : <Badge className="bg-paper text-ink-mute">Not connected</Badge>}
        </div>
        <p className="text-sm text-ink-soft">
          When a funeral director pays your invoice by card, Stripe pays the goods and VAT straight to your bank account.
          The Dílis service charge is added on top for the director — it never comes out of your prices.
        </p>
        {!stripeEnabled() ? (
          <Notice tone="warn">Card payments haven't been switched on for the platform yet. Invoices can still be settled by bank transfer.</Notice>
        ) : connected ? (
          <ActionForm action={stripeDashboardAction}><Submit variant="secondary">Open Stripe dashboard</Submit></ActionForm>
        ) : (
          <div className="flex flex-wrap gap-2">
            <ActionForm action={connectStripeAction}><Submit>{org.stripeAccountId ? "Continue Stripe setup" : "Connect with Stripe"}</Submit></ActionForm>
            {org.stripeAccountId && <ActionForm action={refreshStripeAction}><Submit variant="secondary">Check status</Submit></ActionForm>}
          </div>
        )}
      </div>
    </>
  );
}
