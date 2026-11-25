import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

const site = 'https://skipcam.selfgraphic.tech';
const routes = JSON.parse(await readFile('site/routes.json', 'utf8'));
const titles = new Set();
const descriptions = new Set();
const paths = new Set(routes.map(route => route.path));
const sitemap = await readFile('dist/site/sitemap.xml', 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);

assert.ok(routes.length >= 10, 'route registry should contain the expected useful pages');
for (const route of routes) {
  assert.ok(route.path.startsWith('/') && route.path.endsWith('/'), `canonical path format: ${route.path}`);
  assert.ok(!titles.has(route.title), `unique title: ${route.path}`);
  assert.ok(!descriptions.has(route.description), `unique description: ${route.path}`);
  titles.add(route.title);
  descriptions.add(route.description);
  const output = route.path === '/' ? 'dist/site/index.html' : `dist/site${route.path}index.html`;
  const html = await readFile(output, 'utf8');
  assert.match(html, new RegExp(`<link rel="canonical" href="${site.replaceAll('.', '\\.')}${route.path.replaceAll('/', '\\/')}">`), `canonical URL: ${route.path}`);
  assert.match(html, /<title>[^<]+<\/title>/, `title exists: ${route.path}`);
  assert.match(html, /<meta name="description" content="[^"]+">/, `description exists: ${route.path}`);
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1, `one H1: ${route.path}`);
  assert.match(html, /<article class="wrap route-copy">/, `server-rendered page content: ${route.path}`);
  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(jsonLd, `JSON-LD present: ${route.path}`);
  assert.doesNotThrow(() => JSON.parse(jsonLd[1]), `JSON-LD parses: ${route.path}`);
  const isNoindex = /<meta name="robots" content="noindex,follow">/.test(html);
  assert.equal(isNoindex, !route.indexable, `indexing directive matches route policy: ${route.path}`);
  assert.equal(sitemapUrls.includes(site + route.path), route.indexable, `sitemap membership: ${route.path}`);
  for (const [, href] of html.matchAll(/href="(\/[^"]*)"/g)) {
    const pathname = new URL(href, site).pathname;
    if (pathname.startsWith('/media/')) continue;
    if (pathname === '/404.html') continue;
    const normalized = pathname.endsWith('/') ? pathname : pathname + '/';
    assert.ok(paths.has(normalized) || pathname.endsWith('.css') || pathname.endsWith('.js') || pathname.endsWith('.webmanifest'), `internal URL resolves in registry: ${route.path} -> ${href}`);
  }
  if (!route.tool) assert.doesNotMatch(html, /id="tool-pane"/, `non-tool content page excludes empty app: ${route.path}`);
}

assert.ok(!paths.has('/404.html/'));
await access('dist/site/404.html');
assert.match(await readFile('dist/site/404.html', 'utf8'), /name="robots" content="noindex,follow"/);
const robots = await readFile('dist/site/robots.txt', 'utf8');
assert.match(robots, new RegExp(`Sitemap: ${site.replaceAll('.', '\\.')}\/sitemap\\.xml`));
assert.equal(sitemapUrls.length, routes.filter(route => route.indexable).length);
console.log(`Validated ${routes.length} static routes, canonical metadata, JSON-LD, index directives, internal links, 404, robots and sitemap.`);
