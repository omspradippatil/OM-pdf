import * as pdfjsLib from 'pdfjs-dist';
import { pdfjs } from 'react-pdf';

// Using CDN for the worker to ensure 100% reliability across all environments
const PDFJS_VERSION = '5.6.205';
const workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

if (pdfjs?.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
}

export { pdfjsLib };
