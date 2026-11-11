// Tests of the built website (dist/): every page builds, links and images resolve,
// accessibility basics are in place, the new sections exist, and the wording stays kind.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const site = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(site, "dist");
const pages = new Map(); // "/about/" → html

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

before(() => {
  execFileSync(process.execPath, ["build.mjs"], { cwd: site, stdio: "pipe" });
  for (const file of walk(dist).filter((f) => f.endsWith(".html"))) {
    const url = "/" + relative(dist, file).replace(/\\/g, "/").replace(/index\.html$/, "");
    pages.set(url, readFileSync(file, "utf8"));
  }
});

const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");

test("every page has a title, description, language, a single h1 and the 24-hour number", () => {
  assert.ok(pages.size >= 23, `expected at least 23 pages, got ${pages.size}`);
  const phone = JSON.parse(readFileSync(join(site, "config.json"), "utf8")).phone247;
  for (const [url, html] of pages) {
    assert.match(html, /<html lang="en-IE"/, url);
    assert.match(html, /<title>[^<]{10,}<\/title>/, `${url}: title`);
    assert.match(html, /<meta name="description" content="[^"]{30,}">/, `${url}: description`);
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${url}: exactly one h1`);
    assert.ok(html.includes(phone), `${url}: 24-hour phone number`);
  }
});

test("no unfilled {{tokens}} or %PLACEHOLDERS% are left in the output", () => {
  for (const [url, html] of pages) {
    assert.doesNotMatch(html, /\{\{\w+\}\}/, url);
    assert.doesNotMatch(html, /%(TITLE|BODY|HEAD|PATH|DESCRIPTION)%/, url);
    assert.doesNotMatch(html, /<!--#include/, url);
  }
});

test("every internal link, image and script points at a file that exists", () => {
  const missing = [];
  for (const [url, html] of pages) {
    const refs = [...html.matchAll(/\b(?:href|src)="(\/[^"#?]*)/g)].map((m) => m[1])
      .concat([...html.matchAll(/\bsrcset="([^"]+)"/g)].flatMap((m) => m[1].split(",").map((p) => p.trim().split(/\s+/)[0])));
    for (const ref of refs) {
      if (!ref.startsWith("/") || ref.startsWith("//") || ref.startsWith("/api/")) continue;
      const file = join(dist, ref.endsWith("/") ? ref + "index.html" : ref);
      if (!existsSync(file)) missing.push(`${url} → ${ref}`);
    }
  }
  assert.deepEqual(missing, []);
});

test("every image has an alt attribute and explicit dimensions", () => {
  for (const [url, html] of pages) {
    for (const img of html.match(/<img\b[^>]*>/g) || []) {
      assert.match(img, /\balt="/, `${url}: ${img.slice(0, 80)}`);
      assert.match(img, /\bwidth="\d+" height="\d+"/, `${url}: ${img.slice(0, 80)}`);
    }
  }
});

test("every form field has a label, and every form posts to a known API form", async () => {
  const { FORMS } = await import("../forms.mjs");
  for (const [url, html] of pages) {
    for (const [, id] of html.matchAll(/data-form="([\w-]+)"/g)) assert.ok(FORMS[id], `${url}: unknown form ${id}`);
    for (const [tag, id] of html.matchAll(/<(?:input|select|textarea)\b[^>]*\bid="([\w-]+)"[^>]*>/g)) {
      if (/type="hidden"/.test(tag)) continue;
      if (["q", "consent-analytics"].includes(id) || id.startsWith("calc")) continue;
      assert.match(html, new RegExp(`<label[^>]*for="${id}"`), `${url}: no label for #${id}`);
    }
  }
});

test("empathy: no clichés that dismiss a family's pain", () => {
  // Phrases bereavement guidance warns against. The "what we avoid" card on /about/ discusses
  // some of them on purpose, so it is left out of the check.
  const banned = [/better place/i, /everything happens for a reason/i, /time heals/i, /god needed/i, /\bmove on\b/i,
    /closure/i, /be strong/i, /at least (?:she|he|they) (?:had|lived)/i, /I know how you feel/i, /\bthe deceased'?s? remains\b/i,
    /\bcorpse\b/i, /\bcheap\b/i, /\bact now\b/i, /limited time/i];
  for (const [url, html] of pages) {
    const body = text(html.replace(/<div class="card avoid">[\s\S]*?<\/div>/g, ""));
    for (const re of banned) assert.doesNotMatch(body, re, `${url}: "${body.match(re)?.[0]}"`);
  }
});

test("death registration page answers who does the formalities, with the key Irish facts", () => {
  const t = text(pages.get("/death-registration/"));
  assert.match(t, /Who usually does the death certificate formalities\?/);
  assert.match(t, /close relative/i);
  assert.match(t, /qualified informant/i);
  assert.match(t, /within 3 months/i);
  assert.match(t, /any civil registration office/i);
  assert.match(t, /Medical Certificate of the Cause of Death/);
  assert.match(t, /coroner/i);
  assert.match(t, /interim certificate/i);
  assert.match(t, /funeral director/i);
  for (const url of ["/someone-has-died/", "/"]) assert.ok(pages.get(url).includes('href="/death-registration/"'), `${url} links to it`);
});

test("reviews: home and reviews pages load approved reviews, with clearly labelled samples as fallback", () => {
  for (const url of ["/", "/reviews/"]) {
    const html = pages.get(url);
    assert.match(html, /data-reviews data-limit="\d+"/, url);
    assert.match(html, /data-review-summary/, url);
    const samples = html.match(/class="card review-card sample-review"/g) || [];
    assert.equal(samples.length, 3, url);
    assert.equal((html.match(/Sample review: real reviews appear here once approved/g) || []).length, 3, `${url}: samples labelled`);
  }
  const form = pages.get("/reviews/");
  assert.match(form, /data-form="review"/);
  for (const n of [1, 2, 3, 4, 5]) assert.match(form, new RegExp(`name="rating" value="${n}"`));
  assert.match(form, /name="publish_ok"/);
  assert.ok(pages.get("/").includes('href="/reviews/'));
});

test("team, livestream and language sections are present", () => {
  const about = pages.get("/about/");
  assert.equal((about.match(/class="card team-card"/g) || []).length, 4);
  assert.match(about, /id="language"/);
  assert.match(pages.get("/services/"), /id="livestream"/);
  assert.match(pages.get("/funeral-notices/sample-notice/"), /Watch the Mass online/);
  assert.match(pages.get("/support/"), /How to support someone who is grieving/);
});

test("photographs: every image file is credited in IMAGE_CREDITS.md", () => {
  const credits = readFileSync(join(site, "IMAGE_CREDITS.md"), "utf8");
  const files = readdirSync(join(site, "src/assets/img")).filter((f) => f.endsWith(".webp"));
  const bases = [...new Set(files.map((f) => f.replace(/-\d+\.webp$/, "")))];
  for (const b of bases) assert.ok(credits.includes(b), `${b} is not in IMAGE_CREDITS.md`);
});

test("sitemap lists every page except 404", () => {
  const sitemap = readFileSync(join(dist, "sitemap.xml"), "utf8");
  for (const url of pages.keys()) if (url !== "/404.html") assert.ok(sitemap.includes(`${url}</loc>`), url);
});
