// Static build: copies src/ to dist/, expands <!--#include name--> partials and
// fills {{token}} placeholders from config.json. No dependencies.
//   node build.mjs
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, copyFileSync, rmSync } from "node:fs";
import { join, dirname, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, "src");
const dist = join(root, "dist");
const config = JSON.parse(readFileSync(join(root, "config.json"), "utf8"));

const fill = (text) =>
  text.replace(/\{\{(\w+)\}\}/g, (m, key) => {
    if (!(key in config)) throw new Error(`Unknown token ${m}`);
    return config[key];
  });

const partial = (name) => readFileSync(join(src, "partials", `${name}.html`), "utf8");

// Pages that don't start with <!doctype> are wrapped in partials/layout.html.
// Metadata comes from leading comments:  <!--title: ...-->  <!--description: ...-->  <!--head: extra-->
function wrap(html, rel) {
  if (/^\s*<!doctype/i.test(html)) return html;
  const meta = {};
  html = html.replace(/^\s*<!--(\w+):([\s\S]*?)-->\s*/g, (_, k, v) => { meta[k] = v.trim(); return ""; });
  while (/^\s*<!--(\w+):/.test(html)) html = html.replace(/^\s*<!--(\w+):([\s\S]*?)-->\s*/, (_, k, v) => { meta[k] = v.trim(); return ""; });
  const path = "/" + rel.replace(/\\/g, "/").replace(/index\.html$/, "");
  return partial("layout")
    .replace("%TITLE%", meta.title || config.name)
    .replace(/%DESCRIPTION%/g, meta.description || "")
    .replace(/%PATH%/g, path)
    .replace("%HEAD%", () => meta.head || "")
    .replace("%BODY%", () => html);
}

function render(html) {
  // Partials may themselves contain includes (one level is enough here).
  for (let i = 0; i < 2; i++) html = html.replace(/<!--#include (\w[\w-]*)-->/g, (_, n) => partial(n));
  return fill(html);
}

rmSync(dist, { recursive: true, force: true });
const pages = [];

(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const from = join(dir, entry);
    const rel = relative(src, from);
    if (rel.startsWith("partials")) continue;
    const to = join(dist, rel);
    if (statSync(from).isDirectory()) { walk(from); continue; }
    mkdirSync(dirname(to), { recursive: true });
    const ext = extname(entry);
    if ([".html", ".xml", ".txt", ".json", ".webmanifest", ".css", ".js"].includes(ext)) {
      writeFileSync(to, ext === ".html" ? render(wrap(readFileSync(from, "utf8"), rel)) : fill(readFileSync(from, "utf8")));
      if (ext === ".html" && entry !== "404.html") pages.push(rel.replace(/index\.html$/, "").replace(/\\/g, "/"));
    } else copyFileSync(from, to);
  }
})(src);

// sitemap.xml generated from the pages that were built
const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    pages.sort().map((p) => `  <url><loc>${config.domain}/${p}</loc><lastmod>${today}</lastmod></url>`).join("\n") +
    `\n</urlset>\n`
);
console.log(`Built ${pages.length} pages into dist/`);
