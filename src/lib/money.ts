/** All money is integer cents. Rates are basis points (2300 = 23%). */

export type LineInput = { quantity: number; unitPriceCents: number; vatRateBps: number };

export function lineNet(l: LineInput): number {
  return l.quantity * l.unitPriceCents;
}

/** VAT rounded half-up per line (Revenue accepts per-line rounding). */
export function lineVat(l: LineInput): number {
  return Math.round((lineNet(l) * l.vatRateBps) / 10000);
}

export const PLATFORM_FEE_VAT_BPS = 2300;

export type InvoiceTotals = {
  subtotalCents: number;
  vatCents: number;
  platformFeeCents: number;
  platformFeeVatCents: number;
  totalCents: number;
  /** What the platform keeps: service charge + its VAT (remitted by platform) */
  applicationFeeCents: number;
  /** What the vendor receives: goods + their VAT */
  vendorPayoutCents: number;
};

/**
 * Director pays: vendor items (+ VAT) + platform service charge (+ 23% VAT).
 * The service charge is a % of the vendor subtotal (ex VAT), with an optional minimum.
 */
export function computeInvoiceTotals(
  lines: LineInput[],
  platformFeeBps: number,
  minFeeCents = 0,
): InvoiceTotals {
  if (lines.length === 0) throw new Error("Invoice needs at least one line");
  for (const l of lines) {
    if (!Number.isInteger(l.quantity) || l.quantity <= 0) throw new Error("Quantity must be a positive integer");
    if (!Number.isInteger(l.unitPriceCents) || l.unitPriceCents < 0) throw new Error("Price must be non-negative cents");
  }
  const subtotalCents = lines.reduce((s, l) => s + lineNet(l), 0);
  const vatCents = lines.reduce((s, l) => s + lineVat(l), 0);
  const pct = Math.round((subtotalCents * platformFeeBps) / 10000);
  const platformFeeCents = subtotalCents === 0 ? 0 : Math.max(pct, minFeeCents);
  const platformFeeVatCents = Math.round((platformFeeCents * PLATFORM_FEE_VAT_BPS) / 10000);
  const totalCents = subtotalCents + vatCents + platformFeeCents + platformFeeVatCents;
  return {
    subtotalCents,
    vatCents,
    platformFeeCents,
    platformFeeVatCents,
    totalCents,
    applicationFeeCents: platformFeeCents + platformFeeVatCents,
    vendorPayoutCents: subtotalCents + vatCents,
  };
}

export function formatEUR(cents: number): string {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function formatRate(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;
}

/** "12.50" / "12,50" / "12" -> 1250. Throws on junk. */
export function parseEurosToCents(input: string): number {
  const s = input.trim().replace(/[€\s]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new Error(`Invalid amount: ${input}`);
  const [whole, frac = ""] = s.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}
