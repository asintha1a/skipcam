import test from 'node:test';
import assert from 'node:assert/strict';

let listener;
const base = 'chrome-extension://test/';
const event = { addListener() {} };
globalThis.chrome = {
  runtime: { id: 'test', getURL: path => base + path, onInstalled: event, onMessage: { addListener: fn => { listener = fn; } } },
  commands: { onCommand: event }, contextMenus: { onClicked: event },
  storage: { local: { get: async () => ({}), set: async () => {} } },
  tabs: { query: async () => [{ id: 1, url: 'chrome://extensions/' }] }
};
const { isSupportedPage, validSelection } = await import('../extension/background.js');
const page = { id: 'test', url: base + 'app.html#popup' };
const dispatch = (message, sender) => new Promise(resolve => {
  if (listener(message, sender, resolve) === false) resolve(false);
});

test('message router rejects foreign and unprivileged requests and expired captures', async () => {
  assert.equal(await dispatch({ type: 'store' }, { ...page, id: 'foreign' }), false);
  assert.match((await dispatch({ type: 'store' }, { id: 'test', url: 'https://example.org' })).error, /Unsupported/);
  assert.match((await dispatch({ type: 'capture', key: 'unknown' }, page)).error, /expired/);
  assert.match((await dispatch({ type: 'start' }, page)).error, /unavailable/);
  assert.match((await dispatch({ type: 'selection', selection: {} }, { id: 'test', frameId: 0, tab: {} })).error, /Unsupported/);
});
test('restricted-page and crop checks fail closed', () => {
  for (const url of ['chrome://extensions', 'about:config', 'https://addons.mozilla.org/en-US/firefox/', 'https://chromewebstore.google.com/', undefined]) assert.equal(isSupportedPage(url), false);
  assert.equal(isSupportedPage('https://example.org/'), true);
  assert.equal(validSelection({ rect: { x: 0, y: 0, width: 200, height: 50 }, view: { width: 100, height: 100 } }), false);
  assert.equal(validSelection({ rect: { x: 0, y: 0, width: 100, height: 100 }, view: { width: 100, height: 100 } }), true);
});
