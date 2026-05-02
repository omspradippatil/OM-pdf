// thumbnailGenerator.js – renders first page of a PDF to a small canvas thumbnail

import * as pdfjsLib from 'pdfjs-dist';

// Use CDN worker — avoids complex Vite worker bundling
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const THUMB_WIDTH = 72; // px — compact but clear
const PAGE_THUMB_WIDTH = 92; // px — for page organizer grid

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

/**
 * Generate JPEG thumbnails for every page in a PDF file.
 * Returns an array of data URLs (null if a page fails).
 */
export async function generatePageThumbnails(file) {
  try {
    const buf  = await file.arrayBuffer();
    const pdf  = await pdfjsLib.getDocument({ data: buf, verbosity: 0 }).promise;
    const total = pdf.numPages;
    const thumbs = new Array(total).fill(null);

    for (let i = 1; i <= total; i++) {
      const page = await pdf.getPage(i);
      const scale = PAGE_THUMB_WIDTH / page.getViewport({ scale: 1 }).width;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      thumbs[i - 1] = canvas.toDataURL('image/jpeg', 0.7);
      await new Promise(r => setTimeout(r, 0));
    }

    return thumbs;
  } catch {
    return null;
  }
}
