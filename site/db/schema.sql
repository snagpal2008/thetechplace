-- Form submissions database. Plain SQLite: works with Node's built-in node:sqlite locally
-- and with Cloudflare D1 (hosted SQLite) unchanged:  npx wrangler d1 execute <db> --file=db/schema.sql
-- Personal data is kept only as long as docs/04-form-workflows.md says (see expires_at).

CREATE TABLE IF NOT EXISTS submissions (
  id           TEXT PRIMARY KEY,            -- UUID
  form         TEXT NOT NULL,               -- callback, first-notification, quote, ...
  status       TEXT NOT NULL DEFAULT 'new'  -- new → contacted → closed
               CHECK (status IN ('new', 'contacted', 'closed')),
  owner        TEXT NOT NULL,               -- who must respond (from forms.mjs)
  sla_hours    REAL NOT NULL,               -- response target
  data         TEXT NOT NULL                -- validated fields as JSON
               CHECK (json_valid(data)),
  received_at  TEXT NOT NULL,               -- ISO 8601 UTC
  respond_by   TEXT NOT NULL,               -- received_at + SLA, for the on-call dashboard
  expires_at   TEXT                         -- delete after this (NULL = keep until removed by hand)
);
CREATE INDEX IF NOT EXISTS idx_submissions_queue   ON submissions (status, respond_by);
CREATE INDEX IF NOT EXISTS idx_submissions_form    ON submissions (form, received_at);
CREATE INDEX IF NOT EXISTS idx_submissions_expires ON submissions (expires_at);

-- Condolences are kept apart: their name, town and message are published once approved.
CREATE TABLE IF NOT EXISTS condolences (
  id            TEXT PRIMARY KEY,
  notice        TEXT NOT NULL,              -- notice slug, e.g. sample-notice
  name          TEXT NOT NULL,              -- published
  town          TEXT,                       -- published
  message       TEXT NOT NULL,              -- published, always rendered as plain text
  email         TEXT,                       -- never published; cleared after 12 months
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
  received_at   TEXT NOT NULL,
  moderated_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_condolences_notice ON condolences (notice, status, received_at);
CREATE INDEX IF NOT EXISTS idx_condolences_queue  ON condolences (status, received_at);
