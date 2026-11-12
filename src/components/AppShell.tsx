import Link from "next/link";
import type { SessionPayload } from "@/lib/auth-token";
import { logoutAction } from "@/app/actions";
import { NavLinks } from "./NavLinks";

const NAV = {
  director: [
    { href: "/director", label: "Overview" },
    { href: "/director/cases", label: "Funeral cases" },
    { href: "/director/marketplace", label: "Marketplace" },
    { href: "/director/orders", label: "Orders" },
    { href: "/director/invoices", label: "Invoices" },
    { href: "/director/profile", label: "Profile" },
  ],
  vendor: [
    { href: "/vendor", label: "Overview" },
    { href: "/vendor/orders", label: "Orders" },
    { href: "/vendor/services", label: "Rate card" },
    { href: "/vendor/invoices", label: "Invoices" },
    { href: "/vendor/payments", label: "Payouts" },
    { href: "/vendor/profile", label: "Profile" },
  ],
  admin: [
    { href: "/admin", label: "Overview" },
    { href: "/admin/vendors", label: "Vendors" },
    { href: "/admin/orders", label: "Orders" },
    { href: "/admin/invoices", label: "Invoices" },
    { href: "/admin/settings", label: "Settings" },
  ],
} as const;

const ROLE_LABEL = { director: "Funeral director", vendor: "Vendor", admin: "Platform admin" };

export function AppShell({ session, orgName, children }: { session: SessionPayload; orgName: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:flex">
      <aside className="no-print border-b border-paper-line bg-ink text-paper lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 py-4 lg:block lg:px-6 lg:py-7">
          <Link href="/" className="block">
            <span className="font-serif text-2xl text-white">Dílis</span>
            <span className="ml-2 text-[11px] uppercase tracking-[0.18em] text-paper/50 lg:ml-0 lg:mt-1 lg:block">
              {ROLE_LABEL[session.role]}
            </span>
          </Link>
          <form action={logoutAction} className="lg:hidden">
            <button className="text-xs text-paper/70 underline">Sign out</button>
          </form>
        </div>
        <NavLinks items={[...NAV[session.role]]} />
        <div className="hidden lg:absolute lg:bottom-0 lg:block lg:w-64 lg:border-t lg:border-white/10 lg:px-6 lg:py-5">
          <p className="truncate text-sm font-semibold text-white">{session.name}</p>
          <p className="truncate text-xs text-paper/60">{orgName}</p>
          <form action={logoutAction} className="mt-3">
            <button className="text-xs text-paper/70 underline hover:text-white">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
