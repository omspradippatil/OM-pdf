// thumbnailGenerator.js – renders first page of a PDF to a small canvas thumbnail

import * as pdfjsLib from 'pdfjs-dist';

// Use CDN worker — avoids complex Vite worker bundling
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const THUMB_WIDTH = 72; // px — compact but clear

/**
 * Generate a JPEG data URL thumbnail of the first page of a PDF file.
 * Returns null on failure (encrypted, corrupt, etc.)
 */
export async function generateThumbnail(file) {
  try {
    const buf  = await file.arrayBuffer();
    const pdf  = await pdfjsLib.getDocument({ data: buf, verbosity: 0 }).promise;
    const page = await pdf.getPage(1);
    const scale    = THUMB_WIDTH / page.getViewport({ scale: 1 }).width;
    const viewport = page.getViewport({ scale });
    const canvas   = document.createElement('canvas');
    canvas.width   = viewport.width;
    canvas.height  = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.75);
  } catch {
    return null;
  }
}
