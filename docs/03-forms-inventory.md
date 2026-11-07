# 03 · Forms inventory

All forms are built in `site/src/` and validated twice: in the browser (HTML5 + `main.js`) and on the server (`site/forms.mjs`, the single source of truth). Field names below match the code.

**Common to every form**

- **Spam protection:** (1) hidden honeypot field `website`, which must be empty; (2) time trap `_ts`, which rejects submissions made under 3 seconds after page load; (3) per-IP rate limit of 10 posts per 10 minutes; (4) a 32 KB body limit; (5) strict server-side allow-lists for every choice field. Bots get a silent "Thank you" so they learn nothing. At launch, add **Friendly Captcha** or **Cloudflare Turnstile** (both privacy-friendly, no image puzzles) to the public condolence and newsletter forms only. Never add a CAPTCHA to the urgent forms.
- **Standard consent text** (`partials/consent.html`, required):
  > I agree that {Funeral Home} may use these details to respond to this request, as described in our privacy notice. We will never sell your details or use them for marketing without your separate permission.
- **Phone validation:** `[0-9 +\-()]{7,20}`. **Email:** standard address format. **Text:** trimmed, with a maximum length per field.
- Every form shows: labels above fields; "(optional)" marked rather than asterisks for required fields; error text under the field; a summary message that receives focus; and the 24-hour number if sending fails.

---

### 1. Contact / urgent call-back (`callback`), `/contact/#callback`
**Purpose:** someone wants a phone call rather than to ring us.

| Field | Type | Required | Validation |
|---|---|---|---|
| name | text | ✔ | ≤100 |
| phone | tel | ✔ | phone pattern |
| reason | select: death / arranging / preplanning / notice / other | ✔ | allow-list; drives routing |
| best_time | select: asap / morning / afternoon / evening | – | allow-list |
| message | textarea | – | ≤1000 |
| consent | checkbox | ✔ | = yes |

### 2. First notification of a death (`first-notification`), `/someone-has-died/#tell-us`
**Purpose:** collect the minimum needed for the on-call funeral director to phone back and arrange the transfer into our care.

| Field | Type | Required | Validation |
|---|---|---|---|
| caller_name | text | ✔ | ≤100 |
| caller_phone | tel | ✔ | phone pattern |
| caller_email | email | – | email |
| relationship | text | ✔ | ≤60 |
| deceased_name | text | ✔ | ≤120 |
| date_of_death | date | ✔ | not in the future |
| place_type | select: home / hospital / nursing-home / hospice / other | ✔ | allow-list |
| place_address | text | ✔ | ≤300 |
| doctor_status | select: certified / coroner / not-sure | ✔ | allow-list; "coroner" flags a likely delay |
| wishes | select: burial / cremation / not-sure | – | allow-list |
| message | textarea | – | ≤1500 |
| consent | checkbox | ✔ | = yes |

### 3a. Funeral arrangement enquiry (`arrangement-enquiry`), `/arrange-a-funeral/`
| Field | Type | Required | Validation |
|---|---|---|---|
| name | text | ✔ | ≤100 |
| phone | tel | ✔ | phone |
| email | email | – | email |
| deceased_name | text | – | ≤120 |
| funeral_type | select: burial / cremation / direct-cremation / not-sure | – | allow-list |
| contact_pref | select: phone / email / visit / home-visit | – | allow-list |
| message | textarea | – | ≤1500 |
| consent | checkbox | ✔ | = yes |

### 3b. Quote request (`quote`), `/quote/`
| Field | Type | Required | Validation |
|---|---|---|---|
| name | text | ✔ | ≤100 |
| email | email | ✔ | email (the quote is emailed) |
| phone | tel | – | phone |
| funeral_type | radio: burial / cremation / direct-cremation | ✔ | allow-list |
| coffin | select: simple / traditional / premium / eco / advice | ✔ | allow-list |
| extras | checkboxes: embalming, limousine, flowers, notice-paper, stationery, music, livestream, catering | – | each in allow-list |
| ceremony | select: church / crematorium / funeral-home / graveside / none | – | allow-list |
| location | text | – | ≤120 |
| message | textarea | – | ≤1500 |
| consent | checkbox | ✔ | = yes |

### 4. Pre-planning enquiry (`preplanning`), `/pre-planning/#plan-form`
| Field | Type | Required | Validation |
|---|---|---|---|
| name | text | ✔ | ≤100 |
| email | email | ✔ | email |
| phone | tel | – | phone |
| for_whom | radio: myself / someone-else | ✔ | allow-list |
| funeral_type | select | – | allow-list |
| contact_pref | select | – | allow-list |
| estimate | hidden, filled from the calculator | – | ≤1500 |
| message | textarea | – | ≤1500 |
| consent | checkbox | ✔ | = yes |
| marketing | checkbox (separate, unticked) | – | = yes. Separate consent for letters |

### 5. Death-notice submission (`death-notice`), `/funeral-notices/submit/`
| Field | Type | Required | Validation |
|---|---|---|---|
| submitter_name / submitter_phone / submitter_email | text / tel / email | ✔ | ≤100 / phone / email |
| relationship | text | ✔ | ≤60 |
| deceased_name | text | ✔ | ≤120 (include née) |
| deceased_town | text | ✔ | ≤120 |
| date_of_death | date | ✔ | not in the future |
| notice_text | textarea | ✔ | ≤3000 |
| reposing / service | textarea | – | ≤600 each |
| donations | text | – | ≤300 |
| channels | checkboxes: website / ripie / newspaper | – | allow-list |
| family_approved | checkbox | ✔ | "I confirm the immediate family has agreed to this notice being published" |
| consent | checkbox | ✔ | = yes |

Nothing is published automatically. A funeral director phones and reads the wording back first.

### 6. Condolence / tribute (`condolence`), on every notice page (**moderated**)
| Field | Type | Required | Validation |
|---|---|---|---|
| notice | hidden (notice id) | ✔ | ≤120 |
| name | text | ✔ | ≤100 (published) |
| town | text | – | ≤80 (published) |
| email | email | ✔ | email (never published) |
| message | textarea | ✔ | ≤1000 (published, rendered as plain text, never HTML) |
| publish_ok | checkbox | ✔ | "I agree that my name, town and message may be published on this page." |
| consent | checkbox | ✔ | = yes |

Stored as `status: pending` and shown only after approval (`node moderate.mjs approve <id>` locally; Dílis moderation queue in production). Moderation rules: no abuse; no allegations about the cause of death; no commercial links; no personal data about third parties. The family can ask for any message, or the whole book, to be removed.

### 7. Appointment booking (`appointment`), `/appointments/`
| Field | Type | Required | Validation |
|---|---|---|---|
| name / phone / email | text / tel / email | ✔ | ≤100 / phone / email |
| appointment_type | select: arrange / preplan / viewing / collect-ashes / other | ✔ | allow-list |
| location | select: main / branch2 / home / video | ✔ | allow-list |
| date | date | ✔ | tomorrow or later (same-day requests: please phone) |
| time_slot | select: 09:30 / 11:00 / 12:30 / 14:30 / 16:00 | ✔ | allow-list |
| attendees | number | – | 1–20 |
| access_needs | text | – | ≤500 (wheelchair, interpreter…) |
| message | textarea | – | ≤1000 |
| consent | checkbox | ✔ | = yes |

### 8. Feedback / complaint (`feedback`), `/feedback/`
| Field | Type | Required | Validation |
|---|---|---|---|
| kind | radio: compliment / suggestion / complaint | ✔ | allow-list |
| message | textarea | ✔ | ≤3000 |
| funeral_ref | text | – | ≤120 |
| service_date | date | – | not in the future |
| name / email / phone | text / email / tel | – | anonymous feedback is allowed |
| reply | radio: yes / no | – | – |
| consent | checkbox | ✔ | = yes |

### 9. Newsletter / grief-support sign-up (`newsletter`), `/newsletter/`
| Field | Type | Required | Validation |
|---|---|---|---|
| email | email | ✔ | email |
| first_name | text | – | ≤60 |
| interests | checkboxes: grief-letters / remembrance-service / news | – | allow-list |
| consent | checkbox | ✔ | Marketing consent wording: "Yes, please email me… confirmation email first… unsubscribe at any time." |

**Double opt-in:** nothing is sent until the address is confirmed. Every email has a one-click unsubscribe link.
