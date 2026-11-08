// Generates tools/apps-script/Code.gs from the template and site/forms.mjs, so the Google Sheets
// backend uses exactly the same form fields and validation as the rest of the site.
//   npm run apps-script        (from site/)
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(here, "..", "site", "config.json"), "utf8"));
const forms = readFileSync(join(here, "..", "site", "forms.mjs"), "utf8")
  .replace(/^\/\/.*\n/gm, "")              // drop the module's header comments
  .replace(/^export\s+/gm, "");            // Apps Script has no modules
const out = readFileSync(join(here, "apps-script", "backend.gs.template"), "utf8")
  .replace("%%FORMS%%", () => forms.trim())
  .replace("%%ALERT_EMAIL%%", config.alertEmail || "");
writeFileSync(join(here, "apps-script", "Code.gs"), out);
console.log(`Wrote tools/apps-script/Code.gs (alerts to ${config.alertEmail || "nobody: set alertEmail in config.json"})`);
