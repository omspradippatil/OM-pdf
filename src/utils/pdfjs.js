import * as pdfjsLib from 'pdfjs-dist';
import { pdfjs } from 'react-pdf';

const workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
if (pdfjs?.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
}

export { pdfjsLib };
