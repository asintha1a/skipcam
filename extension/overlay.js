(() => {
  const previous = globalThis.__sniprayCancel;
  if (previous) { previous(); return; }
  const api = globalThis.browser ?? globalThis.chrome;
  const active = document.activeElement;
  const host = document.createElement('div');
  host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;display:block';
  const root = host.attachShadow({ mode: 'closed' });
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(`
    *{box-sizing:border-box}
    .overlay{position:absolute;inset:0;cursor:crosshair;touch-action:none;color:#f5f7f2;font:14px system-ui;background:rgba(16,19,18,.5)}
    .overlay.drag{background:transparent}
    .bar{position:absolute;top:18px;left:50%;transform:translateX(-50%);max-width:calc(100% - 24px);width:max-content;display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:#101312;border:1px solid #485048;padding:9px 12px;border-radius:9px;z-index:1;cursor:default}
    strong{font-size:17px;color:#b9ff66}
    button{font:inherit;color:inherit;border:1px solid #58615a;background:#262c28;padding:8px 10px;border-radius:5px;cursor:pointer;min-height:36px}
    button:focus-visible{outline:2px solid #b9ff66;outline-offset:2px}
    .box{position:absolute;border:2px solid #b9ff66;box-shadow:0 0 0 100vmax rgba(16,19,18,.54);pointer-events:none}
    .box:after{content:'';position:absolute;top:50%;width:100%;height:1px;background:#b9ff66}
  `);
  root.adoptedStyleSheets = [sheet];
  function node(tag, className, value) {
    const element = document.createElement(tag);
    element.className = className;
    if (value) element.textContent = value;
    return element;
  }
  const overlay = node('div', 'overlay');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'SnipRay screen selection');
  overlay.setAttribute('aria-describedby', 'snipray-instructions');
  const bar = node('div', 'bar');
  const instructions = node('span', '', 'Drag around a QR code, or scan the visible tab.');
  instructions.id = 'snipray-instructions';
  const cancel = node('button', '', 'Cancel (Esc)');
  const full = node('button', '', 'Scan visible tab');
  const box = node('div', 'box');
  box.hidden = true;
  bar.append(node('strong', '', 'snipray.'), instructions, full, cancel);
  overlay.append(box, bar);
  root.append(overlay);
  const abort = new AbortController();
  const options = { signal: abort.signal };
  let start;
  let pointer;
  let rect;
  const viewport = () => ({ width: innerWidth, height: innerHeight });
  const originalView = viewport();
  function close() {
    abort.abort();
    host.remove();
    delete globalThis.__sniprayCancel;
    active?.focus?.({ preventScroll: true });
  }
  function showError(message) {
    const banner = node('div', 'bar', message);
    banner.style.top = '18px';
    banner.setAttribute('role', 'alert');
    const dismiss = node('button', '', 'Dismiss');
    dismiss.onclick = () => host.remove();
    banner.append(dismiss);
    root.replaceChildren(banner);
    document.documentElement.append(host);
    dismiss.focus();
  }
  async function finish(selection) {
    close();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    try {
      const response = await api.runtime.sendMessage({ type: 'selection', selection });
      if (response?.error) showError(response.error);
    } catch { showError('Capture failed. Open SnipRay and try again.'); }
  }
  cancel.onclick = close;
  full.onclick = () => finish({ rect: { x: 0, y: 0, ...originalView }, view: originalView });
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.stopPropagation(); close(); }
    if (event.key === 'Tab') { event.preventDefault(); (root.activeElement === cancel ? full : cancel).focus(); }
  }, options);
  window.addEventListener('resize', close, options);
  const point = event => ({ x: Math.max(0, Math.min(innerWidth, event.clientX)), y: Math.max(0, Math.min(innerHeight, event.clientY)) });
  overlay.addEventListener('pointerdown', event => {
    if (bar.contains(event.target) || !event.isPrimary || event.button !== 0) return;
    start = point(event);
    pointer = event.pointerId;
    overlay.setPointerCapture(pointer);
    event.preventDefault();
  }, options);
  function track(event) {
    if (!start || pointer !== event.pointerId) return;
    const end = point(event);
    rect = { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) };
    box.hidden = false;
    overlay.classList.add('drag');
    Object.assign(box.style, { left: rect.x + 'px', top: rect.y + 'px', width: rect.width + 'px', height: rect.height + 'px' });
  }
  overlay.addEventListener('pointermove', track, options);
  overlay.addEventListener('pointerup', event => {
    if (pointer !== event.pointerId) return;
    track(event);
    start = pointer = null;
    if (rect.width >= 8 && rect.height >= 8) finish({ rect, view: originalView });
    else { box.hidden = true; overlay.classList.remove('drag'); }
  }, options);
  overlay.addEventListener('pointercancel', close, options);
  globalThis.__sniprayCancel = close;
  document.documentElement.append(host);
  cancel.focus();
})();
