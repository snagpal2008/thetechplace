import Link from "next/link";
import { registerAction } from "@/app/actions";
import { AuthCard } from "@/components/AuthCard";
import { ActionForm, Submit } from "@/components/forms";
import { RegisterKind } from "./RegisterKind";

export const metadata = { title: "Create account" };

export default async function Register({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  return (
    <AuthCard title="Create your account" subtitle={<>Already registered? <Link href="/login" className="link">Sign in</Link></>}>
      <ActionForm action={registerAction} className="space-y-4">
        <RegisterKind initial={kind === "vendor" ? "vendor" : "director"} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">Your name</label>
            <input id="name" name="name" required className="input" autoComplete="name" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" name="phone" className="input" autoComplete="tel" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="email">Work email</label>
          <input id="email" name="email" type="email" required className="input" autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" minLength={8} required className="input" autoComplete="new-password" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="county">County</label>
            <input id="county" name="county" className="input" placeholder="Dublin" />
          </div>
          <div>
            <label className="label" htmlFor="vatNumber">VAT number</label>
            <input id="vatNumber" name="vatNumber" className="input" placeholder="IE1234567T" />
          </div>
        </div>
        <Submit className="w-full">Create account</Submit>
      </ActionForm>
    </AuthCard>
  );
}
