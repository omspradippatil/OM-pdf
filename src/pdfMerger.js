// pdfMerger.js – handles PDF merging with pdf-lib
// NO dependency on uiManager — uses optional callback pattern instead

import { PDFDocument } from 'pdf-lib';

import { runPdfWorkerTask } from './workers/workerClient';

/**
 * Merge an array of { file, name, pageOrder? } objects.
 * onProgress(pct 0-100, label?) callback is optional.
 * Returns { bytes: Uint8Array, warnings: string[] }
 */
export async function mergePDFs(fileEntries, onProgress) {
  const filesPayload = [];
  const transferables = [];

  for (const entry of fileEntries) {
    const buffer = await entry.file.arrayBuffer();
    filesPayload.push({
      name: entry.name,
      buffer,
      pageOrder: entry.pageOrder
    });
    transferables.push(buffer);
  }

  return runPdfWorkerTask('merge', { files: filesPayload }, transferables, onProgress);
}

/** Get page count from a File object */
export async function getPageCount(file) {
  try {
    const buf = await file.arrayBuffer();
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    return doc.getPageCount();
  } catch {
    return null;
  }
}

/** Generate a timestamped filename */
export function timestampedFilename(base = 'merged') {
  const now   = new Date();
  const date  = now.toISOString().slice(0, 10);
  const time  = now.toTimeString().slice(0, 8).replace(/:/g, '-');
  const clean = base.trim().replace(/\.pdf$/i, '').replace(/\s+/g, '_') || 'merged';
  return `${clean}_${date}_${time}.pdf`;
}

/** Trigger browser download of bytes as a PDF */
export function downloadPDF(bytes, filename = 'merged.pdf') {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}
