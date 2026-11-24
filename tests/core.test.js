import test from 'node:test';
import assert from 'node:assert/strict';
import { contextualValue, historyValue, inspect } from '../extension/lib/content-type.js';
import { matrix, payload } from '../extension/lib/generate.js';
import { decodePixels, pixelCrop, scanImage, validateImage } from '../extension/lib/decode.js';
import { cleanHistory, createStore, defaults } from '../extension/lib/history.js';

function raster(code) {
  const scale = 5;
  const width = (code.length + 8) * scale;
  const data = new Uint8ClampedArray(width * width * 4).fill(255);
  for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
    if (code[Math.floor(y / scale) - 4]?.[Math.floor(x / scale) - 4]) {
      const index = (y * width + x) * 4;
      data.fill(0, index, index + 3);
    }
  }
  return { data, width, height: width };
}

test('encoder and bundled decoder round-trip Unicode and all error correction levels', () => {
  for (const level of ['L', 'M', 'Q', 'H']) {
    for (const value of ['https://example.org/', 'SnipRay · සිංහල 日本語']) {
      assert.equal(decodePixels(raster(matrix(value, level))), value);
    }
  }
});
test('blank pixels do not decode and invalid image sizes or types are rejected', async () => {
  assert.equal(decodePixels({ data: new Uint8ClampedArray(64 * 64 * 4).fill(255), width: 64, height: 64 }), null);
  assert.throws(() => validateImage({ type: 'image/png', size: 22 * 1024 * 1024 }), /20 MB/);
  assert.throws(() => validateImage({ type: 'image/svg+xml', size: 100 }), /Choose a PNG/);
  await assert.rejects(scanImage(new Blob([], { type: 'image/png' })), /nonempty/);
});
test('viewport-relative crop handles noninteger zoom and clips right/bottom edges', () => {
  assert.deepEqual(pixelCrop({ x: 12, y: 16, width: 704, height: 550 }, { width: 710, height: 560 }, 1420, 840), [24, 24, 1396, 816]);
});
test('URL previews expose actual hosts and warn on HTTP, shorteners, IDNs and credentials', () => {
  assert.equal(inspect('example.com').href, 'https://example.com/');
  assert.match(inspect('http://bit.ly/a').warnings.join(), /unencrypted.*Shortened/);
  assert.match(inspect('https://bücher.example/').host, /^xn--/);
  assert.match(inspect('https://bücher.example/').warnings[0], /Internationalized/);
  assert.match(inspect('https://bank.example.com.redirect.example/').warnings.join(), /Unusual/);
  assert.equal(inspect('https://bank.example@evil.example/').href, null);
});
test('dangerous and malformed schemes have no open action, markup stays literal', () => {
  for (const value of ['javascript:alert(1)', 'java\nscript:alert(1)', 'data:text/html,body', 'file:///etc/hosts', 'ftp://example.org/', 'https:///']) {
    assert.equal(inspect(value).href, undefined);
  }
  const html = '<img src=x onerror=alert(1)>';
  assert.deepEqual(inspect(html), { raw: html, type: 'Text' });
});
test('recognizes structured QR types and emits valid generator payloads', () => {
  const values = [
    ['url', { address: 'https://example.org/' }, 'URL'],
    ['text', { text: 'hello' }, 'Text'],
    ['email', { address: 'a@example.org', subject: 'm & n' }, 'Email'],
    ['phone', { number: '+1 (555) 123-4567' }, 'Telephone'],
    ['sms', { number: '5550001', text: 'Hello & welcome' }, 'SMS'],
    ['wifi', { ssid: 'A;B', password: 'pass:word', security: 'WPA' }, 'Wi-Fi'],
    ['contact', { name: 'Ada Lovelace' }, 'Contact']
  ];
  for (const [type, input, expected] of values) {
    const value = payload(type, input);
    assert.equal(inspect(value).type, expected);
    if (!['url', 'text'].includes(type)) assert.ok(contextualValue(inspect(value))?.[1]);
  }
  assert.equal(inspect('geo:6.9271,79.8612').type, 'Coordinates');
  assert.throws(() => payload('url', { address: 'javascript:alert(1)' }), /HTTP/);
  assert.throws(() => matrix('太'.repeat(5000), 'H'), /too long/);
});
test('history excludes sensitive values and removes expired items', () => {
  for (const value of ['WIFI:T:WPA;S:home;P:sensitive;;', 'otpauth://totp/issuer?secret=ABC', 'https://example.org/?token=ABC', 'https://example.org/reset/A', 'https://example.org/#secret', 'https://user:pass@example.org/']) {
    assert.equal(historyValue(inspect(value)), null);
  }
  const one = { id: 'a', value: 'https://example.org/', type: 'URL', at: 2_000 };
  assert.deepEqual(cleanHistory([one], { ...defaults, remember: true, days: 1 }, 86_402_001), []);
  assert.deepEqual(cleanHistory([one], { ...defaults, remember: true, days: 1 }, 60_000), [one]);
});
test('storage serializes concurrent scans and clearing or disabling history removes entries', async () => {
  let saved = {};
  const store = createStore({ get: async () => structuredClone(saved), set: async value => { saved = value; } });
  assert.equal((await store({ results: ['https://example.org/'] })).history.length, 0);
  await store({ settings: { remember: true } });
  await Promise.all([store({ results: ['https://example.org/'] }), store({ results: ['https://example.com/'] })]);
  assert.equal(saved.history.length, 2);
  await store({ remove: saved.history[0].id });
  assert.equal(saved.history.length, 1);
  await store({ clear: true });
  assert.equal(saved.history.length, 0);
  await store({ results: ['https://example.org/'] });
  await store({ settings: { remember: false } });
  assert.equal(saved.history.length, 0);
});
