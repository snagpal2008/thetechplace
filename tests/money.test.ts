import { test } from "node:test";
import assert from "node:assert/strict";
import { computeInvoiceTotals, lineVat, parseEurosToCents } from "../src/lib/money";

test("invoice totals: vendor items + 10% service charge + VAT", () => {
  const t = computeInvoiceTotals(
    [
      { quantity: 1, unitPriceCents: 18000, vatRateBps: 1350 }, // €180 @13.5%
      { quantity: 4, unitPriceCents: 4500, vatRateBps: 1350 }, // 4 x €45 @13.5%
    ],
    1000,
  );
  assert.equal(t.subtotalCents, 36000);
  assert.equal(t.vatCents, 2430 + 2430);
  assert.equal(t.platformFeeCents, 3600);
  assert.equal(t.platformFeeVatCents, 828);
  assert.equal(t.totalCents, 36000 + 4860 + 3600 + 828);
  assert.equal(t.applicationFeeCents + t.vendorPayoutCents, t.totalCents);
});

test("minimum service charge applies", () => {
  const t = computeInvoiceTotals([{ quantity: 1, unitPriceCents: 1000, vatRateBps: 0 }], 1000, 500);
  assert.equal(t.platformFeeCents, 500);
});

test("VAT rounds half-up per line", () => {
  assert.equal(lineVat({ quantity: 1, unitPriceCents: 1, vatRateBps: 5000 }), 1);
  assert.equal(lineVat({ quantity: 3, unitPriceCents: 333, vatRateBps: 2300 }), 230);
});

test("rejects empty or invalid lines", () => {
  assert.throws(() => computeInvoiceTotals([], 1000));
  assert.throws(() => computeInvoiceTotals([{ quantity: 0, unitPriceCents: 100, vatRateBps: 0 }], 1000));
  assert.throws(() => computeInvoiceTotals([{ quantity: 1.5, unitPriceCents: 100, vatRateBps: 0 }], 1000));
});

test("parses euro inputs", () => {
  assert.equal(parseEurosToCents("12"), 1200);
  assert.equal(parseEurosToCents("12.5"), 1250);
  assert.equal(parseEurosToCents("€ 1,99"), 199);
  assert.throws(() => parseEurosToCents("12.345"));
  assert.throws(() => parseEurosToCents("abc"));
});

test("password hashing round-trips and rejects wrong passwords", async () => {
  const { hashPassword, verifyPassword } = await import("../src/lib/password");
  const h = await hashPassword("correct horse");
  assert.match(h, /^pbkdf2\$100000\$/);
  assert.equal(await verifyPassword("correct horse", h), true);
  assert.equal(await verifyPassword("wrong", h), false);
  assert.equal(await verifyPassword("x", "garbage"), false);
});
