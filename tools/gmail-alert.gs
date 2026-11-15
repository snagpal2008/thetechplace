/**
 * Form alerts by Gmail: free, runs under the funeral home's own Google account.
 *
 * SETUP (about 5 minutes, signed in as snagpal2008@gmail.com):
 *  1. Go to https://script.google.com → New project. Delete the sample code and paste this file.
 *  2. Change KEY below to a long random text (for example, 40 random letters and numbers). Keep it private.
 *  3. Deploy → New deployment → type "Web app".
 *       Execute as: Me    ·    Who has access: Anyone
 *     Click Deploy and allow the permissions. (Google warns because it is your own unverified script:
 *     "Advanced" → "Go to … (unsafe)" → Allow. It only gets permission to send email as you.)
 *  4. Copy the Web app URL and add your key on the end:
 *       https://script.google.com/macros/s/XXXXXXXX/exec?key=YOUR-KEY
 *     That whole address is ALERT_WEBHOOK_URL. Put it in Cloudflare → your Worker → Settings →
 *     Variables and Secrets (type: Secret), or give it to Claude to set.
 *  5. Test: run the function testAlert() from the editor. You should get an email.
 *
 * "Anyone" access is needed so the website can call it; the KEY stops anyone else from using it.
 * Free Gmail can send about 100 of these emails a day.
 */
const KEY = 'CHANGE-ME-to-a-long-random-text';
const TO = 'snagpal2008@gmail.com';

function doPost(e) {
  if (!e || !e.parameter || e.parameter.key !== KEY || KEY.indexOf('CHANGE-ME') === 0) {
    return ContentService.createTextOutput('forbidden');
  }
  let p;
  try { p = JSON.parse(e.postData.contents); } catch (err) { return ContentService.createTextOutput('bad request'); }
  if (p.type === 'report') {   // the daily report from the website's scheduled job
    MailApp.sendEmail({ to: TO, subject: String(p.subject || 'Daily report').replace(/[\r\n]+/g, ' ').slice(0, 200),
                        body: String(p.body || '').slice(0, 20000), name: 'Website reports' });
    return ContentService.createTextOutput('ok');
  }
  sendAlertEmail_(p);
  return ContentService.createTextOutput('ok');
}

function sendAlertEmail_(p) {
  const clean = (s) => String(s == null ? '' : s).replace(/[\r\n]+/g, ' ').slice(0, 200);
  const urgent = p.urgent === true;
  const within = Number(p.respond_within_hours);
  const when = within < 1 ? Math.round(within * 60) + ' minutes' : within + ' hours';
  const subject = (urgent ? '🔴 URGENT: ' : '') + clean(p.form) + ' – ref ' + clean(p.reference);
  const c = p.contact || {};
  const lines = [
    clean(p.form) + (urgent ? '  (URGENT)' : ''),
    'Reference: ' + clean(p.reference),
    'Respond within: ' + when + '  ·  Owner: ' + clean(p.owner),
    '',
    'Name:  ' + clean(c.name),
    'Phone: ' + clean(c.phone),
    'Email: ' + clean(c.email),
  ];
  const d = p.details || {};
  Object.keys(d).forEach((k) => { if (d[k]) lines.push(k.replace(/_/g, ' ') + ': ' + clean(d[k])); });
  lines.push('', 'Full details are in the website database (see docs/08-hosting.md).', 'Received: ' + clean(p.received));
  MailApp.sendEmail({ to: TO, subject: subject, body: lines.join('\n'), name: 'Website alerts' });
}

function testAlert() {
  sendAlertEmail_({ form: 'Urgent call-back request (TEST)', urgent: true, respond_within_hours: 0.25,
    owner: 'On-call funeral director', reference: 'TEST1234', received: new Date().toISOString(),
    contact: { name: 'Test Person', phone: '087 000 0000', email: '' }, details: { about: 'death' } });
}
