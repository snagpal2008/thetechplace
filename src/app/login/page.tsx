import Link from "next/link";
import { loginAction } from "@/app/actions";
import { AuthCard } from "@/components/AuthCard";
import { ActionForm, Submit } from "@/components/forms";

export const metadata = { title: "Sign in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthCard title="Sign in" subtitle={<>New here? <Link href="/register" className="link">Create an account</Link></>}>
      {sp.error === "forbidden" && <p className="mb-4 text-sm text-alert">You don't have access to that page.</p>}
      <ActionForm action={loginAction} className="space-y-4">
        <input type="hidden" name="next" value={sp.next ?? ""} />
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
        </div>
        <Submit className="w-full">Sign in</Submit>
      </ActionForm>
    </AuthCard>
  );
}
