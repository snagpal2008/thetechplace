import Link from "next/link";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8 font-serif text-3xl">Dílis</Link>
      <div className="card w-full max-w-md p-6 sm:p-8">
        <h1 className="text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-mute">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
