// splitPdf.js – PDF split/extract logic

import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

/**
 * Parse a range string like "1-3, 5, 7-9" into sorted 0-indexed page array.
 * Returns all pages if input is blank.
 */
export function parsePageRanges(input, totalPages) {
  if (!input || !input.trim()) return Array.from({ length: totalPages }, (_, i) => i);
  const indices = new Set();
  for (const part of input.split(',')) {
    const t = part.trim();
    if (t.includes('-')) {
      let [a, b] = t.split('-').map(n => parseInt(n, 10));
      a = Math.max(1, a); b = Math.min(totalPages, b);
      for (let i = a; i <= b; i++) indices.add(i - 1);
    } else {
      const n = parseInt(t, 10);
      if (!isNaN(n) && n >= 1 && n <= totalPages) indices.add(n - 1);
    }
  }
  return [...indices].sort((a, b) => a - b);
}

/** Extract specific pages into a new PDF. Returns Uint8Array. */
export async function extractPages(file, pageIndices) {
  const buf    = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const newDoc = await PDFDocument.create();
  newDoc.setCreator('OM PDF');
  newDoc.setProducer('OM PDF');
  newDoc.setCreationDate(new Date());
  const copied = await newDoc.copyPages(srcDoc, pageIndices);
  copied.forEach(p => newDoc.addPage(p));
  return newDoc.save();
}

/**
 * Split every page into individual PDFs, bundle them into a ZIP.
 * onProgress(0-100) is called as pages are processed.
 * Returns a Blob of the ZIP file.
 */
export async function splitEveryPage(file, baseName, onProgress) {
  const buf    = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const total  = srcDoc.getPageCount();
  const zip    = new JSZip();
  const folder = zip.folder(baseName);

  for (let i = 0; i < total; i++) {
    const doc = await PDFDocument.create();
    const [pg] = await doc.copyPages(srcDoc, [i]);
    doc.addPage(pg);
    const bytes = await doc.save();
    const pageNum = String(i + 1).padStart(String(total).length, '0');
    folder.file(`${baseName}_page${pageNum}.pdf`, bytes);
    onProgress && onProgress(Math.round(((i + 1) / total) * 90));
    await new Promise(r => setTimeout(r, 0));
  }

  onProgress && onProgress(95);
  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  onProgress && onProgress(100);
  return zipBlob;
}

/**
 * Split PDF into chunks of N pages, bundled into a ZIP.
 * Returns a Blob of the ZIP file.
 */
export async function splitEveryNPages(file, baseName, chunkSize, onProgress) {
  const buf    = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const total  = srcDoc.getPageCount();
  const zip    = new JSZip();
  const folder = zip.folder(baseName);
  const size   = Math.max(1, chunkSize || 1);

  let fileIndex = 0;
  for (let i = 0; i < total; i += size) {
    const doc = await PDFDocument.create();
    const slice = Array.from({ length: Math.min(size, total - i) }, (_, idx) => i + idx);
    const pages = await doc.copyPages(srcDoc, slice);
    pages.forEach(p => doc.addPage(p));
    const bytes = await doc.save();
    const start = String(i + 1).padStart(String(total).length, '0');
    const end = String(i + slice.length).padStart(String(total).length, '0');
    folder.file(`${baseName}_pages_${start}-${end}.pdf`, bytes);
    fileIndex += 1;
    onProgress && onProgress(Math.round((Math.min(i + size, total) / total) * 90));
    await new Promise(r => setTimeout(r, 0));
  }

  onProgress && onProgress(95);
  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  onProgress && onProgress(100);
  return zipBlob;
}

/** Download bytes as PDF */
export function downloadBytes(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

/**
 * Split PDF into chunks that are approximately smaller than maxSizeMB.
 * Returns a Blob of the ZIP file.
 */
export async function splitBySize(file, baseName, maxSizeMB, onProgress) {
  const buf    = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const total  = srcDoc.getPageCount();
  const zip    = new JSZip();
  const folder = zip.folder(baseName);
  
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  const avgPageSize = file.size / total;
  
  // A heuristic: target pages per chunk, ensuring at least 1 page.
  // We use 0.95 as a safety factor since metadata adds some overhead.
  const chunkSize = Math.max(1, Math.floor((maxSizeBytes * 0.95) / avgPageSize));

  let fileIndex = 0;
  for (let i = 0; i < total; i += chunkSize) {
    const doc = await PDFDocument.create();
    const slice = Array.from({ length: Math.min(chunkSize, total - i) }, (_, idx) => i + idx);
    const pages = await doc.copyPages(srcDoc, slice);
    pages.forEach(p => doc.addPage(p));
    const bytes = await doc.save();
    
    // Check if the resulting file is still way too big (due to large embedded objects on specific pages)
    // In a production app, we would recursively split this chunk if bytes.length > maxSizeBytes,
    // but the heuristic is usually good enough for typical PDFs.
    
    const start = String(i + 1).padStart(String(total).length, '0');
    const end = String(i + slice.length).padStart(String(total).length, '0');
    folder.file(`${baseName}_part${fileIndex + 1}_(${start}-${end}).pdf`, bytes);
    
    fileIndex += 1;
    if (onProgress) onProgress(Math.round((Math.min(i + chunkSize, total) / total) * 90));
    await new Promise(r => setTimeout(r, 0));
  }

  if (onProgress) onProgress(95);
  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  if (onProgress) onProgress(100);
  return zipBlob;
}
