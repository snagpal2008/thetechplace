import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { setupAction } from "@/app/actions";
import { AuthCard } from "@/components/AuthCard";
import { ActionForm, Submit } from "@/components/forms";
import { hasAdmin } from "@/lib/domain";

export const metadata = { title: "Set up Dílis" };
export const dynamic = "force-dynamic";

export default async function Setup() {
  if (await hasAdmin(await getDb())) redirect("/login");
  return (
    <AuthCard title="Set up your portal" subtitle="Create the platform administrator. This page disappears once an admin exists.">
      <ActionForm action={setupAction} className="space-y-4">
        <div>
          <label className="label" htmlFor="name">Your name</label>
          <input id="name" name="name" required className="input" autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="email">Admin email</label>
          <input id="email" name="email" type="email" required className="input" autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" minLength={10} required className="input" autoComplete="new-password" />
          <p className="mt-1.5 text-xs text-ink-mute">At least 10 characters.</p>
        </div>
        <label className="flex items-start gap-3 rounded-lg border border-paper-line p-3 text-sm">
          <input type="checkbox" name="demo" defaultChecked className="mt-0.5 h-4 w-4 accent-sage" />
          <span>
            <span className="font-semibold">Load demo data</span>
            <span className="block text-ink-mute">Two funeral homes, six Dublin vendors with rate cards, and a live case with orders and an invoice. Demo logins use the password <code>dilis-demo-2026</code>.</span>
          </span>
        </label>
        <Submit className="w-full">Create admin & open portal</Submit>
      </ActionForm>
    </AuthCard>
  );
}
