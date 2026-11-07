# 04 · Form workflows

Each flow: **trigger → what the visitor sees → who is notified → internal owner → response SLA → storage and retention → follow-up**.
The same owner, SLA and retention values are in `site/forms.mjs`, which the local server logs for every submission. In production the server forwards each record to **Dílis** (webhook → case or lead), which sends the email and SMS alerts and escalates any breach of an SLA.

**Data storage (all forms):** submissions are encrypted in transit (HTTPS) and at rest. They are stored in the Dílis platform, hosted in the EU, and are never emailed in full (alerts contain a link, not the personal data). Access is role-based. The local demo writes to `site/data/*.jsonl` (gitignored).

**Standard escalation:** if the SLA passes with no "contacted" status, SMS the backup director, then the managing director.

---

### 1. Urgent call-back
```mermaid
flowchart LR
  A[Visitor submits call-back] --> B[Sees: 'We'll call within 15 minutes, day or night' + 24h number]
  B --> C{reason}
  C -- death / arranging --> D[SMS + push: on-call funeral director]
  C -- other --> E[Email: office inbox]
  D --> F[Owner: on-call FD · SLA 15 min, 24/7]
  E --> G[Owner: office · SLA 1 working hour]
  F & G --> H[Dílis: lead record · retain 12 months, then delete]
  H --> I[Follow-up: log the call outcome; convert to case if a funeral proceeds]
```

### 2. First notification of a death
```mermaid
flowchart LR
  A[Family submits details] --> B[Sees: 'The FD on call will phone within 15 minutes. You don't need to do anything else']
  B --> C[SMS + automated phone call: on-call FD<br/>Email copy: office]
  C --> D[Owner: on-call FD · SLA 15 min, 24/7]
  D --> E{doctor_status}
  E -- certified --> F[Arrange transfer into care]
  E -- coroner --> G[Liaise with the coroner's office / Gardaí]
  F & G --> H[Dílis: new CASE created · kin portal invite]
  H --> I[Retain: 7 years after the funeral, financial and legal]
  I --> J[Follow-up: arrangement meeting booked within 24 h]
```

### 3a. Arrangement enquiry
```mermaid
flowchart LR
  A[Submit enquiry] --> B[Sees: 'A funeral director will contact you within 2 hours']
  B --> C[Email: office + SMS: duty arranger]
  C --> D[Owner: arranging FD · SLA 2 h, 08:00–22:00; overnight by 10:00]
  D --> E[Dílis: lead → case]
  E --> F[Retain 7 years if a funeral proceeds; otherwise 12 months]
  F --> G[Follow-up: arrangement meeting + written itemised estimate]
```

### 3b. Quote request
```mermaid
flowchart LR
  A[Submit quote form] --> B[Sees: 'Itemised estimate by email within 1 working day']
  B --> C[Email: office]
  C --> D[Owner: office manager · SLA 1 working day]
  D --> E[Dílis: quote generated from the price list → PDF emailed]
  E --> F[Retain 12 months]
  F --> G[Follow-up: one courtesy call after 2 days, unless declined]
```

### 4. Pre-planning enquiry
```mermaid
flowchart LR
  A[Submit, with the calculator estimate attached] --> B[Sees: 'Adviser in touch within 2 working days, no obligation']
  B --> C[Email: pre-planning adviser]
  C --> D[Owner: pre-need adviser · SLA 2 working days]
  D --> E[Dílis: pre-need lead → wishes record]
  E --> F[Retain: life of plan + 7 years; enquiry only: 24 months]
  F --> G{marketing consent?}
  G -- yes --> H[Add to letters list, double opt-in]
  G -- no --> I[No marketing]
```

### 5. Death-notice submission
```mermaid
flowchart LR
  A[Submit notice] --> B[Sees: 'We'll phone to read it back. Nothing goes live without your approval']
  B --> C[Email: notices inbox + SMS: arranging FD]
  C --> D[Owner: arranging FD · SLA 2 h]
  D --> E[Phone the family · edit · approval logged in Dílis/kin portal]
  E --> F[Publish: website + RIP.ie + paper, as selected]
  F --> G[Retain: notice is a public memorial until the family asks; submission data 7 years]
  G --> H[Follow-up: update the notice if arrangements change; add the live-stream link]
```

### 6. Condolence (moderated)
```mermaid
flowchart LR
  A[Submit message] --> B[Sees: 'Your message will appear once checked']
  B --> C[Moderation queue in Dílis · daily digest email]
  C --> D[Owner: office moderator · SLA 4 h, 08:00–20:00]
  D --> E{Approve?}
  E -- yes --> F[Published: name, town, message · never the email]
  E -- no --> G[Rejected · kept 30 days · sender not notified]
  F --> H[Weekly digest to next of kin, if opted in]
  H --> I[Retain with the notice; delete on family request; emails deleted after 12 months]
```

### 7. Appointment booking
```mermaid
flowchart LR
  A[Request slot] --> B[Sees: 'We'll confirm within 4 working hours']
  B --> C[Email: office + tentative diary entry]
  C --> D[Owner: office manager · SLA 4 working hours]
  D --> E[Confirm by phone/email · calendar invite]
  E --> F[SMS reminder 24 h before]
  F --> G[Retain 12 months, or as part of the case]
```

### 8. Feedback / complaint
```mermaid
flowchart LR
  A[Submit feedback] --> B[Sees: 'Read by our MD; reply within 2 working days if requested']
  B --> C{kind}
  C -- complaint --> D[Email + SMS: managing director]
  C -- compliment/suggestion --> E[Email: managing director]
  D --> F[Owner: MD · acknowledge in 2 working days · resolve in 20]
  E --> G[Share with the team · ask permission to publish as a review]
  F --> H[Complaints log in Dílis · retain 7 years]
  G --> I[Retain 24 months]
```

### 9. Grief-support sign-up
```mermaid
flowchart LR
  A[Sign up] --> B[Sees: 'Check your inbox to confirm']
  B --> C[Confirmation email: double opt-in]
  C --> D{Confirmed within 7 days?}
  D -- no --> E[Delete the address]
  D -- yes --> F[Owner: aftercare co-ordinator]
  F --> G[Letters at 1, 3, 6 and 12 months · remembrance-service invite each November]
  G --> H[Retain until unsubscribe; inactive 24 months → delete]
```

## SLA summary

| Form | Owner | SLA | Channel |
|---|---|---|---|
| Call-back (death or arranging) | On-call FD | **15 min, 24/7** | SMS + push |
| First notification | On-call FD | **15 min, 24/7** | SMS + automated call |
| Arrangement enquiry | Arranging FD | 2 h (08:00–22:00) | Email + SMS |
| Death notice | Arranging FD | 2 h | Email + SMS |
| Condolence moderation | Office | 4 h (08:00–20:00) | Queue |
| Appointment | Office manager | 4 working hours | Email |
| Quote | Office manager | 1 working day | Email |
| Pre-planning | Pre-need adviser | 2 working days | Email |
| Feedback / complaint | Managing director | 2 working days (acknowledge) | Email (+ SMS for complaints) |
| Newsletter | Aftercare | Automated | Email |
