// Turns schema.sql text into single statements (comments removed), for drivers that run one
// statement at a time, such as Cloudflare D1's batch(). The schema has no strings containing "--" or ";".
export const splitSql = (sql) =>
  sql.replace(/--[^\n]*/g, "").split(";").map((s) => s.trim()).filter(Boolean);
