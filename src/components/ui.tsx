import Link from "next/link";
import type { OrderStatus } from "@/db/schema";
import { ORDER_STATUS_LABELS } from "@/lib/labels";
import { formatEUR } from "@/lib/money";

const ORDER_TONE: Record<OrderStatus, string> = {
  requested: "bg-brass-light text-brass",
  accepted: "bg-sage-light text-sage-dark",
  in_progress: "bg-sage-light text-sage-dark",
  delivered: "bg-ink text-white",
  declined: "bg-alert-light text-alert",
  cancelled: "bg-paper text-ink-mute border border-paper-line",
};

export function OrderBadge({ status }: { status: OrderStatus }) {
  return <Badge className={ORDER_TONE[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}

export function InvoiceBadge({ status, dueAt }: { status: "issued" | "paid" | "void"; dueAt?: Date }) {
  if (status === "paid") return <Badge className="bg-sage-light text-sage-dark">Paid</Badge>;
  if (status === "void") return <Badge className="bg-paper text-ink-mute border border-paper-line">Void</Badge>;
  if (dueAt && dueAt.getTime() < Date.now()) return <Badge className="bg-alert-light text-alert">Overdue</Badge>;
  return <Badge className="bg-brass-light text-brass">Unpaid</Badge>;
}

export function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

export function Money({ cents, className = "" }: { cents: number; className?: string }) {
  return <span className={`tabular-nums ${className}`}>{formatEUR(cents)}</span>;
}

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="text-2xl sm:text-3xl">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, href }: { label: string; value: React.ReactNode; hint?: string; href?: string }) {
  const body = (
    <div className="card p-5 h-full">
      <p className="label">{label}</p>
      <p className="font-serif text-3xl tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-mute">{hint}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block hover:[&>div]:border-sage/40">
      {body}
    </Link>
  ) : (
    body
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card px-6 py-10 text-center">
      <p className="font-serif text-lg">{title}</p>
      {children && <div className="mt-2 text-sm text-ink-mute">{children}</div>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "ok"; children: React.ReactNode }) {
  const cls =
    tone === "warn"
      ? "bg-brass-light border-brass/30 text-ink"
      : tone === "ok"
        ? "bg-sage-light border-sage/30 text-ink"
        : "bg-white border-paper-line text-ink-soft";
  return <div className={`rounded-lg border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}

export function fmtDate(d: Date | null | undefined, withTime = false) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Europe/Dublin",
  }).format(d);
}
