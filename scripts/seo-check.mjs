import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const ignored = new Set(['node_modules', '.git']);
const htmlFiles = [];

function collectHtml(directory) {
  for (const name of readdirSync(directory)) {
    if (ignored.has(name)) continue;
    const absolute = join(directory, name);
    if (statSync(absolute).isDirectory()) collectHtml(absolute);
    else if (name.endsWith('.html')) htmlFiles.push(absolute);
  }
}

collectHtml(root);

const failures = [];
const titles = new Map();
const descriptions = new Map();
const inbound = new Map(htmlFiles.map((file) => [relative(root, file), 0]));
const indexableUrls = new Set();
const origin = 'https://lupidocs.com';

const one = (html, pattern) => html.match(pattern)?.[1]?.trim() || '';
const all = (html, pattern) => [...html.matchAll(pattern)].map((match) => match[1]);

for (const file of htmlFiles) {
  const path = relative(root, file);
  const html = readFileSync(file, 'utf8');
  const title = one(html, /<title>([\s\S]*?)<\/title>/i);
  const description = one(html, /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  const canonical = one(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  const robots = one(html, /<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i).toLowerCase();
  const h1Count = (html.match(/<h1\b/gi) || []).length;

  if (!title) failures.push(`${path}: missing title`);
  if (!description) failures.push(`${path}: missing meta description`);
  if (!canonical) failures.push(`${path}: missing canonical`);
  if (h1Count !== 1) failures.push(`${path}: expected one H1, found ${h1Count}`);
  if (title && titles.has(title)) failures.push(`${path}: duplicate title with ${titles.get(title)}`);
  if (description && descriptions.has(description)) failures.push(`${path}: duplicate description with ${descriptions.get(description)}`);
  titles.set(title, path);
  descriptions.set(description, path);

  for (const raw of all(html, /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      JSON.parse(raw);
    } catch (error) {
      failures.push(`${path}: invalid JSON-LD (${error.message})`);
    }
  }

  for (const href of all(html, /<a\b[^>]*href=["']([^"']+)["']/gi)) {
    if (!href || href.startsWith('#') || /^(https?:|mailto:|tel:|javascript:)/i.test(href)) continue;
    const clean = href.split('#')[0].split('?')[0];
    const target = clean.startsWith('/') ? resolve(root, `.${clean}`) : resolve(dirname(file), clean);
    const normalized = clean === '/' ? join(root, 'index.html') : target;
    if (!normalized.endsWith('.html')) continue;
    try {
      if (!statSync(normalized).isFile()) failures.push(`${path}: broken link ${href}`);
      else {
        const rel = relative(root, normalized);
        inbound.set(rel, (inbound.get(rel) || 0) + 1);
      }
    } catch {
      failures.push(`${path}: broken link ${href}`);
    }
  }

  if (!robots.includes('noindex') && canonical.startsWith(origin)) indexableUrls.add(canonical);
}

for (const [path, count] of inbound) {
  const html = readFileSync(join(root, path), 'utf8');
  if (path !== 'index.html' && !/name=["']robots["'][^>]*noindex/i.test(html) && count === 0) {
    failures.push(`${path}: orphaned indexable page`);
  }
}

const sitemap = readFileSync(join(root, 'sitemap.xml'), 'utf8');
const sitemapUrls = new Set(all(sitemap, /<loc>([^<]+)<\/loc>/gi));
for (const url of indexableUrls) if (!sitemapUrls.has(url)) failures.push(`sitemap.xml: missing ${url}`);
for (const url of sitemapUrls) if (!indexableUrls.has(url)) failures.push(`sitemap.xml: non-indexable or unknown ${url}`);

if (failures.length) {
  console.error(`SEO checks failed (${failures.length}):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(`SEO checks passed for ${htmlFiles.length} HTML files and ${sitemapUrls.size} sitemap URLs.`);
