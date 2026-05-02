// pageNumbers.js — Add page numbers to a PDF using pdf-lib

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Options:
 *   startFrom   {number}  — page number to start labelling from (default 1)
 *   startPage   {number}  — 1-based index of first page to number (default 1, 0 = all)
 *   position    {string}  — 'bottom-center'|'bottom-right'|'bottom-left'|'top-center'|'top-right'|'top-left'
 *   prefix      {string}  — e.g. "Page " → "Page 1"
 *   showTotal   {boolean} — if true, renders "Page 1 of 10"
 *   fontSize    {number}  — default 11
 *   margin      {number}  — distance from edge in points (default 28)
 *   onProgress  {fn}      — progress callback (0-100)
 */
export async function addPageNumbers(file, opts = {}, onProgress) {
  const {
    startFrom   = 1,
    startPage   = 1,
    position    = 'bottom-center',
    prefix      = 'Page ',
    showTotal   = true,
    fontSize    = 11,
    margin      = 28,
  } = opts;

  const buf    = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const font   = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages  = pdfDoc.getPages();
  const total  = pages.length;

  for (let i = 0; i < total; i++) {
    // Skip pages before startPage (1-based)
    if (i + 1 < startPage) continue;

    const page   = pages[i];
    const { width, height } = page.getSize();
    const pageNum = (i + 1 - startPage) + startFrom;
    const label   = showTotal
      ? `${prefix}${pageNum} of ${total - startPage + 1}`
      : `${prefix}${pageNum}`;

    const textWidth = font.widthOfTextAtSize(label, fontSize);

    let x, y;
    switch (position) {
      case 'bottom-center': x = (width - textWidth) / 2;  y = margin;           break;
      case 'bottom-right':  x = width - textWidth - margin; y = margin;          break;
      case 'bottom-left':   x = margin;                    y = margin;           break;
      case 'top-center':    x = (width - textWidth) / 2;  y = height - margin;  break;
      case 'top-right':     x = width - textWidth - margin; y = height - margin; break;
      case 'top-left':      x = margin;                    y = height - margin;  break;
      default:              x = (width - textWidth) / 2;  y = margin;
    }

    page.drawText(label, {
      x, y,
      size: fontSize,
      font,
      color: rgb(0.35, 0.35, 0.35),
      opacity: 0.85,
    });

    onProgress && onProgress(Math.round(((i + 1) / total) * 90));
    await new Promise(r => setTimeout(r, 0)); // yield to keep UI alive
  }

  onProgress && onProgress(100);
  return pdfDoc.save();
}

/** Total page count of a file (re-exported convenience) */
export async function getPdfPageCount(file) {
  try {
    const buf = await file.arrayBuffer();
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    return doc.getPageCount();
  } catch { return null; }
}
