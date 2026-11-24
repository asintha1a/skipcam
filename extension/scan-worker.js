import { scanImage } from './lib/decode.js';
self.onmessage = async ({ data: { file, selection } }) => {
  try { self.postMessage({ results: await scanImage(file, selection) }); }
  catch (error) { self.postMessage({ error: error.message }); }
};
