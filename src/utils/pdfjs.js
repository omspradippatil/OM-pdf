import * as pdfjsLib from 'pdfjs-dist';

// Use Vite's ?url import to serve the worker from the same origin.
// This avoids CSP violations that occur when loading from CDN in production.
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export { pdfjsLib };
