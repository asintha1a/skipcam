import { scanImage, validateImage } from '../extension/lib/decode.js';
import { contextualValue, historyValue, inspect } from '../extension/lib/content-type.js';
import { fields, matrix, payload, renderMatrix } from '../extension/lib/generate.js';

const $ = (selector, root = document) => root.querySelector(selector);
const pane = $('#tool-pane');
const status = $('#app-status');
const historyKey = 'skipcam.web.history.v1';
const settingsKey = 'skipcam.web.settings.v1';
const defaultSettings = { remember: false, days: 30, foreground: '#111111', background: '#ffffff', size: 512, level: 'M', quietZone: 4 };
let settings = loadSettings();
let worker;
let stream;
let currentPath = routePath();
let installPrompt;
const objectUrls = new Set();

function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(settingsKey) || '{}');
    return { ...defaultSettings, ...stored, remember: stored.remember === true };
  } catch { return { ...defaultSettings }; }
}
function saveSettings() {
  try { localStorage.setItem(settingsKey, JSON.stringify(settings)); }
  catch { setStatus('Browser storage is unavailable. This preference could not be saved.'); }
}
function routePath(path = location.pathname) {
  const clean = path.replace(/\/+$/, '');
  return clean || '/';
}
function make(tag, text, attrs = {}) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = text;
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key in node) node[key] = value;
    else node.setAttribute(key, value);
  }
  return node;
}
function setStatus(message = '') { status.textContent = message; }
function actionButton(text, fn, className = 'button') {
  const button = make('button', text, { type: 'button', className });
  button.addEventListener('click', async () => {
    try { await fn(); } catch (error) { setStatus(error?.message || 'That action could not be completed.'); }
  });
  return button;
}
function makeLink(text, href, className = 'button') {
  return make('a', text, { href, className, rel: href.startsWith('http') ? 'noopener noreferrer' : '' });
}
function label(text, control) {
  const node = make('label', text);
  node.append(control);
  return node;
}
function row(...items) {
  const node = make('div', undefined, { className: 'action-row' });
  node.append(...items);
  return node;
}
function ownedUrl(blob) {
  const value = URL.createObjectURL(blob);
  objectUrls.add(value);
  return value;
}
function cleanup() {
  worker?.terminate();
  worker = undefined;
  stopCapture();
  for (const value of objectUrls) URL.revokeObjectURL(value);
  objectUrls.clear();
}
function stopCapture() {
  if (stream) for (const track of stream.getTracks()) track.stop();
  stream = undefined;
}
function updateActiveTab() {
  const active = currentPath === '/generate' ? 'generate' : currentPath === '/history' ? 'history' : 'scan';
  for (const tab of document.querySelectorAll('[data-tab]')) {
    const selected = tab.dataset.tab === active;
    tab.setAttribute('aria-selected', String(selected));
    if (selected) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  }
  document.title = ({
    '/scan': 'QR Code Scanner Online | SkipCam',
    '/generate': 'Free QR Code Generator Online | SkipCam',
    '/history': 'Private QR Scan History | SkipCam',
    '/extension': 'SkipCam Browser Extension | Skip the camera'
  })[currentPath] || 'SkipCam: Skip the camera. Scan anyway.';
}
function navigate(path) {
  if (!['/', '/scan', '/generate', '/history', '/extension'].includes(path)) return;
  if (routePath() !== path) history.pushState({}, '', path);
  currentPath = path;
  cleanup();
  setStatus('');
  updateActiveTab();
  if (path === '/generate') renderGenerator();
  else if (path === '/history') renderHistory();
  else if (path === '/extension') renderExtension();
  else renderScanner();
  $('#tool').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
}
document.addEventListener('click', event => {
  const anchor = event.target.closest('a[data-route]');
  if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigate(routePath(new URL(anchor.href).pathname));
});
window.addEventListener('popstate', () => navigate(routePath()));

async function decodeFile(file, selection) {
  validateImage(file);
  setStatus('Scanning locally…');
  return new Promise((resolve, reject) => {
    try {
      worker = new Worker('/scan-worker.js');
      const current = worker;
      current.onmessage = ({ data }) => {
        current.terminate();
        if (worker === current) worker = undefined;
        if (data.error) reject(Error(data.error));
        else resolve(data.results);
      };
      current.onerror = () => {
        current.terminate();
        if (worker === current) worker = undefined;
        scanImage(file, selection).then(resolve, reject);
      };
      current.postMessage({ file, selection });
    } catch { scanImage(file, selection).then(resolve, reject); }
  });
}
async function scan(file, selection) {
  try {
    const values = await decodeFile(file, selection);
    if (currentPath !== '/scan' && currentPath !== '/') return;
    showResults(values);
  } catch (error) {
    if (currentPath === '/scan' || currentPath === '/') setStatus(error.message || 'This image could not be scanned.');
  }
}
function safeRemember(results) {
  if (!settings.remember) return;
  const candidates = results.map(raw => {
    try {
      const parsed = inspect(raw);
      if (parsed.type !== 'URL' || parsed.warnings?.length) return null;
      const value = historyValue(parsed);
      return value ? { value, type: parsed.type, at: Date.now(), id: crypto.randomUUID() } : null;
    } catch { return null; }
  }).filter(Boolean);
  if (!candidates.length) return;
  try {
    const history = loadHistory();
    const seen = new Set(history.map(item => item.value));
    localStorage.setItem(historyKey, JSON.stringify([...candidates.filter(item => !seen.has(item.value)), ...history].slice(0, 200)));
  } catch { setStatus('Scans are ready. Browser history storage is unavailable.'); }
}
function showResults(values) {
  cleanup();
  const section = make('div', undefined, { className: 'result-list' });
  const heading = make('div', undefined, { className: 'result-heading' });
  heading.append(make('h3', values.length ? values.length + ' QR code' + (values.length === 1 ? '' : 's') + ' found' : 'No QR code found'));
  if (values.length) heading.append(make('span', 'Decoded on this device'));
  section.append(heading);
  if (!values.length) section.append(make('p', 'Try a sharper image, select a tighter crop or leave some clear space around the QR code.', { className: 'muted' }));
  for (const raw of values) {
    const data = inspect(raw);
    const card = make('article', undefined, { className: 'result-card' });
    const cardHeading = make('div', undefined, { className: 'result-card-heading' });
    cardHeading.append(make('span', data.type, { className: 'type-pill' }));
    if (data.host) cardHeading.append(make('span', data.host, { className: 'host' }));
    card.append(cardHeading);
    if (data.destination) {
      const address = make('p', data.destination, { className: 'decoded-value url-value' });
      address.title = 'Full decoded destination URL';
      card.append(address, make('p', data.destination.startsWith('https:') ? 'HTTPS · encrypted connection' : 'HTTP · unencrypted connection', { className: 'protocol' }));
    } else card.append(make('pre', raw, { className: 'decoded-value' }));
    if (data.warnings?.length) {
      const list = make('ul', undefined, { className: 'warning-list' });
      for (const warning of data.warnings) list.append(make('li', warning));
      card.append(list);
    }
    const contextual = contextualValue(data);
    const buttons = [actionButton('Copy content', () => copy(raw))];
    if (contextual) buttons.push(actionButton(contextual[0], () => copy(contextual[1])));
    if (data.href) buttons.push(makeLink('Open destination ↗', data.href, 'button primary'));
    card.append(row(...buttons));
    if (data.destination || data.type === 'Blocked link') card.append(make('p', 'Offline URL inspection is a heuristic. It is not a live reputation check or a safety guarantee.', { className: 'muted small-copy' }));
    section.append(card);
  }
  section.append(row(actionButton('Scan another image', () => renderScanner(), 'button primary'),
    actionButton('Clear result', () => { renderScanner(); setStatus(''); })));
  pane.replaceChildren(section);
  setStatus(values.length ? '' : 'No QR code was decoded.');
  safeRemember(values);
}
async function copy(value) {
  if (!navigator.clipboard?.writeText) throw Error('Clipboard writing is not supported in this browser.');
  await navigator.clipboard.writeText(value);
  setStatus('Copied.');
}
function renderScanner() {
  const wrapper = make('div', undefined, { className: 'scanner' });
  const intro = make('div', undefined, { className: 'pane-intro' });
  intro.append(make('h3', 'Scan a QR code'), make('p', 'Choose an image, paste a screenshot, or capture one frame from a screen share. Nothing is uploaded.'));
  wrapper.append(intro);
  const fileInput = make('input', undefined, { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif', className: 'visually-hidden', ariaLabel: 'Choose an image file' });
  const controls = row(actionButton('Choose image', () => fileInput.click(), 'button primary'));
  const screenSupported = isSecureContext && !!navigator.mediaDevices?.getDisplayMedia;
  if (screenSupported) controls.append(actionButton('Scan screen', startCapture, 'button'));
  wrapper.append(controls);
  if (!screenSupported) wrapper.append(make('p', 'Screen capture is unavailable here. Upload or paste a screenshot instead.', { className: 'muted hint' }));

  const drop = make('div', undefined, { className: 'drop-zone', tabIndex: 0, role: 'region', ariaLabel: 'Drop an image or paste a screenshot' });
  drop.append(make('strong', 'Drop an image or paste a screenshot'), make('span', 'PNG · JPEG · WebP · GIF · BMP · AVIF'));
  drop.addEventListener('dragover', event => { event.preventDefault(); drop.classList.add('dragging'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('dragging'));
  drop.addEventListener('drop', event => {
    event.preventDefault(); drop.classList.remove('dragging');
    const file = [...event.dataTransfer.files].find(item => item.type.startsWith('image/'));
    if (file) void loadImage(file, wrapper);
    else setStatus('No supported image found in the dropped files.');
  });
  drop.append(row(actionButton('Paste image', pasteImage, 'button')));
  fileInput.addEventListener('change', () => { if (fileInput.files?.[0]) void loadImage(fileInput.files[0], wrapper); });
  wrapper.append(fileInput, drop);
  pane.replaceChildren(wrapper);
  document.onpaste = event => {
    if (routePath() !== '/scan' && routePath() !== '/') return;
    const item = [...(event.clipboardData?.items || [])].find(entry => entry.kind === 'file' && entry.type.startsWith('image/'));
    const file = item?.getAsFile();
    if (!file) return;
    event.preventDefault();
    void loadImage(file, wrapper);
  };
}
async function pasteImage() {
  if (!navigator.clipboard?.read) throw Error('Clipboard image access is not supported. Use Ctrl+V or ⌘V in the scan area.');
  let items;
  try { items = await navigator.clipboard.read(); }
  catch { throw Error('Clipboard permission was denied. Click the scan area and paste with Ctrl+V or ⌘V.'); }
  for (const item of items) {
    const type = item.types.find(value => value.startsWith('image/'));
    if (type) return loadImage(await item.getType(type), pane);
  }
  throw Error('The clipboard does not contain an image.');
}
async function loadImage(file, parent) {
  try {
    validateImage(file);
    setStatus('');
    const url = ownedUrl(file);
    const image = make('img', undefined, { src: url, alt: 'Selected image to scan' });
    image.addEventListener('load', () => showImagePreview(file, image, parent), { once: true });
    image.addEventListener('error', () => setStatus('This image could not be opened.'), { once: true });
  } catch (error) { setStatus(error.message); }
}
function showImagePreview(file, image, parent) {
  if (!image.naturalWidth || !image.naturalHeight) return setStatus('This image has no readable pixels.');
  const preview = make('section', undefined, { className: 'image-preview' });
  const tools = row();
  const cropToggle = make('input', undefined, { type: 'checkbox' });
  const cropLabel = label('Select a crop before scanning', cropToggle);
  cropLabel.className = 'check-label';
  tools.append(cropLabel);
  let crop;
  const clear = actionButton('Clear crop', () => { crop = null; cropToggle.checked = false; paintSelection(); });
  tools.append(clear);
  const frame = make('div', undefined, { className: 'image-frame' });
  image.className = 'source-image';
  const layer = make('canvas', undefined, { className: 'selection-layer', ariaLabel: 'Image crop selection area' });
  layer.width = image.naturalWidth;
  layer.height = image.naturalHeight;
  frame.append(image, layer);
  const tip = make('p', 'To crop, enable the option, then drag across the QR code.', { className: 'muted hint' });
  const scanButton = actionButton('Decode image', async () => {
    if (cropToggle.checked && (!crop || crop.width < 3 || crop.height < 3)) throw Error('Draw a crop around the QR code, or turn crop selection off.');
    await scan(file, cropToggle.checked ? { rect: crop, view: { width: layer.getBoundingClientRect().width, height: layer.getBoundingClientRect().height } } : undefined);
  }, 'button primary');
  function paintSelection() {
    const context = layer.getContext('2d');
    context.clearRect(0, 0, layer.width, layer.height);
    if (!crop) return;
    const rect = layer.getBoundingClientRect();
    const sx = layer.width / rect.width;
    const sy = layer.height / rect.height;
    context.fillStyle = 'rgba(17,17,17,.48)';
    context.fillRect(0, 0, layer.width, layer.height);
    context.clearRect(crop.x * sx, crop.y * sy, crop.width * sx, crop.height * sy);
    context.strokeStyle = '#C5FF41';
    context.lineWidth = Math.max(2, layer.width / rect.width * 2);
    context.strokeRect(crop.x * sx, crop.y * sy, crop.width * sx, crop.height * sy);
  }
  let start;
  layer.addEventListener('pointerdown', event => {
    if (!cropToggle.checked) return;
    const rect = layer.getBoundingClientRect();
    start = { x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)), y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)) };
    crop = { x: start.x, y: start.y, width: 0, height: 0 };
    layer.setPointerCapture(event.pointerId);
    paintSelection();
  });
  layer.addEventListener('pointermove', event => {
    if (!start) return;
    const rect = layer.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
    crop = { x: Math.min(x, start.x), y: Math.min(y, start.y), width: Math.abs(x - start.x), height: Math.abs(y - start.y) };
    paintSelection();
  });
  layer.addEventListener('pointerup', () => { start = undefined; });
  cropToggle.addEventListener('change', () => { if (!cropToggle.checked) crop = null; paintSelection(); tip.hidden = !cropToggle.checked; });
  preview.append(tools, frame, tip, row(scanButton));
  parent.replaceChildren(preview);
}
async function startCapture() {
  if (!navigator.mediaDevices?.getDisplayMedia || !isSecureContext) throw Error('Screen capture is unavailable. Use an image or screenshot instead.');
  let acquired;
  try { acquired = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }); }
  catch (error) {
    if (error.name === 'NotAllowedError' || error.name === 'AbortError') throw Error('Screen sharing was canceled. You can upload or paste a screenshot instead.');
    throw Error('Screen sharing could not start in this browser.');
  }
  if (currentPath !== '/scan' && currentPath !== '/') { for (const track of acquired.getTracks()) track.stop(); return; }
  stream = acquired;
  const preview = make('section', undefined, { className: 'capture-preview' });
  preview.append(make('h3', 'Screen selected'));
  const video = make('video', undefined, { autoplay: true, muted: true, playsInline: true, ariaLabel: 'Live screen-share preview' });
  video.srcObject = stream;
  const stop = actionButton('Stop sharing', () => { stopCapture(); renderScanner(); setStatus('Screen sharing stopped.'); });
  const capture = actionButton('Capture frame', async () => {
    if (!video.videoWidth || !video.videoHeight) throw Error('The selected screen is not ready yet.');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d', { willReadFrequently: true }).drawImage(video, 0, 0, canvas.width, canvas.height);
    stopCapture();
    const file = await new Promise(resolve => canvas.toBlob(blob => resolve(blob && new File([blob], 'skipcam-screen-frame.png', { type: 'image/png' })), 'image/png'));
    if (!file) throw Error('The captured frame could not be prepared.');
    await loadImage(file, pane);
  }, 'button primary');
  stream.getVideoTracks()[0]?.addEventListener('ended', () => {
    if (stream) { stopCapture(); if (currentPath === '/scan' || currentPath === '/') { renderScanner(); setStatus('Screen sharing ended.'); } }
  }, { once: true });
  preview.append(video, make('p', 'Live preview stays in this tab. Capture one still frame to stop sharing and scan it.', { className: 'muted' }), row(capture, stop));
  pane.replaceChildren(preview);
  try { await video.play(); } catch { /* browser can wait for its first frame */ }
  setStatus('Choose a tab, window or screen in your browser prompt.');
}

function select(items, value, attrs = {}) {
  const node = make('select', undefined, attrs);
  for (const [key, text] of items) node.add(new Option(text, key));
  node.value = String(value);
  return node;
}
function colorContrast(foreground, background) {
  const luminance = hex => {
    const rgb = hex.match(/[\da-f]{2}/gi).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
  };
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
function renderGenerator() {
  const form = make('form', undefined, { className: 'generator' });
  const contentType = select([['url', 'Website URL'], ['text', 'Plain text'], ['wifi', 'Wi-Fi'], ['email', 'Email'], ['phone', 'Telephone'], ['sms', 'SMS'], ['contact', 'Contact card']], 'url', { id: 'generator-type' });
  const fieldsGroup = make('div', undefined, { className: 'generator-fields' });
  const options = make('div', undefined, { className: 'generator-options' });
  const foreground = make('input', undefined, { type: 'color', value: settings.foreground, id: 'qr-foreground' });
  const background = make('input', undefined, { type: 'color', value: settings.background, id: 'qr-background' });
  const size = select([[256, '256 px'], [512, '512 px'], [1024, '1024 px']], settings.size, { id: 'qr-size' });
  const level = select([['L', 'Low · L'], ['M', 'Medium · M'], ['Q', 'Quartile · Q'], ['H', 'High · H']], settings.level, { id: 'qr-level' });
  const quiet = make('input', undefined, { type: 'number', min: 0, max: 16, step: 1, value: settings.quietZone, id: 'qr-quiet-zone' });
  options.append(label('Foreground', foreground), label('Background', background), label('Export size', size), label('Error correction', level), label('Quiet zone · modules', quiet));
  const left = make('div', undefined, { className: 'generator-form-side' });
  const preview = make('div', undefined, { className: 'generator-output' });
  const formStatus = make('p', 'Preview updates as you type.', { className: 'muted', role: 'status', ariaLive: 'polite' });
  form.append(label('Content type', contentType), fieldsGroup, options, row(actionButton('Reset options', () => {
    Object.assign(settings, defaultSettings); saveSettings();
    foreground.value = settings.foreground; background.value = settings.background; size.value = String(settings.size); level.value = settings.level; quiet.value = String(settings.quietZone); updatePreview();
  }, 'button')));
  left.append(form);
  const previewTitle = make('div', undefined, { className: 'preview-title' });
  previewTitle.append(make('h3', 'Live preview'), make('span', 'Generated locally'));
  preview.append(previewTitle, formStatus);
  const output = make('div', undefined, { className: 'qr-output' });
  preview.append(output);
  const layout = make('div', undefined, { className: 'generator-layout' });
  layout.append(left, preview);
  pane.replaceChildren(layout);
  function drawFields() {
    fieldsGroup.replaceChildren(...fields[contentType.value].map(([name, title, kind]) => {
      const input = Array.isArray(kind) ? select(kind.map(value => [value, value === 'nopass' ? 'No password' : value]), kind[0]) : kind === 'textarea' ? make('textarea') : make('input', undefined, { type: kind });
      input.name = name;
      input.maxLength = 3000;
      input.autocomplete = 'off';
      return label(title, input);
    }));
    updatePreview();
  }
  function updatePreview() {
    output.replaceChildren();
    try {
      const values = Object.fromEntries(new FormData(form));
      const code = matrix(payload(contentType.value, values), level.value);
      const zoneValue = Number(quiet.value);
      const config = { foreground: foreground.value, background: background.value, size: Number(size.value), quietZone: zoneValue };
      if (!Number.isInteger(zoneValue) || zoneValue < 0 || zoneValue > 16) throw Error('Quiet zone must be between 0 and 16 modules.');
      if (colorContrast(config.foreground, config.background) < 4.5) throw Error('Choose foreground and background colors with at least 4.5:1 contrast for reliable scanning.');
      const result = renderMatrix(code, config);
      result.canvas.className = 'generated-qr';
      result.canvas.setAttribute('role', 'img');
      result.canvas.setAttribute('aria-label', 'QR code preview');
      result.canvas.style.width = 'min(100%, 340px)';
      output.append(result.canvas);
      const buttons = [actionButton('Download PNG', async () => download(await canvasBlob(result.canvas), 'png'), 'button primary'),
        actionButton('Download SVG', () => download(new Blob([result.svg], { type: 'image/svg+xml' }), 'svg'), 'button')];
      if (globalThis.ClipboardItem && navigator.clipboard?.write) buttons.push(actionButton('Copy PNG', async () => {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': await canvasBlob(result.canvas) })]);
        setStatus('QR image copied.');
      }));
      output.append(row(...buttons));
      formStatus.textContent = 'Ready. Scan the preview before sharing, especially after choosing custom colors.';
      settings.foreground = foreground.value; settings.background = background.value; settings.size = Number(size.value); settings.level = level.value; settings.quietZone = zoneValue; saveSettings();
    } catch (error) { formStatus.textContent = error.message; }
  }
  contentType.addEventListener('change', drawFields);
  form.addEventListener('input', updatePreview);
  form.addEventListener('submit', event => event.preventDefault());
  function download(blob, extension) {
    const url = ownedUrl(blob);
    const anchor = make('a', undefined, { href: url, download: 'skipcam-qr.' + extension });
    anchor.click();
    setTimeout(() => { URL.revokeObjectURL(url); objectUrls.delete(url); }, 1500);
  }
  drawFields();
}
function canvasBlob(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(Error('Image export failed.')), 'image/png'));
}
function loadHistory() {
  try {
    const items = JSON.parse(localStorage.getItem(historyKey) || '[]');
    if (!Array.isArray(items)) return [];
    const cutoff = Date.now() - Number(settings.days || 30) * 86400000;
    return items.filter(item => item && item.at > cutoff && typeof item.value === 'string' && historyValue(inspect(item.value)) === item.value);
  } catch { return []; }
}
function renderHistory() {
  const section = make('div', undefined, { className: 'history-view' });
  const intro = make('div', undefined, { className: 'pane-intro' });
  intro.append(make('h3', 'Your scans stay yours'), make('p', 'History is local to this browser and off by default. Sensitive payloads and URLs with paths or query strings are never saved automatically.'));
  const enabled = make('input', undefined, { type: 'checkbox', checked: settings.remember });
  const enableLabel = label('Enable optional local history', enabled);
  enableLabel.className = 'check-label history-toggle';
  const toolbar = make('div', undefined, { className: 'history-toolbar' });
  const search = make('input', undefined, { type: 'search', placeholder: 'Search saved addresses', ariaLabel: 'Search saved history' });
  const filter = select([['all', 'All content'], ['URL', 'Website URLs']], 'all');
  toolbar.append(search, filter);
  const list = make('div', undefined, { className: 'history-list' });
  const retention = select([[7, '7 days'], [30, '30 days'], [90, '90 days']], settings.days, { ariaLabel: 'History retention period' });
  const retentionLabel = label('Keep eligible entries for', retention);
  const clear = actionButton('Clear all history', () => {
    if (confirm('Clear locally saved SkipCam history from this browser?')) {
      localStorage.removeItem(historyKey); draw();
    }
  }, 'button danger');
  section.append(intro, enableLabel, row(retentionLabel, clear), toolbar, list);
  pane.replaceChildren(section);
  enabled.addEventListener('change', () => {
    settings.remember = enabled.checked;
    if (!enabled.checked) localStorage.removeItem(historyKey);
    saveSettings(); draw();
  });
  retention.addEventListener('change', () => { settings.days = Number(retention.value); saveSettings(); draw(); });
  function draw() {
    const items = settings.remember ? loadHistory() : [];
    const filtered = items.filter(item => (filter.value === 'all' || item.type === filter.value) && item.value.toLowerCase().includes(search.value.toLowerCase()));
    list.replaceChildren();
    if (!settings.remember) list.append(make('p', 'History is off. Turn it on above to save eligible public HTTPS homepages.'));
    else if (!filtered.length) list.append(make('p', items.length ? 'No saved scans match this search.' : 'No eligible scans saved yet.'));
    for (const item of filtered) {
      const card = make('article', undefined, { className: 'history-item' });
      const details = make('div', undefined);
      details.append(make('span', item.type, { className: 'type-pill' }), make('a', item.value, { href: item.value, target: '_blank', rel: 'noopener noreferrer' }), make('time', new Date(item.at).toLocaleString(), { dateTime: new Date(item.at).toISOString() }));
      card.append(details, row(actionButton('Copy', () => copy(item.value)), actionButton('Delete', () => {
        localStorage.setItem(historyKey, JSON.stringify(loadHistory().filter(value => value.id !== item.id))); draw();
      }, 'button danger')));
      list.append(card);
    }
  }
  search.addEventListener('input', draw);
  filter.addEventListener('change', draw);
  draw();
}
function renderExtension() {
  const panel = make('div', undefined, { className: 'extension-panel' });
  panel.append(make('p', 'SKIPCAM / BROWSER EXTENSION', { className: 'overline' }), make('h3', 'Scan right where you are.'), make('p', 'The web app scans local images and a browser-approved captured frame. The extension adds direct webpage region scanning, image context-menu actions and a keyboard shortcut.'), make('p', 'Both ways to use SkipCam are free and open source. This evaluation build remains beta while full interactive browser QA is pending.'));
  panel.append(row(makeLink('Chromium beta ZIP ↓', 'https://github.com/asintha1a/skipcam/releases/download/v1.0.0-beta.2/skipcam-chromium-v1.0.0-beta.2.zip', 'button primary'), makeLink('Firefox beta ZIP ↓', 'https://github.com/asintha1a/skipcam/releases/download/v1.0.0-beta.2/skipcam-firefox-v1.0.0-beta.2.zip'), makeLink('View source ↗', 'https://github.com/asintha1a/skipcam')));
  panel.append(make('p', 'Chromium: load unpacked with Developer mode. Firefox: load temporarily in about:debugging; permanent installation requires Mozilla signing.', { className: 'muted' }));
  pane.replaceChildren(panel);
}

$('#install-app').addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = undefined;
  $('#install-app').hidden = true;
});
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  $('#install-app').hidden = false;
});
window.addEventListener('appinstalled', () => { $('#install-app').hidden = true; setStatus('SkipCam was installed.'); });
if ('serviceWorker' in navigator && isSecureContext) {
  navigator.serviceWorker.register('/service-worker.js').then(registration => {
    $('#offline-status').textContent = 'Offline app available after this visit';
    registration.update().catch(() => {});
  }).catch(() => { $('#offline-status').textContent = 'Local processing · offline install unavailable'; });
}

updateActiveTab();
if (currentPath === '/generate') renderGenerator();
else if (currentPath === '/history') renderHistory();
else if (currentPath === '/extension') renderExtension();
else renderScanner();
