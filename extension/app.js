import { contextualValue, inspect } from './lib/content-type.js';
import { defaults } from './lib/history.js';
import { fields, matrix, payload, renderMatrix } from './lib/generate.js';
import { validateImage } from './lib/decode.js';

const api = globalThis.browser ?? globalThis.chrome;
const mount = document.querySelector('#content');
const status = document.querySelector('#status');
const homeButton = document.querySelector('#home');
let settings = defaults;
let view = 0;
let activeScan;
const popup = location.hash === '#popup';
document.body.classList.toggle('popup', popup);

function element(tag, value, props = {}) {
  const node = document.createElement(tag);
  if (value != null) node.textContent = value;
  return Object.assign(node, props);
}
function button(label, action, className = '') {
  const node = element('button', label, { type: 'button', className });
  node.addEventListener('click', async () => {
    const currentView = view;
    try { await action(); } catch (error) { if (currentView === view) status.textContent = error.message; }
  });
  return node;
}
function link(label, href, className = '') {
  return element('a', label, { href, target: '_blank', rel: 'noopener noreferrer', className });
}
function actions(...nodes) {
  const row = element('div', null, { className: 'actions' });
  row.append(...nodes);
  return row;
}
function page(title, ...nodes) {
  view++;
  activeScan?.terminate();
  activeScan = undefined;
  status.textContent = '';
  homeButton.hidden = !title;
  mount.replaceChildren(...(title ? [element('h1', title)] : []), ...nodes);
}
async function send(type, data = {}) {
  const response = await api.runtime.sendMessage({ type, ...data });
  if (!response || response.error) throw Error(response?.error ?? 'SkipCam could not complete the request.');
  return response;
}
async function copy(text) {
  await navigator.clipboard.writeText(text);
  status.textContent = 'Copied to clipboard.';
}
function go(route) {
  return popup ? api.tabs.create({ url: api.runtime.getURL('app.html#' + route) }) : navigate(route);
}
function navigate(route) {
  if (location.hash === '#' + route) routeTo(route);
  else location.hash = route;
}
function home() {
  const grid = element('div', null, { className: 'grid' });
  grid.append(button('Upload image', () => go('upload')), button('Paste image', () => go('paste')),
    button('Generate QR code', () => go('generate')), button('Scan history', () => go('history')),
    button('Settings', () => go('settings')));
  page('', button('Scan screen     ↗', start, 'primary scan'), grid);
}
async function start() {
  if (!popup) {
    status.textContent = 'Go to the page you want to scan and open SkipCam from the toolbar, or use the scan shortcut.';
    return;
  }
  await send('start');
  window.close();
}
homeButton.onclick = () => navigate('');
function applyTheme() {
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.dataset.motion = settings.motion;
}

function upload(clipboard = false) {
  const pick = element('input', null, { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif' });
  const zone = element('section', null, { className: 'drop', tabIndex: 0, ariaLabel: 'Image drop and paste area' });
  zone.append(element('p', 'Drop an image here, choose a file, or paste an image from your clipboard.'), label('Image file', pick));
  async function run(file) {
    try { await scan(file); } catch (error) { status.textContent = error.message; }
  }
  function pasted(event) {
    const file = [...(event.clipboardData?.items ?? [])].find(item => item.kind === 'file' && item.type.startsWith('image/'))?.getAsFile();
    if (file) { event.preventDefault(); void run(file); }
  }
  pick.onchange = () => { if (pick.files.length) void run(pick.files[0]); };
  zone.onpaste = pasted;
  zone.ondragover = event => { event.preventDefault(); zone.classList.add('over'); };
  zone.ondragleave = () => zone.classList.remove('over');
  zone.ondrop = event => { event.preventDefault(); zone.classList.remove('over'); void run(event.dataTransfer.files[0]); };
  const paste = button('Read clipboard image', async () => {
    let items;
    try { items = await navigator.clipboard.read(); }
    catch { status.textContent = 'Focus the drop area and paste with Ctrl+V or ⌘V.'; zone.focus(); return; }
    for (const item of items) {
      const type = item.types.find(value => value.startsWith('image/'));
      if (type) { await run(await item.getType(type)); return; }
    }
    throw Error('The clipboard does not contain an image.');
  });
  page(clipboard ? 'Paste image' : 'Scan an image', zone, paste);
  if (clipboard) zone.focus();
}

async function scan(file, selection) {
  validateImage(file);
  const current = view;
  activeScan?.terminate();
  const worker = new Worker('scan-worker.js');
  activeScan = worker;
  status.textContent = 'Scanning image…';
  worker.onmessage = async ({ data }) => {
    worker.terminate();
    if (current !== view || activeScan !== worker) return;
    activeScan = undefined;
    if (data.error) { status.textContent = data.error; return; }
    showResults(data.results);
    const resultView = view;
    if (data.results.length) {
      try { await send('store', { results: data.results }); }
      catch { if (view === resultView) status.textContent = 'Results are available. Local history could not be updated.'; }
    }
  };
  worker.onerror = () => { worker.terminate(); if (activeScan === worker) status.textContent = 'The image scanner could not start.'; };
  worker.postMessage({ file, selection });
}
function showResults(results) {
  const nodes = [];
  if (!results.length) nodes.push(element('p', 'Try a sharper image or leave some space around the QR code.'));
  for (const value of results) {
    const result = inspect(value);
    const card = element('article', null, { className: 'card' });
    card.append(element('h2', result.type));
    if (result.destination) {
      card.append(element('p', 'Destination host · ' + result.host, { className: 'subtle' }),
        element('pre', result.destination, { ariaLabel: 'Full destination' }));
    }
    if (result.destination !== value) card.append(element('pre', value, { ariaLabel: 'Decoded content' }));
    if (result.warnings?.length) {
      const list = element('ul', null, { className: 'warnings' });
      for (const warning of result.warnings) list.append(element('li', warning));
      card.append(list);
    }
    const copyAction = contextualValue(result);
    card.append(actions(button('Copy content', () => copy(value)),
      ...(copyAction ? [button(copyAction[0], () => copy(copyAction[1]))] : []),
      ...(result.href ? [link('Open link ↗', result.href, 'button')] : [])));
    if (result.destination || result.warnings) card.append(element('p', 'Offline URL heuristics only. Check the destination before opening.', { className: 'subtle' }));
    nodes.push(card);
  }
  page(results.length ? (results.length === 1 ? 'QR code detected' : results.length + ' QR codes detected') : 'No QR code found',
    ...nodes, actions(button('Scan another image', () => navigate('upload'), 'primary'),
      button('Scan another region', async () => {
        const [tab] = await api.tabs.query({ active: true, currentWindow: true });
        if (location.hash.startsWith('#scan/') && tab?.id) await api.tabs.remove(tab.id);
        else await start();
      })));
}

function label(text, control) {
  const wrapper = element('label', text);
  wrapper.append(control);
  return wrapper;
}
function select(values, current) {
  const node = element('select');
  for (const value of values) {
    const [id, title] = Array.isArray(value) ? value : [value, value];
    node.add(new Option(title, id));
  }
  node.value = String(current);
  return node;
}
function choices(initial) {
  const inputs = {
    foreground: element('input', null, { type: 'color', value: initial.foreground }),
    background: element('input', null, { type: 'color', value: initial.background }),
    size: select([256, 512, 1024].map(size => [size, size + ' px']), initial.size),
    level: select([['L', 'Low (L)'], ['M', 'Medium (M)'], ['Q', 'Quartile (Q)'], ['H', 'High (H)']], initial.level)
  };
  const row = element('div', null, { className: 'form-grid' });
  row.append(label('Foreground', inputs.foreground), label('Background', inputs.background), label('Export size', inputs.size), label('Error correction', inputs.level));
  return { row, values: () => ({ foreground: inputs.foreground.value, background: inputs.background.value, size: Number(inputs.size.value), level: inputs.level.value }) };
}
function download(blob, extension) {
  const url = URL.createObjectURL(blob);
  element('a', null, { href: url, download: 'skipcam-qr.' + extension }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function png(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(Error('PNG export failed.'))));
}
function generator() {
  const type = select([['url', 'Website URL'], ['text', 'Plain text'], ['email', 'Email'], ['phone', 'Telephone'],
    ['sms', 'SMS'], ['wifi', 'Wi-Fi'], ['contact', 'Contact']], 'url');
  const form = element('form');
  const group = element('fieldset');
  const output = element('div', null, { className: 'qr-preview' });
  const options = choices(settings);
  function renderFields() {
    group.replaceChildren(...fields[type.value].map(([name, title, kind]) => {
      const control = Array.isArray(kind) ? select(kind, kind[0]) : kind === 'textarea' ? element('textarea') : element('input', null, { type: kind });
      control.name = name;
      control.autocomplete = 'off';
      control.maxLength = 3000;
      return label(title, control);
    }));
  }
  renderFields();
  type.onchange = renderFields;
  form.oninput = () => { output.replaceChildren(); status.textContent = ''; };
  form.append(label('Content type', type), group, options.row, element('button', 'Generate QR code', { className: 'primary' }));
  form.onsubmit = event => {
    event.preventDefault();
    try {
      const config = options.values();
      const code = matrix(payload(type.value, Object.fromEntries(new FormData(form))), config.level);
      const { canvas, svg } = renderMatrix(code, config);
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', 'Generated QR code');
      output.replaceChildren(canvas, actions(button('Download PNG', async () => download(await png(canvas), 'png')),
        button('Download SVG', () => download(new Blob([svg], { type: 'image/svg+xml' }), 'svg')),
        ...(globalThis.ClipboardItem && navigator.clipboard?.write ? [button('Copy PNG', async () => {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': png(canvas) })]);
          status.textContent = 'QR image copied.';
        })] : [])));
      status.textContent = 'QR code ready. Test it before sharing, especially when using custom colors.';
    } catch (error) { status.textContent = error.message; }
  };
  page('Generate QR code', form, output);
}

async function history() {
  page('Scan history');
  const current = view;
  const data = await send('store');
  if (current !== view) return;
  if (!data.settings.remember) {
    mount.append(element('p', 'History is off. Enable it in Settings to keep eligible website addresses.'), button('Open settings', () => navigate('settings')));
    return;
  }
  const search = element('input', null, { type: 'search', placeholder: 'Search addresses' });
  const filter = select([['all', 'All content'], ['URL', 'Website addresses']], 'all');
  const list = element('div');
  let items = data.history;
  function draw() {
    const filtered = items.filter(item => (filter.value === 'all' || item.type === filter.value) && item.value.toLowerCase().includes(search.value.toLowerCase()));
    list.replaceChildren(...filtered.map(item => {
      const card = element('article', null, { className: 'card' });
      card.append(element('pre', item.value), element('time', new Date(item.at).toLocaleString(), { dateTime: new Date(item.at).toISOString() }),
        actions(button('Copy', () => copy(item.value)), button('Delete', async () => {
          items = (await send('store', { remove: item.id })).history; draw();
        })));
      return card;
    }));
    if (!filtered.length) list.append(element('p', 'No matching scans.'));
  }
  search.oninput = filter.onchange = draw;
  mount.append(element('p', 'History saves only eligible HTTPS site root addresses. Other content and URLs with paths, queries or fragments are skipped.', { className: 'subtle' }),
    label('Search history', search), label('Content type', filter), button('Clear all history', async () => {
      if (confirm('Delete all SkipCam history from this browser?')) { items = (await send('store', { clear: true })).history; draw(); }
    }), list);
  draw();
}

async function preferences() {
  const theme = select([['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], settings.theme);
  const motion = select([['system', 'System'], ['reduce', 'Reduce motion']], settings.motion);
  const days = select([1, 7, 30, 90].map(day => [day, day + (day === 1 ? ' day' : ' days')]), settings.days);
  const remember = element('input', null, { type: 'checkbox', checked: settings.remember });
  const options = choices(settings);
  const check = label('Keep eligible website addresses on this device', remember);
  check.className = 'check';
  page('Settings', element('h2', 'Appearance'), label('Theme', theme), label('Motion', motion),
    element('h2', 'History'), check, label('Retention', days), element('p', 'Turning history off clears saved entries.', { className: 'subtle' }),
    element('h2', 'Generation defaults'), options.row, button('Save settings', async () => {
      settings = (await send('store', { settings: { theme: theme.value, motion: motion.value, remember: remember.checked, days: Number(days.value), ...options.values() } })).settings;
      applyTheme();
      status.textContent = 'Settings saved.';
    }, 'primary'), element('h2', 'About SkipCam'),
    element('p', 'QR processing happens on this device. No accounts, telemetry or upload service.'),
    element('p', 'Scan shortcut · Alt+Shift+Q. Your browser may allow remapping.'),
    actions(link('GitHub ↗', 'https://github.com/asintha1a/skipcam', 'button'),
      link('Privacy policy ↗', 'https://github.com/asintha1a/skipcam/blob/main/PRIVACY.md', 'button'),
      link('Self Graphic Lab ↗', 'https://www.selfgraphic.tech/', 'button')));
}

async function routeTo(route) {
  try {
    if (popup) return home();
    if (route === 'generate') return generator();
    if (route === 'upload' || route === 'paste') return upload(route === 'paste');
    if (route === 'history') return await history();
    if (route === 'settings') return await preferences();
    if (route.startsWith('scan/')) {
      page('Screen scan', element('p', 'Reading the visible selection.'));
      const current = view;
      const { data, selection } = await send('capture', { key: route.slice(5) });
      if (current !== view) return;
      if (typeof data !== 'string' || !data.startsWith('data:image/png;base64,')) throw Error('The capture was invalid.');
      const bytes = Uint8Array.from(atob(data.slice(22)), character => character.charCodeAt(0));
      return await scan(new Blob([bytes], { type: 'image/png' }), selection);
    }
    home();
  } catch (error) {
    if (route.startsWith('scan/')) page('Could not scan this selection', button('Scan an image', () => navigate('upload')));
    status.textContent = error.message;
  }
}

try { settings = (await send('store')).settings; }
catch { /* Scanning and generation can run with defaults if storage is unavailable. */ }
applyTheme();
await routeTo(location.hash.slice(1));
window.addEventListener('hashchange', () => void routeTo(location.hash.slice(1)));
