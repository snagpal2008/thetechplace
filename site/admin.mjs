// Staff command line for the local SQLite database (data/funeral.db).
//   node admin.mjs queue                 → open requests, most urgent first
//   node admin.mjs pending               → condolences waiting for approval
//   node admin.mjs approve <id>          → publish a condolence (id or first 8+ characters)
//   node admin.mjs reject <id>           → hide a condolence
//   node admin.mjs export <form> [file]  → CSV export of one form's submissions
//   node admin.mjs report                → print the daily report (the same email Cloudflare sends each morning)
//   node admin.mjs purge                 → delete data past its retention date (run daily)
import { writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { openStore } from "./db/sqlite-node.mjs";
import { FORMS } from "./forms.mjs";
import { formatDailyReport } from "./report.mjs";
import config from "./config.json" with { type: "json" };

const store = openStore();
const [cmd, arg, out] = process.argv.slice(2);
const short = (s) => String(s).slice(0, 8);
// Visitor text is printed to a staff terminal: remove control characters (incl. ANSI escape
// sequences) so a message cannot recolour, hide or rewrite what staff see.
const safe = (s) => String(s ?? "").replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, " ");

switch (cmd) {
  case "queue": {
    const rows = await store.openQueue();
    if (!rows.length) console.log("No open requests.");
    const now = new Date().toISOString();
    for (const r of rows) {
      const d = JSON.parse(r.data);
      const who = d.name || d.caller_name || d.submitter_name || d.email || "";
      const late = r.respond_by < now ? "  ⚠ OVERDUE" : "";
      console.log(`${short(r.id)}  ${r.form.padEnd(20)} respond by ${r.respond_by.slice(0, 16).replace("T", " ")}  ${r.owner}  ${safe(who)}${late}`);
    }
    break;
  }
  case "pending": {
    const rows = await store.pendingCondolences();
    if (!rows.length) console.log("No condolences waiting.");
    for (const r of rows) console.log(`${short(r.id)}  [${safe(r.notice)}]  ${safe(r.name)}${r.town ? ", " + safe(r.town) : ""}: ${safe(r.message)}`);
    break;
  }
  case "approve":
  case "reject": {
    const n = await store.moderate(arg || "", cmd === "approve" ? "approved" : "rejected");
    console.log(n ? `${cmd === "approve" ? "Approved" : "Rejected"} ${arg}` :"No single condolence matches that id (use at least 8 characters).");
    process.exitCode = n ? 0 : 1;
    break;
  }
  case "export": {
    if (!FORMS[arg] || arg === "condolence") { console.error(`Usage: node admin.mjs export <${Object.keys(FORMS).filter((f) => f !== "condolence").join("|")}> [file.csv]`); process.exit(1); }
    const db = new DatabaseSync(store.path, { readOnly: true });
    const rows = db.prepare("SELECT id, received_at, status, data FROM submissions WHERE form = ? ORDER BY received_at").all(arg);
    const fields = FORMS[arg].fields.map((f) => f.name);
    // Prefix cells that start with = + - @ so spreadsheets don't run them as formulas (CSV injection).
    const cell = (v) => { let s = Array.isArray(v) ? v.join("; ") : v == null ? "" : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
    const csv = [["id", "received_at", "status", ...fields].map(cell).join(",")]
      .concat(rows.map((r) => { const d = JSON.parse(r.data); return [r.id, r.received_at, r.status, ...fields.map((f) => d[f])].map(cell).join(","); }))
      .join("\n") + "\n";
    if (out) { writeFileSync(out, csv, { mode: 0o600 }); console.log(`Wrote ${rows.length} rows to ${out}. It contains personal data: store it securely and delete it when done.`); }
    else process.stdout.write(csv);
    db.close();
    break;
  }
  case "report": {
    const r = formatDailyReport(await store.dailyReport(), { siteName: config.shortName });
    console.log(`Subject: ${r.subject}\n\n${r.body}`); // visitor fields are already cleaned in report.mjs
    break;
  }
  case "purge":
    console.log(await store.purge());
    break;
  default:
    console.log("Usage: node admin.mjs <queue|pending|approve <id>|reject <id>|export <form> [file]|report|purge>");
}
store.close();
