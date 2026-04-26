// splitPdf.js – PDF split/extract logic

import { PDFDocument } from 'pdf-lib';

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

/** Split every page into individual PDFs. Returns array of {bytes, pageNum}. */
export async function splitEveryPage(file, onProgress) {
  const buf    = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const total  = srcDoc.getPageCount();
  const results = [];
  for (let i = 0; i < total; i++) {
    const doc = await PDFDocument.create();
    const [pg] = await doc.copyPages(srcDoc, [i]);
    doc.addPage(pg);
    results.push({ bytes: await doc.save(), pageNum: i + 1 });
    onProgress && onProgress(Math.round(((i + 1) / total) * 100));
    await new Promise(r => setTimeout(r, 0));
  }
  return results;
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
