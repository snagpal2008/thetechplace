// Builds dist/ from src/ by inserting the shared partials. Usage: node build.mjs [https://your-domain]
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';

const root = dirname(new URL(import.meta.url).pathname);
// Final public URL, e.g. https://harpreetchhabra.ca. Without it, canonical/og:url tags and the sitemap are left out.
const siteUrl = (process.argv[2] || process.env.SITE_URL || '').replace(/\/$/, '');
const host = siteUrl.replace(/^https?:\/\//, '');
const src = join(root, 'src'), out = join(root, 'dist');
const part = (n) => readFileSync(join(root, 'partials', n + '.html'), 'utf8');

rmSync(out, { recursive: true, force: true });
cpSync(src, out, { recursive: true });

const pages = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.html')) pages.push(p);
  }
})(out);

for (const p of pages) {
  const rel = '/' + relative(out, p).replace(/index\.html$/, '');
  let html = readFileSync(p, 'utf8');
  if (!siteUrl) html = html.replace(/^.*SITE_URL\/[^"]*">\n|^.*"url":"https:\/\/SITE_URL\/",/gm, (m) => m.includes('"url"') ? m.replace(/"url":"https:\/\/SITE_URL\/",/, '') : '');
  html = html
    .replace('<!--HEAD-->', part('head'))
    .replace('<!--HEADER-->', part('header'))
    .replace('<!--FOOTER-->', part('footer'))
    .replaceAll('SITE_URL', host)
    .replace('NAV_CONTACT', rel === '/contact/' ? 'aria-current="page"' : '')
    .replace('NAV_HOME', '');
  writeFileSync(p, html);
}

const urls = ['/', '/contact/'];
if (siteUrl) writeFileSync(join(out, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${siteUrl}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(join(out, 'robots.txt'), 'User-agent: *\nAllow: /\n' + (siteUrl ? `Sitemap: ${siteUrl}/sitemap.xml\n` : ''));
console.log(`Built ${pages.length} pages into dist/` + (siteUrl ? ` for ${siteUrl}` : ' (no SITE_URL set: canonical links and sitemap omitted)'));
