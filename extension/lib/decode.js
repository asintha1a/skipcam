import jsQR from './jsQR.cjs';

const MAX_PIXELS = 32_000_000;
const MAX_FILE = 20 * 1024 * 1024;
const formats = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp', 'image/avif']);

export function pixelCrop(rect, view, width, height) {
  const clamp = (coordinate, max) => Math.max(0, Math.min(max, coordinate));
  const left = clamp(Math.round(rect.x * width / view.width), width);
  const top = clamp(Math.round(rect.y * height / view.height), height);
  return [left, top, clamp(Math.round((rect.x + rect.width) * width / view.width), width) - left,
    clamp(Math.round((rect.y + rect.height) * height / view.height), height) - top];
}

export function validateImage(file) {
  if (!file || !formats.has(file.type)) throw Error('Choose a PNG, JPEG, WebP, GIF, BMP or AVIF image.');
  if (!file.size || file.size > MAX_FILE) throw Error('Choose a nonempty image under 20 MB.');
}

export function decodePixels({ data, width, height }) {
  return jsQR(data, width, height, { inversionAttempts: 'attemptBoth' })?.data ?? null;
}

function canvasCrop(bitmap, crop, maxSide, pad = false) {
  const [x, y, width, height] = crop;
  const scale = Math.min(width < 160 && height < 160 ? 2 : 1, maxSide / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const margin = pad ? Math.ceil(Math.min(w, h) / 10) : 0;
  const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w + 2 * margin, h + 2 * margin) : Object.assign(document.createElement('canvas'), { width: w + 2 * margin, height: h + 2 * margin });
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = scale < 1;
  ctx.drawImage(bitmap, x, y, width, height, margin, margin, w, h);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export async function scanImage(file, selection) {
  validateImage(file);
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw Error('This image could not be decoded.'); }
  try {
    if (bitmap.width * bitmap.height > MAX_PIXELS) throw Error('Use an image under 32 megapixels.');
    const crop = selection ? pixelCrop(selection.rect, selection.view, bitmap.width, bitmap.height) : [0, 0, bitmap.width, bitmap.height];
    if (crop[2] < 1 || crop[3] < 1) throw Error('Select a larger region.');
    const found = new Set();
    const [x, y, width, height] = crop;
    const full = decodePixels(canvasCrop(bitmap, crop, 1400, true));
    if (full !== null) found.add(full);
    // Overlapping windows can recover separate symbols the single-result decoder misses.
    if (width >= 160 && height >= 160) {
      let windows;
      if (width / height >= 1.4) {
        const w = Math.min(width, Math.ceil(height * 1.2));
        const step = Math.max(1, Math.floor(w * 0.5));
        const offsets = [];
        for (let left = 0; left + w < width && offsets.length < 8; left += step) offsets.push(left);
        offsets.push(width - w);
        windows = [...new Set(offsets)].map(left => [left, 0, w, height]);
      } else if (height / width >= 1.4) {
        const h = Math.min(height, Math.ceil(width * 1.2));
        const step = Math.max(1, Math.floor(h * 0.5));
        const offsets = [];
        for (let top = 0; top + h < height && offsets.length < 8; top += step) offsets.push(top);
        offsets.push(height - h);
        windows = [...new Set(offsets)].map(top => [0, top, width, h]);
      } else {
        const w = Math.ceil(width * 0.62);
        const h = Math.ceil(height * 0.62);
        windows = [[0, 0, w, h], [width - w, 0, w, h], [0, height - h, w, h], [width - w, height - h, w, h],
          [Math.floor((width - w) / 2), Math.floor((height - h) / 2), w, h]];
      }
      for (const [left, top, cropWidth, cropHeight] of windows) {
        const value = decodePixels(canvasCrop(bitmap, [x + left, y + top, cropWidth, cropHeight], 1000, true));
        if (value !== null) found.add(value);
      }
    }
    return [...found];
  } finally { bitmap.close(); }
}
