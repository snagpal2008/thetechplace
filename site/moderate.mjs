// Minimal condolence moderation for local testing (Dílis replaces this in production).
//   node moderate.mjs                 → list pending messages
//   node moderate.mjs approve <id>    → publish one
//   node moderate.mjs reject <id>     → hide one
import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const file = join(dirname(fileURLToPath(import.meta.url)), "data", "condolence.jsonl");
const rows = (await readFile(file, "utf8").catch(() => "")).split("\n").filter(Boolean).map((l) => JSON.parse(l));
const [cmd, id] = process.argv.slice(2);

if (!cmd) {
  const pending = rows.filter((r) => r.status === "pending");
  if (!pending.length) console.log("No messages waiting.");
  for (const r of pending) console.log(`${r.id}  [${r.data.notice}]  ${r.data.name}: ${r.data.message}`);
} else if (["approve", "reject"].includes(cmd)) {
  const row = rows.find((r) => r.id.startsWith(id || "-"));
  if (!row) { console.error("No message with that id."); process.exit(1); }
  row.status = cmd === "approve" ? "approved" : "rejected";
  row.moderatedAt = new Date().toISOString();
  await writeFile(file, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  console.log(`${row.status}: ${row.data.name}`);
} else console.error("Usage: node moderate.mjs [approve|reject <id>]");
