import { build } from 'esbuild';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const entry = (file, dir) => ({ entryPoints: [file], bundle: true, outdir: dir, legalComments: 'inline', target: ['chrome120', 'firefox140'] });
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const { version } = await json('package.json');

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function renderInline(value) {
  const tokens = [];
  const source = String(value ?? '').replace(/\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`/g, (match, label, href, code) => {
    let html;
    if (code !== undefined) html = '<code>' + escapeHtml(code) + '</code>';
    else if (/^(?:https:\/\/|mailto:|\/)/.test(href)) html = '<a href="' + escapeHtml(href) + '">' + escapeHtml(label) + '</a>';
    else html = escapeHtml(label);
    const token = 'SKIPCAMTOKEN' + tokens.length + 'END';
    tokens.push([token, html]);
    return token;
  });
  let html = escapeHtml(source);
  for (const [token, replacement] of tokens) html = html.replaceAll(token, replacement);
  return html;
}

function renderRouteCopy(route) {
  const blocks = (route.blocks || []).map(block => {
    let content = (block.paragraphs || []).map(text => '<p>' + renderInline(text) + '</p>').join('');
    if (block.steps?.length) content += '<ol>' + block.steps.map(item => '<li>' + renderInline(item) + '</li>').join('') + '</ol>';
    if (block.items?.length) content += '<ul>' + block.items.map(item => '<li>' + renderInline(item) + '</li>').join('') + '</ul>';
    return '<section><h2>' + escapeHtml(block.heading) + '</h2>' + content + '</section>';
  }).join('');
  const questions = route.faqs?.length ? '<section class="route-faq"><h2>Common questions</h2>' + route.faqs.map(item => '<details><summary>' + escapeHtml(item.question) + '</summary><p>' + renderInline(item.answer) + '</p></details>').join('') + '</section>' : '';
  return '<article class="wrap route-copy"><p class="overline">SKIPCAM / ' + escapeHtml(route.h1.toUpperCase()) + '</p>' + blocks + questions + '</article>';
}

function structuredData(route, canonical, site) {
  const studio = 'https://www.selfgraphic.tech/';
  const graph = [
    {
      '@type': 'Organization', '@id': studio + '#organization', name: 'Self Graphic Lab',
      url: studio, email: 'contact@selfgraphic.tech'
    },
    {
      '@type': 'WebSite', '@id': site + '/#website', name: 'SkipCam', url: site + '/',
      publisher: { '@id': studio + '#organization' }, sameAs: ['https://github.com/asintha1a/skipcam']
    },
    {
      '@type': 'WebPage', '@id': canonical + '#webpage', name: route.title,
      description: route.description, url: canonical,
      isPartOf: { '@id': site + '/#website' }, publisher: { '@id': studio + '#organization' },
      inLanguage: 'en'
    }
  ];
  return '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replaceAll('<', '\\u003c') + '</script>';
}

async function browser(target) {
  const dir = 'dist/' + target;
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const base = await json('extension/manifest.base.json');
  const manifest = { ...base, ...await json('extension/manifest.' + target + '.json'), version: version.split('-')[0] };
  manifest.action.default_icon = base.icons;
  await writeFile(dir + '/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  await Promise.all([
    build({ ...entry('extension/background.js', dir), format: 'iife' }),
    build({ ...entry('extension/app.js', dir), format: 'esm' }),
    build({ ...entry('extension/scan-worker.js', dir), format: 'iife' }),
    ...['app.html', 'app.css', 'overlay.js', 'icons'].map(file => cp('extension/' + file, dir + '/' + file, { recursive: true })),
    ...['LICENSE', 'THIRD_PARTY_NOTICES.md', 'PRIVACY.md', 'notices'].map(file => cp(file, dir + '/' + file, { recursive: true }))
  ]);
  const archive = resolve('dist/skipcam-' + target + '-v' + version + '.zip');
  await rm(archive, { force: true });
  execFileSync('zip', ['-q', '-X', '-r', archive, '.'], { cwd: dir });
}

async function website() {
  const dir = 'dist/site';
  await rm(dir, { recursive: true, force: true });
  await cp('site', dir, { recursive: true, filter: file => !['app.js', 'demo.js', 'service-worker.js'].some(name => file.endsWith(name)) });
  await mkdir(dir + '/media', { recursive: true });
  await Promise.all([
    build({ ...entry('site/app.js', dir), format: 'esm' }),
    build({ ...entry('extension/scan-worker.js', dir), format: 'iife' }).then(() => {}),
    cp('assets/screenshots', dir + '/media', { recursive: true }),
    ...['symbol.svg', 'social-preview.png', 'cover.png', 'favicon.svg', 'favicon.png'].map(file => cp('assets/brand/' + file, dir + '/media/' + file)),
    cp('assets/brand/icon512.png', dir + '/media/app-icon-512.png'),
    cp('assets/brand/icon1024.png', dir + '/media/app-icon-1024.png')
  ]);
  await cp('notices', dir + '/notices', { recursive: true });
  const configured = process.env.SKIPCAM_SITE_URL || 'https://skipcam.selfgraphic.tech';
  const site = configured ? new URL(configured.includes('://') ? configured : 'https://' + configured).origin : null;
  const routes = await json('site/routes.json');
  const preview = process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_ENV === 'development';
  const rootHtml = await readFile(dir + '/index.html', 'utf8');
  for (const route of routes) {
    const canonical = site ? site + route.path : route.path;
    const title = escapeHtml(route.title);
    const description = escapeHtml(route.description);
    const metadata = site ? [
      '<link rel="canonical" href="' + escapeHtml(canonical) + '">',
      '<meta property="og:url" content="' + escapeHtml(canonical) + '">',
      '<meta property="og:image" content="' + site + '/media/social-preview.png">',
      '<meta property="og:image:width" content="1280"><meta property="og:image:height" content="640">',
      '<meta name="twitter:image" content="' + site + '/media/social-preview.png">',
      '<meta name="twitter:image:alt" content="SkipCam QR tools by Self Graphic Lab">'
    ].join('') : '';
    const robots = preview ? '<meta name="robots" content="noindex,nofollow">' : route.indexable ? '' : '<meta name="robots" content="noindex,follow">';
    let html = rootHtml
      .replace(/<title>[^<]*<\/title>/, '<title>' + title + '</title>')
      .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + description + '">')
      .replace(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + title + '">')
      .replace(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + description + '">')
      .replace(/<meta name="twitter:title" content="[^"]*">/, '<meta name="twitter:title" content="' + title + '">')
      .replace(/<meta name="twitter:description" content="[^"]*">/, '<meta name="twitter:description" content="' + description + '">')
      .replace('<!-- deploy-metadata -->', metadata)
      .replace('<!-- robots-index -->', robots)
      .replace('<!-- structured-data -->', structuredData(route, canonical, site));
    html = html.replace('<!-- page-h1 -->Scan QR Codes Online Without Your Phone', escapeHtml(route.h1));
    html = html.replace('<!-- route-lead -->Read a code from an image, paste a screenshot, or capture one frame from your screen.', escapeHtml(route.lead));
    html = html.replace('<!-- route-content -->', renderRouteCopy(route));
    if (!route.tool) html = html.replace(/<!-- tool-section:start -->[\s\S]*?<!-- tool-section:end -->/, '');
    if (route.path !== '/') html = html.replace(/<!-- homepage-content:start -->[\s\S]*?<!-- homepage-content:end -->/, '');
    const target = route.path === '/' ? dir + '/index.html' : dir + route.path + 'index.html';
    if (route.path !== '/') await mkdir(resolve(target, '..'), { recursive: true });
    await writeFile(target, html);
  }
  const notFound = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,follow"><meta name="theme-color" content="#111111"><title>Page not found | SkipCam</title><link rel="canonical" href="' + site + '/404.html"><link rel="stylesheet" href="/site.css"><link rel="icon" href="/media/favicon.svg" type="image/svg+xml"></head><body><main class="wrap route-copy"><p class="overline">SKIPCAM / 404</p><h1>Page not found</h1><p>The address may have changed. Choose a SkipCam tool below.</p><nav class="tool-tabs" aria-label="QR tools"><a href="/scan/">Scan a QR code</a><a href="/generate/">Generate a QR code</a><a href="/help/">Help</a></nav></main></body></html>';
  await writeFile(dir + '/404.html', notFound);
  await writeFile(dir + '/robots.txt', site && !preview ? 'User-agent: *\nAllow: /\nSitemap: ' + site + '/sitemap.xml\n' : 'User-agent: *\nDisallow: /\n');
  if (site && !preview) await writeFile(dir + '/sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + routes.filter(route => route.indexable).map(route => '<url><loc>' + site + route.path + '</loc></url>').join('') + '</urlset>\n');
  else await rm(dir + '/sitemap.xml', { force: true });
  const versionHash = createHash('sha256');
  const versionFiles = ['site/index.html', 'site/site.css', 'site/routes.json', 'site/manifest.webmanifest', 'site/service-worker.js',
    dir + '/app.js', dir + '/scan-worker.js', dir + '/media/app-icon-512.png', dir + '/media/app-icon-1024.png'];
  for (const file of await readdir('assets/screenshots')) if (file.endsWith('.png')) versionFiles.push('assets/screenshots/' + file);
  for (const file of versionFiles) versionHash.update(file).update(await readFile(file));
  const cacheVersion = versionHash.digest('hex').slice(0, 12);
  const workerSource = (await readFile('site/service-worker.js', 'utf8')).replaceAll('__CACHE_VERSION__', cacheVersion);
  await writeFile(dir + '/service-worker.js', workerSource);
}

const target = process.argv[2];
if (target === 'site') await website();
else if (['chromium', 'firefox'].includes(target)) await browser(target);
else if (!target) await Promise.all([browser('chromium'), browser('firefox'), website()]);
else throw Error('Use chromium, firefox or site.');
