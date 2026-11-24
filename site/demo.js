import { matrix, renderMatrix } from '../extension/lib/generate.js';
import { decodePixels } from '../extension/lib/decode.js';
import { inspect } from '../extension/lib/content-type.js';

const byId = id => document.getElementById(id);
const sample = byId('sample');
const sampleCanvas = byId('sample-code');
const generatedCanvas = byId('generated-code');
const scanStatus = byId('scan-status');
const generatorStatus = byId('generate-status');
function draw(canvas, value) {
  const rendered = renderMatrix(matrix(value), { size: 256 });
  canvas.getContext('2d').drawImage(rendered.canvas, 0, 0);
}
sample.onchange = () => { draw(sampleCanvas, sample.value); scanStatus.textContent = ''; };
byId('scan').onclick = () => {
  const value = decodePixels(sampleCanvas.getContext('2d').getImageData(0, 0, 256, 256));
  if (value === null) { scanStatus.textContent = 'No QR code found.'; return; }
  const decoded = inspect(value);
  scanStatus.textContent = [decoded.type + ' · ' + decoded.raw, ...decoded.warnings ?? []].join(' ');
};
byId('generate').onsubmit = event => {
  event.preventDefault();
  try {
    draw(generatedCanvas, byId('demo-text').value);
    generatorStatus.textContent = 'QR code generated locally.';
  } catch (error) { generatorStatus.textContent = error.message; }
};
byId('download').onclick = () => {
  generatedCanvas.toBlob(blob => {
    if (!blob) { generatorStatus.textContent = 'PNG export failed.'; return; }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'skipcam-qr.png';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
};
draw(sampleCanvas, sample.value);
draw(generatedCanvas, byId('demo-text').value);
