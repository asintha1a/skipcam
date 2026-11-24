import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const ink = '#111111';
const surface = '#202020';
const lime = '#C5FF41';
const white = '#FFFFFF';
const grey = '#AAAAAA';
const brand = 'assets/brand/';
await mkdir(brand + 'variants', { recursive: true });

const svg = (width, height, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
const glyph = (color = lime, cutout = ink) => `<path d="M8 15V8h7M21 8h7v7M8 21v7h7M21 28h7v-7" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 14h10v8H13z" fill="none" stroke="${color}" stroke-width="2.4" stroke-linejoin="round"/><circle cx="18" cy="18" r="2.1" fill="${color}"/><path d="M6 30 30 6" stroke="${cutout}" stroke-width="7" stroke-linecap="round"/><path d="M6 30 30 6" stroke="${color}" stroke-width="3.4" stroke-linecap="round"/>`;
const mark = (x, y, size, color = lime, cutout = ink) => `<g transform="translate(${x} ${y}) scale(${size / 36})">${glyph(color, cutout)}</g>`;
const wordmark = (width, height, foreground = white, accent = lime) => svg(width, height, `<text x="0" y="${height * .78}" fill="${foreground}" font-family="Arial, Helvetica, sans-serif" font-size="${height * .76}" font-weight="800" letter-spacing="${-height * .035}">skip</text><text x="${height * 1.55}" y="${height * .78}" fill="${accent}" font-family="Arial, Helvetica, sans-serif" font-size="${height * .76}" font-weight="800" letter-spacing="${-height * .035}">cam.</text>`);
const lockup = (background = 'none', foreground = white, accent = lime, endorsement = true) => svg(720, 220, `${background === 'none' ? '' : `<rect width="720" height="220" fill="${background}"/>`}${mark(18, 25, 168, accent, background === 'none' ? 'none' : background)}<text x="210" y="119" fill="${foreground}" font-family="Arial, Helvetica, sans-serif" font-size="102" font-weight="800" letter-spacing="-5.6">skip</text><text x="420" y="119" fill="${accent}" font-family="Arial, Helvetica, sans-serif" font-size="102" font-weight="800" letter-spacing="-5.6">cam.</text>${endorsement ? `<text x="218" y="164" fill="${grey}" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="600" letter-spacing="7">BY SELF GRAPHIC LAB</text>` : ''}`);

await writeFile(brand + 'symbol.svg', svg(36, 36, glyph(lime, 'none')));
await writeFile(brand + 'wordmark.svg', wordmark(390, 110));
await writeFile(brand + 'lockup.svg', lockup());
await writeFile(brand + 'lockup-endorsed.svg', lockup('none', white, lime, true));
await writeFile(brand + 'favicon.svg', svg(48, 48, `<rect width="48" height="48" rx="3" fill="${ink}"/>${mark(6, 6, 36, lime, ink)}`));
await writeFile(brand + 'variants/symbol-black.svg', svg(36, 36, glyph(ink, 'none')));
await writeFile(brand + 'variants/symbol-white.svg', svg(36, 36, glyph(white, 'none')));
await writeFile(brand + 'variants/wordmark-black.svg', wordmark(390, 110, ink, ink));
await writeFile(brand + 'variants/wordmark-white.svg', wordmark(390, 110, white, white));
await writeFile(brand + 'variants/lockup-black.svg', lockup('none', ink, ink, true));
await writeFile(brand + 'variants/lockup-white.svg', lockup('none', white, white, true));

const browser = await chromium.launch({ channel: process.env.SKIPCAM_CHROME_CHANNEL || 'chrome', headless: true });
const page = await browser.newPage({ deviceScaleFactor: 1 });
async function raster(source, path, width, height) {
  await page.setViewportSize({ width, height });
  await page.setContent('<style>body{margin:0}svg{display:block}</style>' + source);
  await page.screenshot({ path, omitBackground: true });
}
for (const size of [16, 32, 48, 128, 512, 1024]) {
  const icon = svg(size, size, `<rect width="${size}" height="${size}" rx="${Math.round(size * .18)}" fill="${ink}"/>${mark(0, 0, size, lime, ink)}`);
  await raster(icon, size <= 128 ? `extension/icons/icon${size}.png` : `${brand}icon${size}.png`, size, size);
}
await raster(lockup('none'), brand + 'logo-transparent.png', 720, 220);
await raster(lockup('none', ink, ink).replace('stroke="white"', 'stroke="none"'), brand + 'variants/lockup-black.png', 720, 220);
await raster(lockup('none', white, white).replace('stroke="white"', 'stroke="none"'), brand + 'variants/lockup-white.png', 720, 220);
await raster(svg(512, 512, `<g transform="translate(94 94) scale(9)">${glyph(lime, 'none')}</g>`), brand + 'symbol-transparent.png', 512, 512);
await raster(svg(512, 512, `<g transform="translate(94 94) scale(9)">${glyph(ink, 'none')}</g>`), brand + 'variants/symbol-black.png', 512, 512);
await raster(svg(512, 512, `<g transform="translate(94 94) scale(9)">${glyph(white, 'none')}</g>`), brand + 'variants/symbol-white.png', 512, 512);
await raster(wordmark(960, 240, ink, ink), brand + 'variants/wordmark-black.png', 960, 240);
await raster(wordmark(960, 240, white, white), brand + 'variants/wordmark-white.png', 960, 240);
await raster(svg(48, 48, `<rect width="48" height="48" rx="3" fill="${ink}"/>${mark(6, 6, 36, lime, ink)}`), brand + 'favicon.png', 48, 48);

function cover(width, height) {
  const scale = width / 1280;
  const unitHeight = height / scale;
  const art = `<rect width="1280" height="${unitHeight}" fill="${ink}"/><path d="M84 84h1112M84 ${unitHeight - 84}h1112" stroke="#393939"/><path d="M820 0h460v${unitHeight}H820z" fill="${surface}"/><path d="M860 0v${unitHeight}M940 0v${unitHeight}M1020 0v${unitHeight}M1100 0v${unitHeight}M1180 0v${unitHeight}" stroke="#292929"/>`;
  return svg(width, height, `<g transform="scale(${scale})">${art}<text x="86" y="132" fill="${lime}" font-family="monospace" font-size="19" font-weight="700" letter-spacing="3">SELF GRAPHIC LAB / BROWSER TOOL</text>${mark(92, unitHeight / 2 - 94, 188)}<text x="315" y="${unitHeight / 2 + 22}" fill="${white}" font-family="Arial, Helvetica, sans-serif" font-size="133" font-weight="800" letter-spacing="-7">skip</text><text x="584" y="${unitHeight / 2 + 22}" fill="${lime}" font-family="Arial, Helvetica, sans-serif" font-size="133" font-weight="800" letter-spacing="-7">cam.</text><text x="323" y="${unitHeight / 2 + 91}" fill="${white}" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="650">Skip the camera. Scan anyway.</text><text x="86" y="${unitHeight - 112}" fill="${grey}" font-family="Arial, Helvetica, sans-serif" font-size="21">Your phone can sit this one out.</text><text x="86" y="${unitHeight - 78}" fill="${lime}" font-family="monospace" font-size="16" letter-spacing="2">SCAN / GENERATE / INSPECT</text></g>`);
}
await raster(cover(1280, 640), brand + 'social-preview.png', 1280, 640);
await raster(cover(1600, 900), brand + 'cover.png', 1600, 900);

const palette = [[lime, '#C5FF41'], [ink, '#111111'], [surface, '#202020'], [white, '#FFFFFF'], [grey, '#AAAAAA']].map(([color, label], i) => {
  const x = 60 + i * 218;
  return `<rect x="${x}" y="588" width="190" height="96" fill="${color}" stroke="#999"/><text x="${x}" y="714" fill="${ink}" font-family="monospace" font-size="17">${label}</text>`;
}).join('');
const sheet = svg(1200, 780, `<rect width="1200" height="780" fill="#F5F5F5"/><text x="60" y="74" fill="${ink}" font-family="monospace" font-size="18" letter-spacing="2">SELF GRAPHIC LAB / BRAND IDENTITY</text><path d="M60 98h1080" stroke="#bbb"/>${lockup('#F5F5F5', ink, lime, true).replace('<svg xmlns="http://www.w3.org/2000/svg" width="720" height="220" viewBox="0 0 720 220">','<g transform="translate(160 150) scale(1.18)">').replace('</svg>','</g>')}<text x="60" y="536" fill="${ink}" font-family="monospace" font-size="16" letter-spacing="2">PALETTE</text>${palette}<text x="60" y="756" fill="${grey}" font-family="Arial, sans-serif" font-size="18">Skip the camera. Scan anyway. · by Self Graphic Lab</text>`);
await raster(sheet, brand + 'identity-sheet.png', 1200, 780);
await browser.close();
