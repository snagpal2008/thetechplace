import { test } from "node:test";
import assert from "node:assert/strict";
import { openStore } from "../db/sqlite-node.mjs";
import { FORMS, validate } from "../forms.mjs";

const old = String(Date.now() - 10_000); // passes the 3-second time trap

test("saves a submission with SLA deadline and retention date", async () => {
  const s = openStore(":memory:");
  const now = new Date("2026-01-01T10:00:00Z");
  const id = await s.save("callback", FORMS.callback, { name: "Ann", phone: "087 123 4567", reason: "death", consent: "yes" }, now);
  const [row] = await s.openQueue();
  assert.equal(row.id, id);
  assert.equal(row.respond_by, "2026-01-01T10:15:00.000Z"); // 15-minute SLA
  assert.equal(JSON.parse(row.data).name, "Ann");
  s.close();
});

test("condolences stay hidden until approved, and never expose email", async () => {
  const s = openStore(":memory:");
  const id = await s.save("condolence", FORMS.condolence, { notice: "n1", name: "Pat", town: "Naas", email: "p@x.ie", message: "<b>Sorry</b>", publish_ok: "yes", consent: "yes" });
  assert.deepEqual(await s.approvedCondolences("n1"), []);
  assert.equal(await s.moderate(id.slice(0, 8), "approved"), 1);
  const [c] = await s.approvedCondolences("n1");
  assert.equal(c.message, "<b>Sorry</b>"); // stored as-is; the page renders it as text
  assert.equal(c.email, undefined);
  assert.deepEqual(await s.approvedCondolences("other"), []);
  s.close();
});

test("moderate rejects short or ambiguous ids", async () => {
  const s = openStore(":memory:");
  await s.save("condolence", FORMS.condolence, { notice: "n1", name: "A", email: "a@x.ie", message: "m" });
  assert.equal(await s.moderate("abc", "approved"), 0);
  assert.equal(await s.moderate("%%%%%%%%", "approved"), 0); // LIKE wildcards refused
  assert.equal(await s.moderate("00000000", "approved"), 0);
  s.close();
});

test("purge deletes expired data and clears old condolence emails", async () => {
  const s = openStore(":memory:");
  const longAgo = new Date("2020-01-01T00:00:00Z");
  await s.save("quote", FORMS.quote, { name: "Q", email: "q@x.ie" }, longAgo);           // 365-day retention
  await s.save("feedback", FORMS.feedback, { kind: "complaint", message: "m" }, new Date()); // still within 7 years
  await s.save("condolence", FORMS.condolence, { notice: "n", name: "C", email: "c@x.ie", message: "m" }, longAgo);
  const r = await s.purge();
  assert.deepEqual(r, { submissionsDeleted: 1, rejectedCondolencesDeleted: 0, emailsCleared: 1 });
  assert.equal((await s.openQueue()).length, 1);
  s.close();
});

test("SQL injection attempts are stored as plain text", async () => {
  const s = openStore(":memory:");
  const evil = "x'); DROP TABLE submissions; --";
  await s.save("callback", FORMS.callback, { name: evil, phone: "0871234567", reason: "other", consent: "yes" });
  const [row] = await s.openQueue();
  assert.equal(JSON.parse(row.data).name, evil);
  s.close();
});

test("validation: required fields, allow-lists, dates and spam traps", () => {
  assert.equal(validate("nope", {}).status, 404);
  assert.ok(validate("callback", { website: "spam", _ts: old }).spam);
  assert.ok(validate("callback", { name: "A", _ts: String(Date.now()) }).spam); // too fast
  const bad = validate("callback", { name: "", phone: "abc", reason: "hack", _ts: old });
  assert.equal(bad.status, 422);
  assert.deepEqual(Object.keys(bad.fields).sort(), ["consent", "name", "phone", "reason"]);
  const future = validate("first-notification", { caller_name: "A", caller_phone: "0871234567", relationship: "son", deceased_name: "B",
    date_of_death: "2999-01-01", place_type: "home", place_address: "x", doctor_status: "certified", consent: "yes", _ts: old });
  assert.match(future.fields.date_of_death, /future/);
  const ok = validate("quote", { name: "A", email: "a@x.ie", funeral_type: "burial", coffin: "simple", extras: ["flowers", "music"], consent: "yes", _ts: old });
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.data.extras, ["flowers", "music"]);
  assert.equal(validate("quote", { name: "A", email: "a@x.ie", funeral_type: "burial", coffin: "simple", extras: ["<script>"], consent: "yes", _ts: old }).status, 422);
});
