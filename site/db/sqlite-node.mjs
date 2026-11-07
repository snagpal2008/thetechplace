// Local SQLite adapter using Node's built-in node:sqlite (Node 22.5+; no npm packages).
// The database file is site/data/funeral.db (gitignored). Override with DB_PATH.
import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { makeStore } from "./store.mjs";

const here = dirname(fileURLToPath(import.meta.url));

export function openStore(path = process.env.DB_PATH || join(here, "..", "data", "funeral.db")) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;");
  db.exec(readFileSync(join(here, "schema.sql"), "utf8"));
  const adapter = {
    async run(sql, params) { const r = db.prepare(sql).run(...params); return { changes: Number(r.changes) }; },
    async all(sql, params) { return db.prepare(sql).all(...params); }
  };
  return Object.assign(makeStore(adapter), { path, close: () => db.close() });
}
