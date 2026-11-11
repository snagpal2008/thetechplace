// Single source of truth for server-side validation and routing of every form.
// docs/03-forms-inventory.md documents the same fields for humans.
// `notify` / `owner` / `slaHours` / `retention` (+ `retentionDays`, enforced by db purge) describe the workflow (docs/04-workflows.md);
// Submissions are stored in SQLite (db/); in production they can also be forwarded to Dílis.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^[+0-9 ()-]{7,20}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const f = (name, opts = {}) => ({ name, required: false, max: 200, ...opts });
const req = (name, opts = {}) => f(name, { required: true, ...opts });
const consent = req("consent", { enum: ["yes"] });

export const FORMS = {
  callback: {
    title: "Urgent call-back request",
    fields: [req("name", { max: 100 }), req("phone", { pattern: PHONE }), f("best_time", { enum: ["asap", "morning", "afternoon", "evening"] }),
      req("reason", { enum: ["death", "arranging", "preplanning", "notice", "other"] }), f("message", { max: 1000 }), consent],
    notify: ["sms:on-call", "email:office"], owner: "On-call funeral director", slaHours: 0.25, retentionDays: 365, retention: "12 months",
    message: "Thank you. A member of our family will call you back shortly — within 15 minutes, day or night."
  },
  "first-notification": {
    title: "First notification of a death",
    fields: [req("caller_name", { max: 100 }), req("caller_phone", { pattern: PHONE }), f("caller_email", { pattern: EMAIL }),
      req("relationship", { max: 60 }), req("deceased_name", { max: 120 }), req("date_of_death", { pattern: DATE, notFuture: true }),
      req("place_type", { enum: ["home", "hospital", "nursing-home", "hospice", "other"] }), req("place_address", { max: 300 }),
      req("doctor_status", { enum: ["certified", "coroner", "not-sure"] }), f("wishes", { enum: ["burial", "cremation", "not-sure"] }),
      f("message", { max: 1500 }), consent],
    notify: ["sms:on-call", "phone:on-call", "email:office"], owner: "On-call funeral director", slaHours: 0.25,
    retentionDays: 2557, retention: "7 years after the funeral (financial/legal records)",
    message: "Thank you. We have your details and the funeral director on call will phone you within 15 minutes. You do not need to do anything else for now."
  },
  "arrangement-enquiry": {
    title: "Funeral arrangement enquiry",
    fields: [req("name", { max: 100 }), req("phone", { pattern: PHONE }), f("email", { pattern: EMAIL }), f("deceased_name", { max: 120 }),
      f("funeral_type", { enum: ["burial", "cremation", "direct-cremation", "not-sure"] }), f("contact_pref", { enum: ["phone", "email", "visit", "home-visit"] }),
      f("message", { max: 1500 }), consent],
    notify: ["email:office", "sms:duty-arranger"], owner: "Arranging funeral director", slaHours: 2, retentionDays: 365, retention: "7 years if a funeral proceeds; otherwise 12 months",
    message: "Thank you. A funeral director will contact you within 2 hours (by 10 am if you write overnight)."
  },
  quote: {
    title: "Quote request",
    fields: [req("name", { max: 100 }), req("email", { pattern: EMAIL }), f("phone", { pattern: PHONE }),
      req("funeral_type", { enum: ["burial", "cremation", "direct-cremation"] }), req("coffin", { enum: ["simple", "traditional", "premium", "eco", "advice"] }),
      f("extras", { multi: ["embalming", "limousine", "flowers", "notice-paper", "stationery", "livestream", "catering", "music"] }),
      f("ceremony", { enum: ["church", "crematorium", "funeral-home", "graveside", "none", "not-sure"] }), f("location", { max: 120 }), f("message", { max: 1500 }), consent],
    notify: ["email:office"], owner: "Office manager", slaHours: 24, retentionDays: 365, retention: "12 months",
    message: "Thank you. We will email a written, itemised estimate within one working day."
  },
  preplanning: {
    title: "Pre-planning enquiry",
    fields: [req("name", { max: 100 }), req("email", { pattern: EMAIL }), f("phone", { pattern: PHONE }), req("for_whom", { enum: ["myself", "someone-else"] }),
      f("funeral_type", { enum: ["burial", "cremation", "direct-cremation", "not-sure"] }), f("contact_pref", { enum: ["phone", "email", "visit", "home-visit"] }),
      f("estimate", { max: 1500 }), f("message", { max: 1500 }), consent, f("marketing", { enum: ["yes"] })],
    notify: ["email:pre-need"], owner: "Pre-planning adviser", slaHours: 48, retentionDays: 730, retention: "Life of the plan + 7 years; enquiries without a plan: 24 months",
    message: "Thank you. Our pre-planning adviser will be in touch within two working days. There is no obligation."
  },
  "death-notice": {
    title: "Death notice submission",
    fields: [req("submitter_name", { max: 100 }), req("submitter_phone", { pattern: PHONE }), req("submitter_email", { pattern: EMAIL }),
      req("relationship", { max: 60 }), req("deceased_name", { max: 120 }), req("deceased_town", { max: 120 }), req("date_of_death", { pattern: DATE, notFuture: true }),
      req("notice_text", { max: 3000 }), f("reposing", { max: 600 }), f("service", { max: 600 }), f("donations", { max: 300 }),
      f("channels", { multi: ["website", "ripie", "newspaper"] }), req("family_approved", { enum: ["yes"] }), consent],
    notify: ["email:notices", "sms:arranging-fd"], owner: "Arranging funeral director", slaHours: 2, retentionDays: 2557, retention: "Published notice: kept as a public memorial unless the family asks; submission data 7 years",
    message: "Thank you. We will check the notice with you by phone before anything is published. Nothing goes live without your approval."
  },
  condolence: {
    title: "Condolence message",
    fields: [req("notice", { max: 120 }), req("name", { max: 100 }), f("town", { max: 80 }), req("email", { pattern: EMAIL }),
      req("message", { max: 1000 }), req("publish_ok", { enum: ["yes"] }), consent],
    notify: ["queue:moderation"], owner: "Office (moderation)", slaHours: 4, retention: "Published with the notice; deleted on family request. Emails never published, deleted after 12 months.",
    moderated: true,
    message: "Thank you for your kind words. Your message will appear once it has been checked — usually within a few hours."
  },
  review: {
    title: "Family review",
    fields: [req("name", { max: 60 }), f("town", { max: 80 }), req("email", { pattern: EMAIL }),
      req("rating", { enum: ["1", "2", "3", "4", "5"] }), f("service", { enum: ["burial", "cremation", "direct-cremation", "pre-planning", "other"] }),
      req("message", { max: 1500 }), req("publish_ok", { enum: ["yes"] }), consent],
    notify: ["queue:moderation"], owner: "Office (moderation)", slaHours: 48, retention: "Published until the family asks us to remove it. Emails never published, deleted after 12 months.",
    moderated: true,
    message: "Thank you for taking the time to write to us. Your review will appear once we have read it, usually within two working days."
  },
  appointment: {
    title: "Appointment booking",
    fields: [req("name", { max: 100 }), req("phone", { pattern: PHONE }), req("email", { pattern: EMAIL }),
      req("appointment_type", { enum: ["arrange", "preplan", "viewing", "collect-ashes", "other"] }), req("location", { enum: ["main", "branch2", "home", "video"] }),
      req("date", { pattern: DATE, future: true }), req("time_slot", { enum: ["09:30", "11:00", "12:30", "14:30", "16:00"] }),
      f("attendees", { max: 2 }), f("access_needs", { max: 500 }), f("message", { max: 1000 }), consent],
    notify: ["email:office", "calendar:diary"], owner: "Office manager", slaHours: 4, retentionDays: 365, retention: "12 months",
    message: "Thank you. Your request is received. We will confirm the time by phone or email within 4 working hours."
  },
  feedback: {
    title: "Feedback or complaint",
    fields: [req("kind", { enum: ["compliment", "suggestion", "complaint"] }), f("name", { max: 100 }), f("email", { pattern: EMAIL }), f("phone", { pattern: PHONE }),
      f("funeral_ref", { max: 120 }), f("service_date", { pattern: DATE, notFuture: true }), req("message", { max: 3000 }),
      f("reply", { enum: ["yes", "no"] }), consent],
    notify: ["email:director"], owner: "Managing director", slaHours: 48, retentionDays: 2557, retention: "Complaints: 7 years; compliments: 24 months",
    message: "Thank you for telling us. If you asked for a reply, the managing director will contact you personally within two working days."
  },
  newsletter: {
    title: "Grief-support letters sign-up",
    fields: [req("email", { pattern: EMAIL }), f("first_name", { max: 60 }), f("interests", { multi: ["grief-letters", "remembrance-service", "news"] }),
      req("consent", { enum: ["yes"] })],
    notify: ["email:confirm-double-opt-in"], owner: "Aftercare co-ordinator", slaHours: 0, retentionDays: 730, retention: "Until unsubscribe; inactive 24 months → deleted",
    message: "Thank you. Please check your inbox and click the link to confirm — we only send letters once you confirm."
  }
};

export function validate(formId, body) {
  const def = FORMS[formId];
  if (!def) return { status: 404, error: "Unknown form." };
  // Spam: honeypot + minimum fill time (3 s) — silent success for bots.
  if (body.website) return { status: 200, spam: true };
  const ts = Number(body._ts);
  if (!ts || Date.now() - ts < 3000) return { status: 200, spam: true };

  const clean = {}, fields = {};
  const today = new Date().toISOString().slice(0, 10);
  for (const fd of def.fields) {
    let v = body[fd.name];
    if (fd.multi) {
      v = [].concat(v ?? []).map(String).filter(Boolean);
      if (v.some((x) => !fd.multi.includes(x))) fields[fd.name] = "Please choose from the list.";
      if (fd.required && !v.length) fields[fd.name] = "Please choose at least one.";
      clean[fd.name] = v; continue;
    }
    v = typeof v === "string" ? v.trim() : v == null ? "" : String(v);
    if (!v) { if (fd.required) fields[fd.name] = "This field is required."; continue; }
    if (v.length > fd.max) fields[fd.name] = `Please keep this under ${fd.max} characters.`;
    else if (fd.enum && !fd.enum.includes(v)) fields[fd.name] = "Please choose from the list.";
    else if (fd.pattern && !fd.pattern.test(v)) fields[fd.name] = "Please check the format.";
    else if (fd.notFuture && v > today) fields[fd.name] = "This date cannot be in the future.";
    else if (fd.future && v <= today) fields[fd.name] = "Please choose a date from tomorrow onwards.";
    clean[fd.name] = v;
  }
  if (Object.keys(fields).length) return { status: 422, error: "Please check the highlighted fields.", fields };
  return { status: 200, data: clean, def };
}
