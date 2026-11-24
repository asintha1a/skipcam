import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

const ink = '#101312';
const lime = '#b9ff66';
const light = '#f5f7f2';
const glyph = '<path d="M7 12V7h5m12 0h5v5M7 24v5h5m12 0h5v-5" fill="none" stroke="' + lime + '" stroke-width="2.3" stroke-linecap="square"/><path d="M12 11h4v4h-4zm8 0h4v4h-4zm-8 10h4v4h-4zm8 0h4v4h-4zm4 4h2v2h-2z" fill="' + lime + '"/><path d="M5 18h26" stroke="' + lime + '" stroke-width="1.8"/>';
const tile = '<rect width="36" height="36" rx="8" fill="' + ink + '"/>' + glyph;
const vector = (width, height, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
const text = (x, y, size, value, fill = light, weight = 650, font = 'Arial, sans-serif') =>
  `<text x="${x}" y="${y}" fill="${fill}" font-family="${font}" font-size="${size}" font-weight="${weight}" letter-spacing="${size > 40 ? -0.055 * size : 0}">${value}</text>`;
const mark = (x, y, scale) => `<g transform="translate(${x},${y}) scale(${scale})">${tile}</g>`;
const lockup = vector(520, 160, mark(10, 19, 3.3) + text(146, 89, 79, 'snipray.', ink) + text(151, 124, 21, 'by Self Graphic Lab', ink, 400));
const brand = 'assets/brand/';
await writeFile(brand + 'symbol.svg', vector(36, 36, tile));
await writeFile(brand + 'wordmark.svg', vector(326, 110, text(0, 82, 94, 'snipray.', ink)));
await writeFile(brand + 'lockup.svg', lockup);
const browser = await chromium.launch({ channel: process.env.SNIPRAY_CHROME_CHANNEL || 'chrome', headless: true });
const page = await browser.newPage({ deviceScaleFactor: 1 });
async function raster(svg, path, width, height) {
  await page.setViewportSize({ width, height });
  await page.setContent('<style>body{margin:0}svg{display:block}</style>' + svg);
  await page.screenshot({ path, omitBackground: true });
}
for (const size of [16, 32, 48, 128, 512, 1024]) {
  const svg = vector(size, size, mark(0, 0, size / 36));
  await raster(svg, size <= 128 ? 'extension/icons/icon' + size + '.png' : brand + 'icon' + size + '.png', size, size);
}
await raster(lockup.replace('width="520" height="160"', 'width="1040" height="320"'), brand + 'logo-transparent.png', 1040, 320);

function cover(width, height) {
  const scale = width / 1280;
  const y = height / scale;
  const grid = `<defs><pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0v48" fill="none" stroke="#303831"/></pattern></defs><rect width="1280" height="${y}" fill="${ink}"/><rect x="730" width="550" height="${y}" fill="url(#grid)"/><path d="M80 72h1120M80 ${y - 72}h1120" stroke="#39413a"/>`;
  return vector(width, height, `<g transform="scale(${scale})">${grid}${text(80, 113, 17, 'SELF GRAPHIC LAB', lime, 600, 'monospace')}
    ${text(74, y / 2 + 15, 143, 'snipray.')}${text(84, y / 2 + 82, 35, 'See it. Snip it. Scan it.', light, 400)}
    ${text(82, y - 99, 15, 'SCAN / GENERATE / INSPECT', lime, 600, 'monospace')}
    ${mark(805, y / 2 - 134, 8)}<path d="M771 ${y / 2 + 10}h356" stroke="${lime}" stroke-width="2"/></g>`);
}
for (const [file, w, h] of [['social-preview.png', 1280, 640], ['cover.png', 1600, 900]]) await raster(cover(w, h), brand + file, w, h);
const swatches = [[lime, '#B9FF66'], [ink, '#101312'], ['#262c28', '#262C28'], [light, '#F5F7F2']].map(([color, name], index) => {
  const x = 75 + index * 270;
  return `<rect x="${x}" y="540" width="240" height="130" rx="6" fill="${color}" stroke="#9aa299"/>` + text(x, 703, 20, name, ink, 600, 'monospace');
}).join('');
await raster(vector(1200, 780, '<rect width="1200" height="780" fill="' + light + '"/>' +
  text(74, 99, 24, 'SELF GRAPHIC LAB / SNIPRAY', ink, 600, 'monospace') + '<path d="M75 122h1050M75 480h1050" stroke="#a6aea2"/>' +
  mark(75, 182, 6.6) + text(373, 325, 140, 'snipray.', ink) + text(382, 383, 30, 'by Self Graphic Lab', ink, 400) + swatches),
  brand + 'identity-sheet.png', 1200, 780);
await browser.close();
