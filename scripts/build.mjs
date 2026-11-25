import { build } from 'esbuild';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const entry = (file, dir) => ({ entryPoints: [file], bundle: true, outdir: dir, legalComments: 'inline', target: ['chrome120', 'firefox140'] });
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const { version } = await json('package.json');

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
  const routeMetadata = {
    '/': ['SkipCam — Skip the camera. Scan anyway.', 'Scan, generate and inspect QR codes directly in your browser. Free, private QR tools with no phone required.'],
    '/scan': ['Free QR Code Scanner Online | SkipCam', 'Scan a QR code from an image, screenshot or screen capture. Private local QR decoding with no uploads.'],
    '/generate': ['Free QR Code Generator Online | SkipCam', 'Generate QR codes for links, text, Wi-Fi, email, phone, SMS and contact cards. Customize and export locally.'],
    '/history': ['Private QR Scan History | SkipCam', 'Optional, local-only scan history. Search eligible QR scans stored on this device. History is off by default.'],
    '/extension': ['SkipCam Browser Extension | Skip the camera', 'Install the free SkipCam browser extension for direct webpage scanning, image context menus and browser integration.']
  };
  const rootHtml = await readFile(dir + '/index.html', 'utf8');
  for (const [route, [title, description]] of Object.entries(routeMetadata)) {
    const canonical = site ? site + (route === '/' ? '/' : route + '/') : '';
    const metadata = site ?
      '<link rel="canonical" href="' + canonical + '"><meta property="og:url" content="' + canonical + '"><meta property="og:image" content="' + site + '/media/social-preview.png"><meta name="twitter:card" content="summary_large_image">' : '';
    const html = rootHtml.replace('<title>SkipCam — Skip the camera. Scan anyway.</title>', '<title>' + title + '</title>')
      .replace('content="Scan a QR code online from an image, screenshot or screen capture. Generate codes locally. Free, private and no phone required."', 'content="' + description + '"')
      .replace('<!-- deploy-metadata -->', metadata);
    const target = route === '/' ? dir + '/index.html' : dir + route + '/index.html';
    if (route !== '/') await mkdir(resolve(target, '..'), { recursive: true });
    await writeFile(target, html);
  }
  await writeFile(dir + '/robots.txt', site ? 'User-agent: *\nAllow: /\nSitemap: ' + site + '/sitemap.xml\n' : 'User-agent: *\nDisallow: /\n');
  if (site) await writeFile(dir + '/sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + Object.keys(routeMetadata).map(route => '<url><loc>' + site + (route === '/' ? '/' : route + '/') + '</loc></url>').join('') + '</urlset>\n');
  const versionHash = createHash('sha256');
  const versionFiles = ['site/index.html', 'site/site.css', 'site/manifest.webmanifest', 'site/service-worker.js',
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
