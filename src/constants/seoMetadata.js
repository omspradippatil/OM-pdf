/**
 * SEO Metadata Configuration for All Tools
 * Each tool has unique titles, descriptions, keywords optimized for search ranking
 * 
 * Strategy:
 * - Each page targets low-competition keywords in the PDF tools space
 * - No stuffing; natural keyword inclusion for readability
 * - Descriptions under 160 chars for proper display in Google
 * - Canonical URLs point to each tool's specific page
 */

export const SEO_METADATA = {
  home: {
    title: "Free PDF Tools Online | Merge, Split, Compress, Convert PDF",
    description: "Merge PDF, split PDF, compress PDF, convert PDF to JPG and add page numbers — all free, private and instant in your browser. No upload. No sign-up.",
    keywords: "pdf tools, free pdf editor, merge pdf, split pdf, compress pdf, convert pdf, pdf to jpg, online pdf tools, free pdf converter",
    url: "https://om-pdf.netlify.app/",
  },

  merge: {
    title: "Merge PDF Online Free — OM PDF | No Upload Required",
    description: "Combine multiple PDF files into one. Drag to reorder pages, then merge instantly in your browser. 100% free, private, no upload.",
    keywords: "merge pdf, merge pdf online, combine pdf files, pdf merger tool, join pdf files, merge multiple pdf online free",
    url: "https://om-pdf.netlify.app/merge-pdf",
  },

  split: {
    title: "Split PDF Online Free — Extract Pages & Ranges | OM PDF",
    description: "Extract specific pages or split PDF into individual files. Works offline, no upload needed, completely free and instant.",
    keywords: "split pdf, split pdf online, extract pdf pages, pdf splitter tool, separate pdf pages, free pdf splitter online",
    url: "https://om-pdf.netlify.app/split-pdf",
  },

  compress: {
    title: "Compress PDF Online Free — Reduce File Size | OM PDF",
    description: "Shrink PDF files to smaller sizes while maintaining quality. Instant compression, no upload, 100% private and free.",
    keywords: "compress pdf, compress pdf online, reduce pdf file size, pdf compressor tool, compress pdf free online, shrink pdf",
    url: "https://om-pdf.netlify.app/compress-pdf",
  },

  rotate: {
    title: "Rotate PDF Pages Online Free — OM PDF | No Login Required",
    description: "Rotate PDF pages 90°, 180°, or 270° instantly. Fix orientation, no upload needed, completely free and private.",
    keywords: "rotate pdf, rotate pdf pages, rotate pdf online, fix pdf orientation, pdf rotation tool, flip pdf pages",
    url: "https://om-pdf.netlify.app/rotate-pdf",
  },

  convert: {
    title: "Convert PDF to JPG, PNG & Images Online Free | OM PDF",
    description: "Convert PDF to JPG, PNG or convert images to PDF instantly. High quality output, no upload, completely free.",
    keywords: "convert pdf to jpg, pdf to image converter, convert pdf to png, image to pdf, pdf conversion tool, pdf to jpg online free",
    url: "https://om-pdf.netlify.app/convert-pdf",
  },

  imageToPdf: {
    title: "Image to PDF Converter Online Free | OM PDF | No Upload",
    description: "Convert images (JPG, PNG) to PDF. Arrange multiple images, instant conversion, 100% free and private.",
    keywords: "image to pdf, jpg to pdf converter, convert image to pdf, png to pdf, batch image to pdf, image to pdf online free",
    url: "https://om-pdf.netlify.app/image-to-pdf",
  },

  organize: {
    title: "Organize PDF Pages Online Free — Reorder & Edit | OM PDF",
    description: "Rearrange, delete, or reorder PDF pages. Add new pages, save instantly, no upload required, completely free.",
    keywords: "organize pdf pages, rearrange pdf pages, reorder pdf, edit pdf pages, delete pdf pages, pdf page editor online",
    url: "https://om-pdf.netlify.app/organize-pdf",
  },

  watermark: {
    title: "Add Watermark to PDF Online Free — OM PDF | Text & Images",
    description: "Add text or image watermarks to PDF. Protect documents, customize positioning, instant processing, 100% free.",
    keywords: "watermark pdf, add watermark to pdf, pdf watermark tool, text watermark pdf, image watermark pdf, pdf watermarking tool",
    url: "https://om-pdf.netlify.app/watermark-pdf",
  },

  crop: {
    title: "Crop PDF Pages Online Free — Trim Margins | OM PDF",
    description: "Crop and trim PDF pages, remove margins instantly. Adjust page size, no upload, completely free and private.",
    keywords: "crop pdf, crop pdf pages, pdf cropper tool, trim pdf margins, resize pdf pages, crop pdf online free",
    url: "https://om-pdf.netlify.app/crop-pdf",
  },

  pageNumbers: {
    title: "Add Page Numbers to PDF Online Free | OM PDF | No Upload",
    description: "Insert page numbers with custom formatting. Add numbering, totals, and customize placement, completely free.",
    keywords: "add page numbers pdf, page numbers tool, pdf page numbering, insert page numbers pdf, number pdf pages, free page numbers",
    url: "https://om-pdf.netlify.app/page-numbers",
  },

  metadata: {
    title: "PDF Metadata Editor Online Free — View & Edit Properties | OM PDF",
    description: "View and edit PDF metadata (title, author, subject, keywords). No upload, instant editing, 100% private.",
    keywords: "pdf metadata editor, edit pdf metadata, view pdf properties, pdf title editor, change pdf metadata, pdf metadata tool",
    url: "https://om-pdf.netlify.app/metadata-editor",
  },

  pdfToText: {
    title: "Extract Text from PDF Online Free | PDF to Text Converter | OM PDF",
    description: "Extract all text content from PDF instantly. Copy text, no upload needed, 100% accurate and private.",
    keywords: "extract text from pdf, pdf to text converter, extract pdf text, copy text from pdf, text extraction tool, pdf text extractor",
    url: "https://om-pdf.netlify.app/pdf-to-text",
  },

  protect: {
    title: "Encrypt PDF with Password Online Free | OM PDF | AES-256",
    description: "Secure PDF with strong password encryption (AES-256). Restrict printing, copying, editing instantly and free.",
    keywords: "encrypt pdf, password protect pdf, secure pdf, password protect pdf online, pdf encryption tool, protect pdf with password",
    url: "https://om-pdf.netlify.app/protect-pdf",
  },

  unlock: {
    title: "Unlock PDF Online Free — Remove Password | OM PDF | Instant",
    description: "Remove password protection and decrypt PDF instantly. No upload, completely free, works with any encrypted PDF.",
    keywords: "unlock pdf, remove pdf password, decrypt pdf, unlock password protected pdf, pdf password remover, remove encryption from pdf",
    url: "https://om-pdf.netlify.app/unlock-pdf",
  },

  permissions: {
    title: "PDF Permissions Editor Online Free | Control Printing & Copying | OM PDF",
    description: "Set or remove PDF printing, copying, and editing restrictions. Instant control, no upload, completely private.",
    keywords: "pdf permissions, set pdf permissions, remove pdf restrictions, pdf permission restrictions, disable pdf restrictions, pdf security",
    url: "https://om-pdf.netlify.app/pdf-permissions",
  },

  myFiles: {
    title: "My Files — Secure Cloud Storage for Your PDFs | OM PDF",
    description: "Access your recent PDF files securely. Private cloud storage with Google Drive sync, encrypted and protected.",
    keywords: "pdf storage, secure file storage, google drive pdf, cloud pdf storage, recent files, pdf backup",
    url: "https://om-pdf.netlify.app/my-files",
  },
};

/**
 * Helper function to get SEO metadata for a tool page
 * @param {string} toolKey - The key from tools.js (e.g., 'merge', 'split')
 * @returns {object} SEO metadata object with title, description, keywords, url
 */
export function getSeoMetadata(toolKey) {
  const key = toolKey.toLowerCase().replace(/-/g, '');
  
  // Map tool keys to metadata keys
  const keyMap = {
    'merge': 'merge',
    'split': 'split',
    'compress': 'compress',
    'rotate': 'rotate',
    'convert': 'convert',
    'imagetopdf': 'imageToPdf',
    'imagetodf': 'imageToPdf',
    'organize': 'organize',
    'watermark': 'watermark',
    'crop': 'crop',
    'pagenumbers': 'pageNumbers',
    'metadata': 'metadata',
    'pdftotext': 'pdfToText',
    'protect': 'protect',
    'unlock': 'unlock',
    'permissions': 'permissions',
    'myfiles': 'myFiles',
  };

  const metadataKey = keyMap[key] || toolKey;
  return SEO_METADATA[metadataKey] || SEO_METADATA.home;
}
