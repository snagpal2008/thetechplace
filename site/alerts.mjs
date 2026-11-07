// Builds and sends the "new form" alert. Used by the local server and the Cloudflare function.
// The alert goes to ALERT_WEBHOOK_URL: the Google Apps Script in tools/gmail-alert.gs, which
// emails it from the funeral home's Gmail. It carries what the on-call person needs to phone
// back (name, phone, the reason) but not free-text messages; the full record stays in the database.

const CONTACT_NAME = ["name", "caller_name", "submitter_name", "first_name"];
const CONTACT_PHONE = ["phone", "caller_phone", "submitter_phone"];
const CONTACT_EMAIL = ["email", "caller_email", "submitter_email"];
const pick = (data, keys) => keys.map((k) => data[k]).find((v) => typeof v === "string" && v) || "";

export function alertPayload(formId, def, data, id) {
  const extra = {};
  if (formId === "first-notification") Object.assign(extra, { deceased: data.deceased_name, place: data.place_type, doctor: data.doctor_status });
  if (formId === "callback") Object.assign(extra, { about: data.reason, best_time: data.best_time || "asap" });
  if (formId === "appointment") Object.assign(extra, { date: data.date, time: data.time_slot, where: data.location });
  return {
    form: def.title,
    form_id: formId,
    urgent: def.slaHours <= 0.5,
    respond_within_hours: def.slaHours,
    owner: def.owner,
    reference: id.slice(0, 8).toUpperCase(),
    received: new Date().toISOString(),
    contact: { name: pick(data, CONTACT_NAME), phone: pick(data, CONTACT_PHONE), email: pick(data, CONTACT_EMAIL) },
    details: extra
  };
}

/** POST the alert. Never throws: a failed alert must not lose the visitor's submission. */
export async function sendAlert(url, payload) {
  if (!url) return false;
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), redirect: "follow" });
    return r.ok;
  } catch { return false; }
}
