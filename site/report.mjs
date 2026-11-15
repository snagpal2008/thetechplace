// Turns store.dailyReport() data into a plain-text email. Shared by the Cloudflare Worker's daily
// schedule (worker.js) and the local admin tool (node admin.mjs report).
// Contains names and phone numbers of OPEN requests only (what staff need to call back);
// free-text messages are never included.
import { FORMS } from "./forms.mjs";

const NAME = ["name", "caller_name", "submitter_name", "first_name"];
const PHONE = ["phone", "caller_phone", "submitter_phone"];
const pick = (d, keys) => keys.map((k) => d[k]).find((v) => typeof v === "string" && v) || "";
const clean = (s) => String(s ?? "").replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").slice(0, 80);
const title = (id) => FORMS[id]?.title || id;
// Irish time for people; the database keeps UTC.
const local = (iso) => new Date(iso).toLocaleString("en-IE", { timeZone: "Europe/Dublin", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function formatDailyReport(r, { siteName = "Website", now = new Date() } = {}) {
  const nowIso = now.toISOString();
  const overdue = r.open.filter((o) => o.respond_by < nowIso);
  const newToday = r.byForm.reduce((a, b) => a + Number(b.n), 0);
  const pending = Number(r.condolences.pending || 0);
  const date = now.toLocaleDateString("en-IE", { timeZone: "Europe/Dublin", weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const lines = [
    `${siteName}: daily report for ${date}`,
    "",
    `New in the last 24 hours: ${newToday} form${newToday === 1 ? "" : "s"}` +
      (Number(r.condolences.new_today || 0) ? ` + ${r.condolences.new_today} condolence message(s)` : ""),
    ...r.byForm.map((f) => `  • ${title(f.form)}: ${f.n}`),
    "",
    `Still waiting for a reply: ${r.open.length}${overdue.length ? `  (⚠ ${overdue.length} OVERDUE)` : ""}`
  ];
  for (const o of r.open) {
    let d = {};
    try { d = JSON.parse(o.data); } catch { /* keep going */ }
    const late = o.respond_by < nowIso ? "⚠ OVERDUE " : "";
    lines.push(`  ${late}${o.id.slice(0, 8).toUpperCase()}  ${title(o.form)}  ·  ${clean(pick(d, NAME))}  ${clean(pick(d, PHONE))}  ·  reply by ${local(o.respond_by)}`);
  }
  if (!r.open.length) lines.push("  Nothing outstanding.");
  lines.push("", `Condolence messages waiting for approval: ${pending}`);
  const totals = Object.fromEntries(r.totals.map((t) => [t.status, Number(t.n)]));
  lines.push("", `All records: ${totals.new || 0} new · ${totals.contacted || 0} contacted · ${totals.closed || 0} closed`);
  lines.push("", "Mark a request as dealt with in Cloudflare → D1 → funeral-db → Console:",
    "  UPDATE submissions SET status='contacted' WHERE id LIKE 'abcd1234%';",
    "  (use the 8-character reference above, in lower case)");

  const subject = overdue.length
    ? `⚠ ${overdue.length} overdue · ${siteName} daily report`
    : `${siteName} daily report: ${newToday} new, ${r.open.length} open`;
  return { subject, body: lines.join("\n") };
}
