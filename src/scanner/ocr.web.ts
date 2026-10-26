import { createWorker, OEM, PSM, type Worker } from 'tesseract.js';

// Web build: text recognition with Tesseract compiled to WebAssembly, running in the
// browser. The engine and the English model are served by the app itself from /ocr/
// (copied there by scripts/copy-ocr-assets.js), so nothing is fetched from a CDN and
// camera frames never leave the browser.

export type OcrAvailability = 'available' | 'needs-dev-build';

export const ocrAvailability: OcrAvailability = 'available';

const base = () => new URL('ocr/', document.baseURI).href;

export async function createWebOcr(): Promise<Worker> {
  const worker = await createWorker('eng', OEM.LSTM_ONLY, {
    workerPath: `${base()}worker.min.js`,
    corePath: base(),
    langPath: base(),
    workerBlobURL: false,
  });
  await worker.setParameters({
    // The crop holds one or two lines of label text.
    tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/.-:, ',
  });
  return worker;
}

// Only the native build reads files; on the web ScannerCamera.web.tsx reads canvases.
export async function recognizeText(): Promise<string[]> {
  throw new Error('recognizeText is not used on the web.');
}
