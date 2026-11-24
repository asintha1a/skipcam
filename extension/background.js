import { createStore, defaults } from './lib/history.js';

const api = globalThis.browser ?? globalThis.chrome;
const base = api.runtime.getURL('');
const store = createStore(api.storage.local);
const captures = new Map();
const menu = 'snipray-image';

export function isSupportedPage(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'file:'].includes(parsed.protocol) &&
      !['chromewebstore.google.com', 'addons.mozilla.org', 'microsoftedge.microsoft.com'].includes(parsed.hostname) &&
      !(parsed.hostname === 'chrome.google.com' && parsed.pathname.startsWith('/webstore'));
  } catch { return false; }
}

export function validSelection(value) {
  const { rect, view } = value ?? {};
  return Boolean(rect && view && [rect.x, rect.y, rect.width, rect.height, view.width, view.height].every(Number.isFinite) &&
    rect.width >= 1 && rect.height >= 1 && view.width >= 1 && view.height >= 1 &&
    rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= view.width + 1 && rect.y + rect.height <= view.height + 1 &&
    view.width <= 32768 && view.height <= 32768);
}

function capture(tab, selection) {
  return (async () => {
    const active = () => api.tabs.query({ active: true, windowId: tab.windowId }).then(([value]) => value?.id === tab.id && isSupportedPage(value.url) && value.url === tab.url);
    if (!await active()) throw Error('Return to the tab you started scanning and try again.');
    const data = await api.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
    if (!await active()) throw Error('The active tab changed during capture.');
    await openResult({ data, selection });
  })();
}

async function openResult(value) {
  const key = crypto.randomUUID();
  for (const [id, result] of captures) if (result.expires < Date.now()) captures.delete(id);
  if (captures.size >= 3) captures.delete(captures.keys().next().value);
  captures.set(key, { value, expires: Date.now() + 25_000 });
  setTimeout(() => captures.delete(key), 25_000);
  await api.tabs.create({ url: base + 'app.html#scan/' + key });
}

async function start(tab) {
  if (!tab?.id || !isSupportedPage(tab.url)) throw Error('Screen selection is unavailable on this page. Try uploading an image.');
  try {
    await api.scripting.executeScript({ target: { tabId: tab.id }, files: ['overlay.js'] });
  } catch {
    throw Error('The browser disallows screen selection here. Try uploading an image.');
  }
}

api.runtime.onInstalled.addListener(() => {
  api.contextMenus.create({ id: menu, title: 'Scan image with SnipRay', contexts: ['image'] });
});
api.commands.onCommand.addListener(async command => {
  if (command !== 'scan-screen') return;
  try { await start((await api.tabs.query({ active: true, currentWindow: true }))[0]); }
  catch (error) { await openResult({ error: error.message }); }
});
api.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== menu) return;
  try {
    if (!isSupportedPage(tab?.url)) throw Error('This page blocks image scanning. Save the image and upload it.');
    if (info.frameId) throw Error('Use Scan screen for images inside embedded frames.');
    const [{ result }] = await api.scripting.executeScript({
      target: { tabId: tab.id },
      args: [info.srcUrl, info.targetElementId],
      func: (source, id) => {
        const clicked = globalThis.browser?.menus?.getTargetElement?.(id);
        const matches = clicked instanceof HTMLImageElement ? [clicked] :
          Array.from(document.images).filter(image => image.currentSrc === source || image.src === source);
        const visible = matches.map(image => {
          const bounds = image.getBoundingClientRect();
          const x = Math.max(0, bounds.left);
          const y = Math.max(0, bounds.top);
          return { x, y, width: Math.min(innerWidth, bounds.right) - x, height: Math.min(innerHeight, bounds.bottom) - y };
        }).filter(rect => rect.width >= 1 && rect.height >= 1);
        return visible.length === 1 ? { rect: visible[0], view: { width: innerWidth, height: innerHeight } } : null;
      }
    });
    if (!validSelection(result)) throw Error('The visible image could not be isolated. Use Scan screen to select it.');
    await capture(tab, result);
  } catch (error) { await openResult({ error: error.message }); }
});

function settingsPatch(value) {
  const rules = {
    theme: ['system', 'light', 'dark'], remember: [true, false], days: [1, 7, 30, 90],
    motion: ['system', 'reduce'], size: [256, 512, 1024], level: ['L', 'M', 'Q', 'H']
  };
  return Object.fromEntries(Object.keys(defaults).filter(key => rules[key]?.includes(value?.[key]) ||
    (['foreground', 'background'].includes(key) && typeof value?.[key] === 'string' && /^#[a-f\d]{6}$/i.test(value[key]))
  ).map(key => [key, value[key]]));
}

api.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== api.runtime.id || !message || typeof message.type !== 'string') return false;
  const extensionPage = typeof sender.url === 'string' && sender.url.split('#')[0] === base + 'app.html';
  const run = async () => {
    if (message.type === 'selection' && !extensionPage && sender.frameId === 0 && sender.tab && validSelection(message.selection)) {
      await capture(sender.tab, message.selection);
      return {};
    }
    if (!extensionPage) throw Error('Unsupported request.');
    switch (message.type) {
      case 'start':
        await start((await api.tabs.query({ active: true, currentWindow: true }))[0]);
        return {};
      case 'capture': {
        const entry = captures.get(message.key);
        captures.delete(message.key);
        if (!entry || entry.expires <= Date.now()) throw Error('The capture expired. Scan again.');
        return entry.value;
      }
      case 'store':
        return store({
          settings: message.settings ? settingsPatch(message.settings) : undefined,
          clear: message.clear === true,
          remove: typeof message.remove === 'string' ? message.remove : undefined,
          results: Array.isArray(message.results) ? message.results.slice(0, 10).filter(value => typeof value === 'string' && value.length < 500) : undefined
        });
      default: throw Error('Unsupported request.');
    }
  };
  run().then(reply, error => reply({ error: error.message }));
  return true;
});
