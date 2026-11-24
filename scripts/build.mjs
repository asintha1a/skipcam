import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const entry = (file, dir) => ({ entryPoints: [file], bundle: true, outdir: dir, legalComments: 'inline', target: ['chrome120', 'firefox140'] });
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const { version } = await json('package.json');

async function browser(target) {
  const dir = 'dist/' + target;
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const base = await json('extension/manifest.base.json');
  const manifest = { ...base, ...await json('extension/manifest.' + target + '.json'), version };
  manifest.action.default_icon = base.icons;
  await writeFile(dir + '/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  await Promise.all([
    build({ ...entry('extension/background.js', dir), format: 'iife' }),
    build({ ...entry('extension/app.js', dir), format: 'esm' }),
    build({ ...entry('extension/scan-worker.js', dir), format: 'iife' }),
    ...['app.html', 'app.css', 'overlay.js', 'icons'].map(file => cp('extension/' + file, dir + '/' + file, { recursive: true })),
    ...['LICENSE', 'THIRD_PARTY_NOTICES.md', 'PRIVACY.md', 'notices'].map(file => cp(file, dir + '/' + file, { recursive: true }))
  ]);
  const archive = resolve('dist/snipray-' + target + '-v' + version + '.zip');
  await rm(archive, { force: true });
  execFileSync('zip', ['-q', '-X', '-r', archive, '.'], { cwd: dir });
}

async function website() {
  const dir = 'dist/site';
  await rm(dir, { recursive: true, force: true });
  await cp('site', dir, { recursive: true, filter: file => !file.endsWith('demo.js') });
  await mkdir(dir + '/media', { recursive: true });
  await Promise.all([
    build({ ...entry('site/demo.js', dir), format: 'esm' }),
    cp('assets/screenshots', dir + '/media', { recursive: true }),
    ...['symbol.svg', 'social-preview.png', 'cover.png'].map(file => cp('assets/brand/' + file, dir + '/media/' + file)),
    cp('notices', dir + '/notices', { recursive: true })
  ]);
  const configured = process.env.SNIPRAY_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const site = configured ? new URL(configured.includes('://') ? configured : 'https://' + configured).origin : null;
  const html = await readFile(dir + '/index.html', 'utf8');
  await writeFile(dir + '/index.html', html.replace('<!-- deploy-metadata -->', site ?
    '<link rel="canonical" href="' + site + '/"><meta property="og:url" content="' + site + '/"><meta property="og:image" content="' + site + '/media/social-preview.png"><meta name="twitter:card" content="summary_large_image">' : ''));
  await writeFile(dir + '/robots.txt', site ? 'User-agent: *\nAllow: /\nSitemap: ' + site + '/sitemap.xml\n' : 'User-agent: *\nDisallow: /\n');
  if (site) await writeFile(dir + '/sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>' + site + '/</loc></url></urlset>\n');
}

const target = process.argv[2];
if (target === 'site') await website();
else if (['chromium', 'firefox'].includes(target)) await browser(target);
else if (!target) await Promise.all([browser('chromium'), browser('firefox'), website()]);
else throw Error('Use chromium, firefox or site.');
