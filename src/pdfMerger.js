// pdfMerger.js – handles PDF merging with pdf-lib

import { PDFDocument } from 'pdf-lib';
import { setProgress, updateProgressLabel } from './uiManager.js';

/**
 * Merge an array of { file, name } objects.
 * Reports progress via setProgress(0–100).
 * Returns { bytes: Uint8Array, warnings: string[] }
 */
export async function mergePDFs(fileEntries) {
  const merged = await PDFDocument.create();
  const total  = fileEntries.length;
  const warnings = [];

  // Set document metadata
  merged.setTitle('Merged PDF – OM PDF');
  merged.setCreator('OM PDF (https://om-pdf.netlify.app)');
  merged.setProducer('OM PDF');
  merged.setCreationDate(new Date());
  merged.setModificationDate(new Date());

  for (let i = 0; i < total; i++) {
    const entry = fileEntries[i];
    updateProgressLabel(`Reading file ${i + 1} of ${total}: ${entry.name.slice(0, 30)}…`);

    let srcDoc;
    try {
      const arrayBuffer = await entry.file.arrayBuffer();
      try {
        srcDoc = await PDFDocument.load(arrayBuffer);
      } catch (encErr) {
        if (encErr.message && encErr.message.includes('encrypted')) {
          srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          warnings.push(`"${entry.name}" is password-protected — pages may appear blank.`);
        } else { throw encErr; }
      }
    } catch (err) {
      warnings.push(`"${entry.name}" could not be read and was skipped.`);
      setProgress(5 + ((i + 1) / total) * 85);
      await new Promise(r => setTimeout(r, 0));
      continue;
    }

    updateProgressLabel(`Merging file ${i + 1} of ${total}…`);
    const pageIndices = srcDoc.getPageIndices();
    const copiedPages = await merged.copyPages(srcDoc, pageIndices);
    copiedPages.forEach(page => merged.addPage(page));

    setProgress(5 + ((i + 1) / total) * 85);
    await new Promise(r => setTimeout(r, 0));
  }

  if (merged.getPageCount() === 0) {
    throw new Error('No pages could be merged. All files may be corrupted or unreadable.');
  }

  setProgress(95);
  const bytes = await merged.save();
  setProgress(100);
  return { bytes, warnings };
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
 * Generate a timestamped filename: prefix_YYYY-MM-DD_HH-MM-SS.pdf
 */
export function timestampedFilename(base = 'merged') {
  const now    = new Date();
  const date   = now.toISOString().slice(0, 10);                           // YYYY-MM-DD
  const time   = now.toTimeString().slice(0, 8).replace(/:/g, '-');        // HH-MM-SS
  const clean  = base.trim().replace(/\.pdf$/i, '').replace(/\s+/g, '_') || 'merged';
  return `${clean}_${date}_${time}.pdf`;
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
