import encoder from 'qrcode-generator';

export const fields = {
  url: [['address', 'Website URL', 'url']],
  text: [['text', 'Text', 'textarea']],
  email: [['address', 'Email address', 'email'], ['subject', 'Subject', 'text']],
  phone: [['number', 'Phone number', 'tel']],
  sms: [['number', 'Phone number', 'tel'], ['text', 'Message', 'textarea']],
  wifi: [['ssid', 'Network name', 'text'], ['password', 'Password', 'password'], ['security', 'Security', ['WPA', 'WEP', 'nopass']]],
  contact: [['name', 'Full name', 'text'], ['number', 'Phone number', 'tel'], ['address', 'Email address', 'email']]
};

const wifiEscape = value => value.replace(/[\\;,":]/g, '\\$&');
const cardEscape = value => value.replace(/[\\;,]/g, '\\$&').replace(/\r\n|\r|\n/g, '\\n');

export function payload(type, value) {
  const require = (key, label) => {
    if (!value[key]?.trim()) throw Error('Enter ' + label + '.');
    return value[key];
  };
  const phone = () => {
    const number = require('number', 'a phone number').replace(/[ ().-]/g, '');
    if (!/^\+?\d{3,20}$/.test(number)) throw Error('Enter a valid phone number.');
    return number;
  };
  switch (type) {
    case 'url': {
      let url;
      try { url = new URL(value.address); } catch { throw Error('Enter an absolute website URL.'); }
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw Error('Use an HTTP or HTTPS URL without credentials.');
      return url.href;
    }
    case 'text': return require('text', 'some text');
    case 'email': {
      const address = require('address', 'an email address');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw Error('Enter a valid email address.');
      return 'mailto:' + encodeURIComponent(address).replace('%40', '@') + (value.subject ? '?subject=' + encodeURIComponent(value.subject) : '');
    }
    case 'phone': return 'tel:' + phone();
    case 'sms': return 'sms:' + phone() + (value.text ? '?body=' + encodeURIComponent(value.text) : '');
    case 'wifi': {
      const security = ['WPA', 'WEP', 'nopass'].includes(value.security) ? value.security : 'WPA';
      const password = security === 'nopass' ? '' : require('password', 'a network password');
      return 'WIFI:T:' + security + ';S:' + wifiEscape(require('ssid', 'a network name')) + ';P:' + wifiEscape(password) + ';;';
    }
    case 'contact': {
      const name = cardEscape(require('name', 'a full name'));
      return ['BEGIN:VCARD', 'VERSION:3.0', 'N:' + name + ';;;;', 'FN:' + name, value.number && 'TEL:' + phone(), value.address && 'EMAIL:' + cardEscape(value.address), 'END:VCARD'].filter(Boolean).join('\r\n');
    }
    default: throw Error('Choose a QR content type.');
  }
}

// qrcode-generator accepts a byte encoder hook. TextEncoder preserves Unicode.
encoder.stringToBytes = value => Array.from(new TextEncoder().encode(value));

export function matrix(value, level = 'M') {
  if (!['L', 'M', 'Q', 'H'].includes(level)) throw Error('Choose a valid error correction level.');
  const qr = encoder(0, level);
  qr.addData(value, 'Byte');
  try { qr.make(); } catch { throw Error('This content is too long for a QR code at this correction level.'); }
  return Array.from({ length: qr.getModuleCount() }, (_, y) =>
    Array.from({ length: qr.getModuleCount() }, (_, x) => qr.isDark(y, x)));
}

export function renderMatrix(code, { foreground = '#111111', background = '#ffffff', size = 512 } = {}) {
  if (!/^#[a-f\d]{6}$/i.test(foreground) || !/^#[a-f\d]{6}$/i.test(background) || ![256, 512, 1024].includes(size)) throw Error('Choose valid colors and size.');
  const dimension = code.length + 8;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  const scale = Math.floor(size / dimension);
  const offset = Math.floor((size - dimension * scale) / 2);
  context.fillStyle = background;
  context.fillRect(0, 0, size, size);
  context.fillStyle = foreground;
  const paths = [];
  code.forEach((row, y) => row.forEach((on, x) => {
    if (!on) return;
    context.fillRect(offset + (x + 4) * scale, offset + (y + 4) * scale, scale, scale);
    paths.push(`M${x + 4} ${y + 4}h1v1h-1z`);
  }));
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + dimension + ' ' + dimension +
    '" width="' + size + '" height="' + size + '" shape-rendering="crispEdges"><path fill="' + background +
    '" d="M0 0h' + dimension + 'v' + dimension + 'H0z"/><path fill="' + foreground + '" d="' + paths.join('') + '"/></svg>';
  return { canvas, svg };
}
