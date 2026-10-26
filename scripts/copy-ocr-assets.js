// Copies the in-browser text reader (Tesseract.js worker, its WebAssembly core and the English
// model) into public/ocr so the web build serves them itself instead of loading them from a CDN.
// Runs after `npm install`; public/ocr is not committed.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'public', 'ocr');
const files = [
  ['node_modules/tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js'],
  ['node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'eng.traineddata.gz'],
];

fs.mkdirSync(out, { recursive: true });
for (const [from, to] of files) {
  fs.copyFileSync(path.join(root, from), path.join(out, to));
}
console.log(`Copied ${files.length} OCR files to public/ocr`);
