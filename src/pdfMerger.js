// pdfMerger.js – handles PDF merging with pdf-lib
// NO dependency on uiManager — uses optional callback pattern instead

import { PDFDocument } from 'pdf-lib';

/**
 * Merge an array of { file, name, pageOrder? } objects.
 * onProgress(pct 0-100, label?) callback is optional.
 * Returns { bytes: Uint8Array, warnings: string[] }
 */
export async function mergePDFs(fileEntries, onProgress) {
  const merged   = await PDFDocument.create();
  const total    = fileEntries.length;
  const warnings = [];

  merged.setTitle('Merged PDF – OM PDF');
  merged.setCreator('OM PDF (https://om-pdf.netlify.app)');
  merged.setProducer('OM PDF');
  merged.setCreationDate(new Date());
  merged.setModificationDate(new Date());

  for (let i = 0; i < total; i++) {
    const entry = fileEntries[i];
    onProgress?.(5 + Math.round((i / total) * 85), `Merging file ${i + 1} of ${total}…`);

    let srcDoc;
    try {
      const arrayBuffer = await entry.file.arrayBuffer();
      try {
        srcDoc = await PDFDocument.load(arrayBuffer);
      } catch (encErr) {
        if (encErr.message?.includes('encrypted')) {
          srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          warnings.push(`"${entry.name}" is password-protected — pages may appear blank.`);
        } else { throw encErr; }
      }
    } catch {
      warnings.push(`"${entry.name}" could not be read and was skipped.`);
      await new Promise(r => setTimeout(r, 0));
      continue;
    }

    const totalPages = srcDoc.getPageCount();
    const pageIndices = Array.isArray(entry.pageOrder) && entry.pageOrder.length
      ? entry.pageOrder.filter(idx => idx >= 0 && idx < totalPages)
      : srcDoc.getPageIndices();

    if (Array.isArray(entry.pageOrder) && pageIndices.length === 0) {
      warnings.push(`"${entry.name}" has no selected pages and was skipped.`);
      await new Promise(r => setTimeout(r, 0));
      continue;
    }

    const copiedPages = await merged.copyPages(srcDoc, pageIndices);
    copiedPages.forEach(page => merged.addPage(page));
    await new Promise(r => setTimeout(r, 0));
  }

  if (merged.getPageCount() === 0) {
    throw new Error('No pages could be merged. All files may be corrupted or unreadable.');
  }

  onProgress?.(95, 'Saving PDF…');
  const bytes = await merged.save();
  onProgress?.(100, 'Done!');
  return { bytes, warnings };
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
