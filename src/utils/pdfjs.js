import * as pdfjsLib from 'pdfjs-dist';
import { pdfjs } from 'react-pdf';

// Import the worker directly as a URL to ensure Vite bundles it correctly
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

if (pdfjs?.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
}

export { pdfjsLib };
