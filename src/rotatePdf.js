// rotatePdf.js – rotate PDF pages by a fixed angle

import { PDFDocument, degrees } from 'pdf-lib';

/**
 * Rotate specific pages of a PDF file.
 * pageIndices are 0-based.
 * Returns Uint8Array bytes.
 */
export async function rotatePdf(file, pageIndices, rotationDegrees) {
  const buf = await file.arrayBuffer();
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const total = doc.getPageCount();

  const indices = Array.isArray(pageIndices)
    ? pageIndices.filter(i => i >= 0 && i < total)
    : [];

  if (indices.length === 0) {
    throw new Error('No valid pages to rotate.');
  }

  const delta = ((rotationDegrees % 360) + 360) % 360;

  indices.forEach(i => {
    const page = doc.getPage(i);
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + delta) % 360));
  });

  return doc.save();
}
