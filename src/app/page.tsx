import Link from "next/link";
import { CATEGORY_LABELS } from "@/lib/labels";

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <span className="font-serif text-2xl">Dílis</span>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/login" className="link">Sign in</Link>
          <Link href="/register" className="btn-primary btn-sm">Join</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:pt-20">
        <p className="eyebrow mb-4">FuneralDirector.ie</p>
        <h1 className="max-w-3xl text-4xl leading-[1.1] sm:text-6xl">
          Every supplier for a funeral, <em className="text-sage">one calm place</em> to arrange them.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-ink-soft">
          Dílis connects Irish funeral directors with vetted florists, limousine operators, caterers, printers and more.
          Order against a case, talk to the vendor on the order, and receive one clear invoice — paid by card in seconds.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/register?kind=director" className="btn-primary">I'm a funeral director</Link>
          <Link href="/register?kind=vendor" className="btn-secondary">I supply funeral services</Link>
        </div>
      </section>

      <section className="border-y border-paper-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-px px-5 py-12 sm:grid-cols-3 sm:gap-10">
          {[
            ["Order against the case", "Every flower spray, car and sandwich platter is tied to the family's case, with the funeral time and venue carried through."],
            ["No more phone tag", "Vendors accept, update and confirm delivery on the order. Notes live with the order — not in a dozen texts."],
            ["Invoices that reconcile", "Delivery triggers the invoice automatically. Pay by card through Stripe; vendors are paid out directly."],
          ].map(([t, d]) => (
            <div key={t} className="py-4">
              <h3 className="text-xl">{t}</h3>
              <p className="mt-2 text-sm text-ink-soft">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14">
        <p className="eyebrow mb-3">Vendor categories</p>
        <div className="flex flex-wrap gap-2">
          {Object.values(CATEGORY_LABELS).map((c) => (
            <span key={c} className="rounded-full border border-paper-line bg-white px-3 py-1.5 text-sm text-ink-soft">{c}</span>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-5 pb-10 text-xs text-ink-mute">
        Dílis — faithful to every family · Piloting in Dublin
      </footer>
    </div>
  );
}
