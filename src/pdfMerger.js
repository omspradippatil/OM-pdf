// pdfMerger.js – handles PDF merging with pdf-lib

import { PDFDocument } from 'pdf-lib';
import { setProgress } from './uiManager.js';

/**
 * Merge an array of { file, name } objects.
 * Reports progress via setProgress(0–100).
 * Returns a Uint8Array of the merged PDF bytes.
 */
export async function mergePDFs(fileEntries) {
  const merged = await PDFDocument.create();
  const total = fileEntries.length;

  for (let i = 0; i < total; i++) {
    const entry = fileEntries[i];
    const arrayBuffer = await entry.file.arrayBuffer();
    const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: false });
    const pageIndices = srcDoc.getPageIndices();
    const copiedPages = await merged.copyPages(srcDoc, pageIndices);
    copiedPages.forEach(page => merged.addPage(page));

    // Update progress: 5% → 90% during loading, final 10% on save
    const pct = 5 + ((i + 1) / total) * 85;
    setProgress(pct);

    // Yield to event loop so browser stays responsive
    await new Promise(r => setTimeout(r, 0));
  }

  setProgress(95);
  const bytes = await merged.save();
  setProgress(100);
  return bytes;
}

/**
 * Get page count from a File object
 */
export async function getPageCount(file) {
  try {
    const buf = await file.arrayBuffer();
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    return doc.getPageCount();
  } catch {
    return null;
  }
}

/**
 * Trigger browser download of bytes as a PDF
 */
export function downloadPDF(bytes, filename = 'merged.pdf') {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1000);
}
