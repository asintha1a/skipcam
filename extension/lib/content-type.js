const schemes = { WIFI: 'Wi-Fi', MAILTO: 'Email', TEL: 'Telephone', SMS: 'SMS', SMSTO: 'SMS', GEO: 'Coordinates' };
const shorteners = new Set('bit.ly tinyurl.com t.co goo.gl is.gd buff.ly ow.ly cutt.ly rebrand.ly bl.ink shorturl.at tiny.cc clck.ru s.id v.gd trib.al qr.ae rb.gy lnkd.in linktr.ee fb.me wp.me amzn.to ift.tt bit.do mcaf.ee su.pr post.ly'.split(' '));

export function inspect(raw) {
  const value = raw.trim();
  const scheme = /^([a-z][a-z\d+.-]*):/i.exec(value)?.[1].toUpperCase();
  if (Object.hasOwn(schemes, scheme)) return { raw, type: schemes[scheme] };
  if (/^BEGIN:VCARD\b/i.test(value)) return { raw, type: 'Contact' };
  const bare = /^(?:www\.|[\p{L}\d-]+\.)+[\p{L}]{2,}(?:[/?#]|$)/iu.test(value) && !/\s/.test(value);
  if (!scheme && !bare) return { raw, type: 'Text' };
  const blocked = { raw, type: 'Blocked link', warnings: ['Only well-formed HTTP and HTTPS destinations can be opened.'] };
  if ((scheme && !/^https?:\/\//i.test(value)) || /[\u0000-\u001f\u007f\\]/.test(value)) return blocked;
  try {
    const url = new URL(bare ? 'https://' + value : value);
    if (!['http:', 'https:'].includes(url.protocol)) return blocked;
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    const warnings = [];
    if (url.protocol === 'http:') warnings.push('HTTP traffic is unencrypted.');
    if (host.split('.').some(label => label.startsWith('xn--'))) warnings.push('Internationalized domain. Check the spelling of the destination.');
    if ([...shorteners].some(domain => host === domain || host.endsWith('.' + domain))) warnings.push('Shortened link. Its final destination is hidden.');
    if (url.username || url.password) warnings.push('Embedded credentials can disguise the actual host. Opening is disabled.');
    if (/\.(com|org|net|edu|gov)\./.test(host) || /^(?:\d+\.){3}\d+$|^\[/.test(host) || host.split('.').length > 4) warnings.push('Unusual hostname. Verify the actual destination.');
    return { raw, type: 'URL', destination: url.href, host: url.host, href: url.username || url.password ? null : url.href, warnings };
  } catch {
    return blocked;
  }
}

export function contextualValue({ type, raw }) {
  const body = raw.trim().replace(/^[^:]+:/, '');
  if (type === 'Telephone') return ['Copy phone number', body];
  if (type === 'Email') return ['Copy email address', body.split('?')[0]];
  if (type === 'SMS') return ['Copy recipient', body.split(/[:?]/)[0]];
  if (type === 'Coordinates') return ['Copy coordinates', body.split(/[;?]/)[0]];
  if (type === 'Wi-Fi') {
    const ssid = /(?:^|;)S:((?:\\.|[^;\\])*)/.exec(body.replace(/^T:[^;]*;/, ''))?.[1];
    if (ssid) return ['Copy network name', ssid.replace(/\\(.)/g, '$1')];
  }
  if (type === 'Contact') {
    const name = /^FN:(.*)$/im.exec(raw)?.[1];
    if (name) return ['Copy contact name', name.trim()];
  }
  return null;
}

// History is deliberately conservative. Store only canonical public-looking URLs
// with no userinfo, query, fragment, opaque path or token-like path segment.
export function historyValue(result) {
  if (!result.href || result.raw.length > 500 || result.warnings.length) return null;
  const url = new URL(result.href);
  if (!url.hostname.includes('.') || url.hostname.endsWith('.local') || url.search || url.hash || url.pathname !== '/') return null;
  return url.origin + '/';
}
