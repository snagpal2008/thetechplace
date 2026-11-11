// Data access shared by the local Node server and the Cloudflare Pages Function.
// `db` is a small adapter with async run(sql, params) and all(sql, params):
//   - local:  db/sqlite-node.mjs (node:sqlite)
//   - hosted: functions/api/_d1.js (Cloudflare D1)
// All values are bound as parameters; SQL text is never built from user input.

const DAY = 86_400_000;

export function makeStore(db) {
  return {
    /** Save one validated form submission. Returns its id. */
    async save(formId, def, data, now = new Date()) {
      const id = crypto.randomUUID();
      const at = now.toISOString();
      if (formId === "condolence") {
        await db.run(
          `INSERT INTO condolences (id, notice, name, town, message, email, status, received_at)
           VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [id, data.notice, data.name, data.town || null, data.message, data.email || null, at]
        );
        return id;
      }
      if (formId === "review") {
        await db.run(
          `INSERT INTO reviews (id, name, town, rating, service, message, email, status, received_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [id, data.name, data.town || null, Number(data.rating), data.service || null, data.message, data.email || null, at]
        );
        return id;
      }
      const respondBy = new Date(now.getTime() + def.slaHours * 3_600_000).toISOString();
      const expires = def.retentionDays ? new Date(now.getTime() + def.retentionDays * DAY).toISOString() : null;
      await db.run(
        `INSERT INTO submissions (id, form, status, owner, sla_hours, data, received_at, respond_by, expires_at)
         VALUES (?, ?, 'new', ?, ?, ?, ?, ?, ?)`,
        [id, formId, def.owner, def.slaHours, JSON.stringify(data), at, respondBy, expires]
      );
      return id;
    },

    /** Public: approved condolences for one notice. Only published fields leave the database. */
    approvedCondolences(notice) {
      return db.all(
        `SELECT name, town, message, substr(received_at, 1, 10) AS date
           FROM condolences WHERE notice = ? AND status = 'approved'
          ORDER BY received_at LIMIT 500`,
        [notice]
      );
    },

    pendingCondolences() {
      return db.all(`SELECT id, notice, name, town, message, received_at FROM condolences WHERE status = 'pending' ORDER BY received_at`, []);
    },

    /** Public: approved reviews, newest first. Only published fields leave the database. */
    approvedReviews(limit = 50) {
      return db.all(
        `SELECT name, town, rating, service, message, substr(received_at, 1, 10) AS date
           FROM reviews WHERE status = 'approved'
          ORDER BY received_at DESC LIMIT ?`,
        [Math.min(Math.max(Number(limit) || 50, 1), 200)]
      );
    },

    /** Public: number of approved reviews and their average rating (one decimal place). */
    async reviewSummary() {
      const [row] = await db.all(`SELECT COUNT(*) AS n, AVG(rating) AS avg FROM reviews WHERE status = 'approved'`, []);
      const count = Number(row?.n ?? 0);
      return { count, average: count ? Math.round(Number(row.avg) * 10) / 10 : null };
    },

    pendingReviews() {
      return db.all(`SELECT id, name, town, rating, service, message, received_at FROM reviews WHERE status = 'pending' ORDER BY received_at`, []);
    },

    /**
     * Approve or reject a condolence (default) or a review, by id or a unique id prefix of 8+ characters.
     * Returns rows changed.
     */
    async moderate(idPrefix, status, now = new Date(), kind = "condolence") {
      const table = { condolence: "condolences", review: "reviews" }[kind];
      if (!table || !["approved", "rejected"].includes(status) || !/^[0-9a-f-]{8,36}$/i.test(idPrefix)) return 0;
      const rows = await db.all(`SELECT id FROM ${table} WHERE id LIKE ? || '%'`, [idPrefix]);
      if (rows.length !== 1) return 0;
      const r = await db.run(`UPDATE ${table} SET status = ?, moderated_at = ? WHERE id = ?`, [status, now.toISOString(), rows[0].id]);
      return r.changes ?? 1;
    },

    /** Open requests, most urgent first (for an on-call dashboard or a daily email). */
    openQueue() {
      return db.all(
        `SELECT id, form, owner, received_at, respond_by, data FROM submissions WHERE status = 'new' ORDER BY respond_by`,
        []
      );
    },

    /**
     * Record one request for `key` (a hashed IP) and report whether it is over the limit:
     * more than `max` requests in the last `windowMs`. Old rows are cleaned up as we go.
     */
    async rateLimited(key, { max = 10, windowMs = 600_000 } = {}, now = new Date()) {
      const hourAgo = new Date(now.getTime() - 3_600_000).toISOString();
      const since = new Date(now.getTime() - windowMs).toISOString();
      await db.run(`DELETE FROM rate_hits WHERE at < ?`, [hourAgo]);
      await db.run(`INSERT INTO rate_hits (key, at) VALUES (?, ?)`, [key, now.toISOString()]);
      const [row] = await db.all(`SELECT COUNT(*) AS n FROM rate_hits WHERE key = ? AND at >= ?`, [key, since]);
      return Number(row?.n ?? 0) > max;
    },

    /** GDPR retention: delete expired records. Run daily (cron) or from the admin CLI. */
    async purge(now = new Date()) {
      const at = now.toISOString();
      const yearAgo = new Date(now.getTime() - 365 * DAY).toISOString();
      const monthAgo = new Date(now.getTime() - 30 * DAY).toISOString();
      const a = await db.run(`DELETE FROM submissions WHERE expires_at IS NOT NULL AND expires_at < ?`, [at]);
      const b = await db.run(`DELETE FROM condolences WHERE status = 'rejected' AND moderated_at < ?`, [monthAgo]);
      const c = await db.run(`UPDATE condolences SET email = NULL WHERE email IS NOT NULL AND received_at < ?`, [yearAgo]);
      const d = await db.run(`DELETE FROM reviews WHERE status = 'rejected' AND moderated_at < ?`, [monthAgo]);
      const e = await db.run(`UPDATE reviews SET email = NULL WHERE email IS NOT NULL AND received_at < ?`, [yearAgo]);
      return { submissionsDeleted: a.changes ?? 0, rejectedCondolencesDeleted: b.changes ?? 0, emailsCleared: (c.changes ?? 0) + (e.changes ?? 0),
        rejectedReviewsDeleted: d.changes ?? 0 };
    }
  };
}
