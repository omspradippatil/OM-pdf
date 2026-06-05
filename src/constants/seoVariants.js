const BASE_URL = "https://om-pdf.pages.dev";

export const TOOL_VARIANTS = {
  merge: [
    "merge-pdf-online",
    "merge-pdf-free",
    "merge-pdf-without-upload",
    "merge-pdf-browser",
    "merge-pdf-private",
  ],
  split: [
    "split-pdf-online",
    "split-pdf-free",
    "extract-pdf-pages",
    "split-pdf-by-pages",
    "split-pdf-without-upload",
  ],
  compress: [
    "compress-pdf-online",
    "compress-pdf-free",
    "reduce-pdf-size",
    "shrink-pdf",
    "compress-pdf-without-upload",
  ],
  rotate: [
    "rotate-pdf-online",
    "rotate-pdf-90",
    "rotate-pdf-180",
    "rotate-pdf-270",
    "rotate-pdf-pages",
  ],
  convert: [
    "pdf-to-png",
    "pdf-to-image",
    "convert-pdf-online",
    "convert-pdf-free",
  ],
  pageNumbers: [
    "add-page-numbers-to-pdf",
    "pdf-page-numbers",
    "number-pdf-pages",
    "add-pdf-page-numbers",
    "page-numbers-pdf",
  ],
};

export const VARIANT_METADATA = {
  "/merge-pdf-online": {
    title: "Merge PDF Online - Free Browser Merge",
    description: "Merge PDF files online without uploads. Fast, private, and runs entirely in your browser.",
    keywords: "merge pdf online, merge pdf in browser, merge pdf free, combine pdf online",
  },
  "/merge-pdf-free": {
    title: "Merge PDF Free - Combine Files Instantly",
    description: "Combine multiple PDFs for free. No sign-up, no upload, and no watermarks.",
    keywords: "merge pdf free, free pdf merger, combine pdf free, join pdf files free",
  },
  "/merge-pdf-without-upload": {
    title: "Merge PDF Without Upload - Local Tool",
    description: "Merge PDFs locally without uploading to any server. Private and instant.",
    keywords: "merge pdf without upload, local pdf merge, private pdf merger, offline pdf merge",
  },
  "/merge-pdf-browser": {
    title: "Merge PDF in Browser - No Server Processing",
    description: "Browser-based PDF merge with zero server processing. Keep your files private.",
    keywords: "merge pdf in browser, browser pdf merger, merge pdf locally, no server pdf tool",
  },
  "/merge-pdf-private": {
    title: "Private PDF Merger - Files Stay on Your Device",
    description: "Private PDF merging where files never leave your device. Fast and secure.",
    keywords: "private pdf merger, secure pdf merge, merge pdf private, local pdf tools",
  },

  "/split-pdf-online": {
    title: "Split PDF Online - Extract Pages Fast",
    description: "Split PDFs online without uploads. Extract pages quickly and securely.",
    keywords: "split pdf online, extract pdf pages, split pdf free, pdf splitter online",
  },
  "/split-pdf-free": {
    title: "Split PDF Free - Separate Pages Instantly",
    description: "Split PDF files for free. Separate pages with no signup or uploads.",
    keywords: "split pdf free, free pdf splitter, separate pdf pages, split pdf no upload",
  },
  "/extract-pdf-pages": {
    title: "Extract PDF Pages - Save Only What You Need",
    description: "Extract specific pages from a PDF locally in your browser. Fast and private.",
    keywords: "extract pdf pages, save pdf pages, pdf page extractor, split pdf pages",
  },
  "/split-pdf-by-pages": {
    title: "Split PDF by Pages - One File per Page",
    description: "Split PDFs into single-page files with local processing and zero uploads.",
    keywords: "split pdf by pages, one page pdf, split pdf into pages, pdf page splitter",
  },
  "/split-pdf-without-upload": {
    title: "Split PDF Without Upload - Local Splitter",
    description: "Split PDFs locally without uploading to any server. Private and instant.",
    keywords: "split pdf without upload, local pdf splitter, private pdf split, offline pdf split",
  },

  "/compress-pdf-online": {
    title: "Compress PDF Online - Reduce File Size",
    description: "Compress PDFs online without uploads. Reduce file size locally in seconds.",
    keywords: "compress pdf online, reduce pdf size, pdf compressor online, shrink pdf online",
  },
  "/compress-pdf-free": {
    title: "Compress PDF Free - Smaller Files Fast",
    description: "Reduce PDF file size for free. No signup, no uploads, no watermarks.",
    keywords: "compress pdf free, free pdf compressor, reduce pdf size free, shrink pdf free",
  },
  "/reduce-pdf-size": {
    title: "Reduce PDF Size - Keep Quality",
    description: "Shrink PDFs while keeping good quality. Fast local compression.",
    keywords: "reduce pdf size, shrink pdf, compress pdf size, pdf size reducer",
  },
  "/shrink-pdf": {
    title: "Shrink PDF - Fast Local Compression",
    description: "Shrink PDF files locally without uploading. Safe, fast, and private.",
    keywords: "shrink pdf, compress pdf locally, reduce pdf weight, pdf shrinker",
  },
  "/compress-pdf-without-upload": {
    title: "Compress PDF Without Upload - Private Tool",
    description: "Compress PDFs without uploading to any server. Local, fast, private.",
    keywords: "compress pdf without upload, private pdf compressor, local pdf compression, offline pdf compress",
  },

  "/rotate-pdf-online": {
    title: "Rotate PDF Online - Fix Orientation",
    description: "Rotate PDF pages online without uploads. Fast and private rotation.",
    keywords: "rotate pdf online, rotate pdf pages, fix pdf orientation, pdf rotation tool",
  },
  "/rotate-pdf-90": {
    title: "Rotate PDF 90 Degrees - Quick Fix",
    description: "Rotate PDFs by 90 degrees locally in your browser. No uploads needed.",
    keywords: "rotate pdf 90, rotate pdf 90 degrees, flip pdf 90, rotate pdf local",
  },
  "/rotate-pdf-180": {
    title: "Rotate PDF 180 Degrees - Instant",
    description: "Rotate PDFs by 180 degrees locally. No upload, no signup.",
    keywords: "rotate pdf 180, rotate pdf 180 degrees, flip pdf 180, rotate pdf free",
  },
  "/rotate-pdf-270": {
    title: "Rotate PDF 270 Degrees - Fast",
    description: "Rotate PDFs by 270 degrees in your browser. Fast and private.",
    keywords: "rotate pdf 270, rotate pdf 270 degrees, flip pdf 270, pdf rotate tool",
  },
  "/rotate-pdf-pages": {
    title: "Rotate PDF Pages - Full Document",
    description: "Rotate all pages in a PDF with local processing and zero uploads.",
    keywords: "rotate pdf pages, rotate all pdf pages, pdf page rotation, rotate pdf file",
  },

  "/pdf-to-png": {
    title: "PDF to PNG - High Quality Images",
    description: "Convert PDF pages to PNG images locally in your browser. Fast and private.",
    keywords: "pdf to png, convert pdf to png, pdf to png online, pdf image export",
  },
  "/pdf-to-image": {
    title: "PDF to Image - Export Pages Locally",
    description: "Export PDF pages as images with local processing. No upload needed.",
    keywords: "pdf to image, convert pdf to image, pdf image export, pdf page to image",
  },
  "/convert-pdf-online": {
    title: "Convert PDF Online - Fast Local Converter",
    description: "Convert PDFs to images or images to PDF in your browser. No server uploads.",
    keywords: "convert pdf online, pdf converter online, convert pdf locally, browser pdf converter",
  },
  "/convert-pdf-free": {
    title: "Convert PDF Free - No Signup Converter",
    description: "Free PDF conversion with no signup or uploads. Local processing.",
    keywords: "convert pdf free, free pdf converter, pdf to image free, pdf convert free",
  },

  "/add-page-numbers-to-pdf": {
    title: "Add Page Numbers to PDF - Free Tool",
    description: "Add page numbers to any PDF for free. Custom positions and styles.",
    keywords: "add page numbers to pdf, pdf page numbers, page numbering tool, number pdf pages",
  },
  "/pdf-page-numbers": {
    title: "PDF Page Numbers - Insert Numbers Easily",
    description: "Insert page numbers into a PDF with custom layout and styles.",
    keywords: "pdf page numbers, insert page numbers pdf, pdf numbering tool, page numbers pdf",
  },
  "/number-pdf-pages": {
    title: "Number PDF Pages - Custom Styles",
    description: "Number PDF pages with custom font, size, and placement.",
    keywords: "number pdf pages, pdf numbering, add page numbers pdf, pdf page numbering",
  },
  "/add-pdf-page-numbers": {
    title: "Add PDF Page Numbers - Fast and Private",
    description: "Add page numbers to PDFs locally without uploads. Fast and secure.",
    keywords: "add pdf page numbers, page numbering pdf, pdf page number tool, add page numbers free",
  },
  "/page-numbers-pdf": {
    title: "Page Numbers PDF - Stamp Pages",
    description: "Stamp page numbers on PDFs instantly with local processing.",
    keywords: "page numbers pdf, stamp pdf pages, pdf page numbers tool, page numbering",
  },
};

export function getVariantMeta(pathname) {
  const meta = VARIANT_METADATA[pathname];
  if (!meta) return null;
  return { ...meta, url: `${BASE_URL}${pathname}` };
}

export function getVariantRoutes() {
  return Object.entries(TOOL_VARIANTS).flatMap(([toolKey, slugs]) =>
    slugs.map((slug) => ({ toolKey, path: `/${slug}` }))
  );
}
