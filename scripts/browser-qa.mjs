import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('dist/site');
const screenshots = resolve('assets/screenshots');
const executableCandidates = [
  process.env.CHROME_EXECUTABLE,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
].filter(Boolean);
let executablePath;
for (const candidate of executableCandidates) {
  try { await access(candidate, constants.X_OK); executablePath = candidate; break; } catch { /* try next installed browser */ }
}
if (!executablePath) throw Error('No compatible installed Chromium executable was found. Set CHROME_EXECUTABLE.');
await mkdir(screenshots, { recursive: true });

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };
const server = createServer(async (request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname); } catch { response.writeHead(400).end(); return; }
  let file = resolve(root, '.' + pathname);
  if (pathname.endsWith('/') || !extname(pathname)) file = join(file, 'index.html');
  if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
  try {
    const data = await (await import('node:fs/promises')).readFile(file);
    response.writeHead(200, {
      'Content-Type': mime[extname(file)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
    }).end(data);
  } catch { response.writeHead(404).end('Not found'); }
});
const remoteOrigin = process.env.SKIPCAM_QA_URL;
if (!remoteOrigin) await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
const origin = remoteOrigin ? new URL(remoteOrigin).origin : 'http://127.0.0.1:' + server.address().port;
const profile = await mkdtemp(join(tmpdir(), 'skipcam-web-qa-'));
console.log('Starting isolated Chrome at ' + origin);
let context;
const errors = [];
const failedRequests = [];
const checks = [];
function check(name) { checks.push(name); console.log('PASS ' + name); }
function encoded(buffer) { return buffer.toString('base64'); }
function urlFor(text) { return Buffer.from(text, 'base64'); }
async function pngFromPreview(page) {
  const value = await page.locator('.generator-output canvas').evaluate(canvas => canvas.toDataURL('image/png').split(',')[1]);
  return Buffer.from(value, 'base64');
}
try {
  context = await chromium.launchPersistentContext(profile, {
    executablePath,
    headless: true,
    acceptDownloads: true,
    viewport: { width: 1365, height: 900 },
    args: process.platform === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : []
  });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
  const page = context.pages()[0] || await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('console', message => { if (message.type() === 'error') errors.push({ text: message.text(), location: message.location() }); });
  await page.goto(origin + '/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  assert.match(await page.title(), /SkipCam/);
  assert.equal(await page.locator('#tool-pane .scanner').count(), 1);
  await page.evaluate(async () => { await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(Error('PWA service worker did not activate')), 10000))]); });
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('#tool-pane .scanner').count(), 1);
  await page.locator('#tool').screenshot({ path: join(screenshots, 'web-app-scanner.png') });
  const staticRoutes = [
    ['/scan/', 'Scan a QR Code from an Image or Screen', '#tool-pane .scanner'],
    ['/generate/', 'Create a QR Code for Free', '#generator-type'],
    ['/history/', 'Your QR Scan History', '.history-view'],
    ['/extension/', 'Add QR Scanning to Your Browser', '.extension-panel'],
    ['/scan-qr-code-from-image/', 'Scan a QR Code from an Image', '#tool-pane .scanner'],
    ['/scan-qr-code-without-phone/', 'Scan a QR Code Without a Phone', '#tool-pane .scanner'],
    ['/wifi-qr-code-generator/', 'Create a Wi-Fi QR Code', '#generator-type'],
    ['/guides/why-a-qr-code-will-not-scan/', 'Why Won\'t My QR Code Scan?', null],
    ['/about/', 'About SkipCam', null], ['/privacy/', 'SkipCam Privacy', null],
    ['/security/', 'Security and QR Link Checks', null], ['/help/', 'SkipCam Help', null]
  ];
  for (const [path, heading, selector] of staticRoutes) {
    await page.goto(origin + path, { waitUntil: 'domcontentloaded' });
    assert.equal((await page.locator('h1').textContent()).trim(), heading, `route H1 ${path}`);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://skipcam.selfgraphic.tech' + path);
    if (selector) await page.locator(selector).waitFor();
  }
  await page.goto(origin + '/history/', { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex,follow');
  await page.goto(origin + '/', { waitUntil: 'domcontentloaded' });
  await page.locator('#tool-pane .scanner').waitFor();
  check('tool-first homepage, direct static routes, history noindex and PWA service worker');

  await page.locator('a[data-tab="generate"]').click();
  await page.getByLabel('Website URL', { exact: true }).fill('https://example.org/');
  await page.locator('.generator-output canvas').waitFor();
  const baseQr = await pngFromPreview(page);
  await page.locator('#tool').screenshot({ path: join(screenshots, 'web-app-generator.png') });
  const pngDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  assert.match((await pngDownload).suggestedFilename(), /\.png$/);
  const svgDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download SVG' }).click();
  assert.match((await svgDownload).suggestedFilename(), /\.svg$/);
  check('generator live preview and PNG/SVG exports');

  const formats = [
    ['text', 'Text', 'SkipCam local QR'],
    ['wifi', 'Network name', 'studio-net'],
    ['email', 'Email address', 'hello@example.org'],
    ['phone', 'Phone number', '+15551234567'],
    ['sms', 'Phone number', '+15551234567'],
    ['contact', 'Full name', 'SkipCam Tester']
  ];
  for (const [type, field, value] of formats) {
    await page.locator('#generator-type').selectOption(type);
    await page.getByLabel(field, { exact: true }).fill(value);
    if (type === 'wifi') await page.getByLabel('Password', { exact: true }).fill('sample-password');
    await page.locator('.generator-output canvas').waitFor();
    assert.match(await page.locator('.generator-output .muted').textContent(), /Ready/);
  }
  await page.locator('#generator-type').selectOption('url');
  await page.getByLabel('Website URL', { exact: true }).fill('https://example.org/');
  await page.locator('#qr-quiet-zone').fill('10');
  assert.equal(await page.locator('.generator-output canvas').count(), 1);
  check('all seven QR formats and quiet-zone setting');

  await page.locator('a[data-tab="history"]').click();
  await page.getByLabel('Enable optional local history').check();
  await page.locator('a[data-tab="scan"]').click();
  await page.locator('input[type=file]').setInputFiles({ name: 'sample.png', mimeType: 'image/png', buffer: baseQr });
  await page.getByRole('button', { name: 'Decode image' }).click();
  await page.getByText('example.org', { exact: false }).first().waitFor();
  assert.equal(await page.getByRole('link', { name: 'Open destination ↗' }).getAttribute('href'), 'https://example.org/');
  await page.locator('#tool').screenshot({ path: join(screenshots, 'web-app-result.png') });
  check('local image upload, QR decode, destination preview and explicit open action');

  await page.locator('a[data-tab="history"]').click();
  await page.getByPlaceholder('Search saved addresses').fill('example.org');
  await page.getByText('https://example.org/', { exact: true }).waitFor();
  await page.locator('#tool').screenshot({ path: join(screenshots, 'web-app-history.png') });
  check('opt-in local scan history and search');

  await page.locator('a[data-tab="scan"]').click();
  const pastePayload = encoded(baseQr);
  await page.evaluate(async data => {
    const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    const transfer = new DataTransfer();
    transfer.items.add(new File([bytes], 'clipboard.png', { type: 'image/png' }));
    document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }));
  }, pastePayload);
  await page.getByRole('button', { name: 'Decode image' }).waitFor();
  check('clipboard paste event accepts a screenshot image');

  await page.getByLabel('Select a crop before scanning').check();
  const cropBox = await page.locator('.selection-layer').boundingBox();
  await page.mouse.move(cropBox.x + 8, cropBox.y + 8);
  await page.mouse.down();
  await page.mouse.move(cropBox.x + cropBox.width - 8, cropBox.y + cropBox.height - 8, { steps: 6 });
  await page.mouse.up();
  await page.locator('.image-preview').screenshot({ path: join(screenshots, 'web-app-crop.png') });
  await page.getByRole('button', { name: 'Decode image' }).click();
  await page.getByRole('link', { name: 'Open destination ↗' }).waitFor();
  check('optional crop selection maps accurately to source image pixels');

  await page.getByRole('button', { name: 'Scan another image' }).click();
  await page.evaluate(async data => {
    const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    const transfer = new DataTransfer();
    transfer.items.add(new File([bytes], 'dragged.png', { type: 'image/png' }));
    const zone = document.querySelector('.drop-zone');
    zone.dispatchEvent(new DragEvent('dragover', { dataTransfer: transfer, bubbles: true, cancelable: true }));
    zone.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }));
  }, pastePayload);
  await page.getByRole('button', { name: 'Decode image' }).waitFor();
  check('drag-and-drop image scanning');

  await page.locator('a[data-tab="generate"]').click();
  await page.locator('#generator-type').selectOption('url');
  await page.getByLabel('Website URL', { exact: true }).fill('http://example.org/scan');
  const httpQr = await pngFromPreview(page);
  await page.locator('a[data-tab="scan"]').click();
  await page.locator('input[type=file]').setInputFiles({ name: 'http.png', mimeType: 'image/png', buffer: httpQr });
  await page.getByRole('button', { name: 'Decode image' }).click();
  await page.getByText('HTTP traffic is unencrypted.').waitFor();
  assert.equal(await page.getByRole('link', { name: 'Open destination ↗' }).getAttribute('href'), 'http://example.org/scan');
  check('offline URL warning and explicit opening only');

  await page.locator('a[data-tab="generate"]').click();
  await page.locator('#generator-type').selectOption('text');
  await page.getByLabel('Text', { exact: true }).fill('<img src=x onerror=alert(1)>');
  const htmlQr = await pngFromPreview(page);
  await page.locator('a[data-tab="scan"]').click();
  await page.locator('input[type=file]').setInputFiles({ name: 'markup.png', mimeType: 'image/png', buffer: htmlQr });
  await page.getByRole('button', { name: 'Decode image' }).click();
  await page.getByText('<img src=x onerror=alert(1)>', { exact: true }).waitFor();
  assert.equal(await page.locator('.result-card img').count(), 0);
  assert.equal(await page.getByRole('link', { name: 'Open destination ↗' }).count(), 0);
  check('decoded HTML remains inert text; dangerous or text protocols do not get an open action');

  await page.locator('a[data-tab="generate"]').click();
  await page.locator('#generator-type').selectOption('url');
  await page.getByLabel('Website URL', { exact: true }).fill('https://second.example.net/');
  const secondQr = await page.locator('.generator-output canvas').evaluate(canvas => canvas.toDataURL('image/png').split(',')[1]);
  const combinedQr = await page.evaluate(async ([leftData, rightData]) => {
    const load = data => new Promise((resolve, reject) => {
      const image = new Image(); image.onload = () => resolve(image); image.onerror = reject;
      image.src = 'data:image/png;base64,' + data;
    });
    const [left, right] = await Promise.all([load(leftData), load(rightData)]);
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1024, 512);
    ctx.drawImage(left, 0, 16, 480, 480); ctx.drawImage(right, 528, 16, 480, 480);
    return canvas.toDataURL('image/png').split(',')[1];
  }, [pastePayload, secondQr]);
  await page.locator('a[data-tab="scan"]').click();
  await page.locator('input[type=file]').setInputFiles({ name: 'multiple.png', mimeType: 'image/png', buffer: urlFor(combinedQr) });
  await page.getByRole('button', { name: 'Decode image' }).click();
  await page.getByText(/QR codes found/).waitFor({ timeout: 15000 });
  assert.equal(await page.locator('.result-card').count(), 2);
  check('multiple QR detection on a combined image');

  await page.getByRole('button', { name: 'Scan another image' }).click();
  await page.evaluate(async data => {
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = 'data:image/png;base64,' + data; });
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    canvas.getContext('2d').drawImage(image, 0, 0);
    const stream = canvas.captureStream(2);
    Object.defineProperty(window, '__skipcamTestDisplayStream', { value: stream, configurable: true });
    Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', { value: async () => stream, configurable: true });
  }, pastePayload);
  assert.equal(await page.getByRole('button', { name: 'Scan screen' }).count(), 1);
  await page.getByRole('button', { name: 'Scan screen' }).click();
  await page.locator('video').waitFor();
  await page.waitForFunction(() => document.querySelector('video')?.videoWidth > 0);
  await page.getByRole('button', { name: 'Capture frame' }).click();
  await page.getByRole('button', { name: 'Decode image' }).waitFor();
  assert.equal(await page.evaluate(() => window.__skipcamTestDisplayStream.getTracks().every(track => track.readyState === 'ended')), true);
  await page.getByRole('button', { name: 'Decode image' }).click();
  await page.getByRole('link', { name: 'Open destination ↗' }).waitFor();
  check('screen capture preview, single-frame capture and immediate track shutdown');

  await page.getByRole('button', { name: 'Scan another image' }).click();
  await page.evaluate(() => {
    Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', { value: async () => { throw new DOMException('Canceled by test', 'NotAllowedError'); }, configurable: true });
  });
  await page.getByRole('button', { name: 'Scan screen' }).click();
  await page.getByText(/Screen sharing was canceled/).waitFor();
  check('screen-sharing denial gives a screenshot fallback message');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin + '/generate/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  const metrics = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  assert.ok(metrics.scroll <= metrics.viewport, 'mobile layout must not overflow horizontally');
  await page.locator('#tool').screenshot({ path: join(screenshots, 'web-app-mobile.png') });
  check('mobile layout at 390px without horizontal overflow');

  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    const keys = await caches.keys();
    if (!keys.some(key => key.startsWith('skipcam-web-'))) throw Error('PWA cache was not installed');
  });
  await context.setOffline(true);
  await page.goto(origin + '/generate/', { waitUntil: 'domcontentloaded' });
  await page.locator('#generator-type').waitFor();
  await page.locator('#generator-type').selectOption('text');
  await page.getByLabel('Text', { exact: true }).fill('Works offline');
  await page.locator('.generator-output canvas').waitFor();
  assert.match(await page.locator('.generator-output .muted').textContent(), /Ready/);
  await context.setOffline(false);
  check('PWA loads and generates QR codes offline after precache');

  if (errors.length) console.log('Console errors: ' + JSON.stringify(errors));
  if (failedRequests.length) console.log('Failed requests: ' + JSON.stringify(failedRequests));
  assert.deepEqual(errors, [], 'browser console and page errors');
  console.log('PASS no browser console errors');
  console.log('Verified ' + checks.length + ' browser scenarios using ' + basename(executablePath) + ' in an isolated temporary profile.');
} finally {
  if (context) await context.close();
  if (server.listening) server.close();
  await rm(profile, { recursive: true, force: true });
}
