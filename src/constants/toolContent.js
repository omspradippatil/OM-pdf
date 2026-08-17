// src/constants/toolContent.js — Comprehensive SEO & Editorial Content for All OM PDF Tools

export const TOOL_CONTENT = {
  mergeRanges: {
    name: "Merge PDF with Ranges",
    headline: "Combine Selected Page Ranges from Multiple PDFs Locally & Securely",
    description: "Merge with Ranges allows you to cherry-pick specific pages or page intervals from multiple PDF documents and combine them into a single, cohesive PDF file. Unlike standard merge tools that require you to join entire documents or manually extract pages in separate steps, this browser-based utility allows you to configure custom page ranges (e.g. 1-5, 8, 12-16) per file, reorder the files, and merge them all in a single click with zero server uploads.",
    syntaxGuide: {
      title: "Page Range Syntax Guide",
      examples: [
        { syntax: "1-5", desc: "Extracts and merges pages 1 through 5 inclusively." },
        { syntax: "1, 3, 7", desc: "Extracts specific individual pages 1, 3, and 7." },
        { syntax: "1-3, 5, 8-12", desc: "Combines a mix of ranges and individual pages." },
        { syntax: "4-", desc: "Selects from page 4 to the end of the document." },
      ],
      tip: "You can drag and reorder documents in the workspace list before merging to control the final sequence in the output file."
    },
    howTo: [
      { title: "Select or Drop PDF Files", text: "Drag and drop your PDF documents into the workspace or click to browse files from your computer or mobile device." },
      { title: "Enter Desired Page Ranges", text: "For each uploaded PDF, type the specific page numbers or ranges (e.g., '1-4, 8, 11-15') you want included in the final output." },
      { title: "Reorder File Sequence", text: "Use the Up and Down buttons to adjust the order in which each document's selected pages will appear in the merged output." },
      { title: "Merge & Download Instantly", text: "Click 'Merge Selected Pages'. The files are processed entirely in browser memory and download immediately." }
    ],
    useCases: [
      { title: "Legal Bundles & Court Exhibits", text: "Compile specific marked exhibits and signature pages from multiple case documents into a single indexed filing without exposing sensitive client data." },
      { title: "Executive Summaries & Reports", text: "Extract the executive summary and financial tables from multiple quarterly department reports to build a clean board deck." },
      { title: "Contract Schedule Assembly", text: "Merge the main contract body with selected schedules and appendix pages from third-party vendor documents." },
      { title: "Academic & Study Packs", text: "Assemble reading packs for courses by selecting relevant textbook chapters and research article excerpts." }
    ],
    sections: [
      {
        title: "Surgical Page Precision Without Pre-Splitting",
        body: "Traditional workflows force you to split PDFs first, save intermediate files to your desktop, and then merge the snippets together. OM PDF's Merge with Ranges eliminates the intermediate hassle by applying range filters directly during the merge pipeline."
      },
      {
        title: "100% Client-Side WebAssembly & Memory Processing",
        body: "Your sensitive contracts, financial records, and medical files never leave your computer. Processing is executed in your browser's local sandbox using WebAssembly and PDF-Lib, ensuring zero server latency and total compliance with GDPR, HIPAA, and corporate data policies."
      },
      {
        title: "Lossless Vector & Font Preservation",
        body: "All vector graphics, embedded typography, color spaces, and high-resolution imagery are transferred directly to the new PDF without recompression artifacts or quality degradation."
      },
      {
        title: "Intuitive Drag-and-Drop Workspace",
        body: "Visual thumbnail previews allow you to confirm each document before setting page intervals. Move files up or down freely to achieve the exact page sequence your project requires."
      }
    ],
    faqs: [
      { q: "How do I specify multiple page ranges for a single PDF?", a: "Separate your page numbers and ranges using commas and hyphens. For example, typing '1-3, 7, 10-12' extracts pages 1, 2, 3, 7, 10, 11, and 12 from that specific document." },
      { q: "Are my documents uploaded to an external server?", a: "No. OM PDF operates on a strict zero-upload architecture. All parsing, slicing, and merging occurs locally inside your web browser using WebAssembly. Your files never touch a remote server." },
      { q: "What happens if I enter an invalid page number?", a: "The tool automatically validates your input against the total page count of each document and alerts you to adjust any out-of-bounds numbers before initiating the merge." },
      { q: "Will bookmarks and interactive links be retained?", a: "Extracted pages retain their internal graphical objects, text streams, and vector styling. Because page numbering shifts during custom range merging, table-of-contents links are cleanly normalized." },
      { q: "Is there a limit on the number of PDFs or file size?", a: "There is no server-imposed limit. You can merge as many files as your device's browser memory supports, typically handling documents up to hundreds of megabytes with ease." },
      { q: "Is OM PDF Merge with Ranges completely free?", a: "Yes. OM PDF is 100% free with no sign-up, no subscriptions, no daily limits, and zero watermarks on your generated documents." },
      { q: "Can I save my merged PDF directly to Google Drive?", a: "Yes. After the merge completes, you can click 'Save to Drive' to upload the resulting document straight to your personal Google Drive storage." },
      { q: "Does this tool work offline?", a: "Yes! Once the OM PDF web app is loaded in your browser or installed as a Progressive Web App (PWA), you can merge PDFs with ranges even when disconnected from the internet." }
    ]
  },

  merge: {
    name: "Merge PDF",
    headline: "Merge Multiple PDF Files Online for Free in Seconds",
    description: "Combine multiple PDF documents into a single organized file in seconds. Drag and drop files, reorder pages intuitively, and merge them with zero uploads and complete privacy.",
    howTo: [
      { title: "Upload Files", text: "Drag and drop two or more PDF files into the tool or browse from your device." },
      { title: "Arrange Order", text: "Drag thumbnails to arrange files in the exact sequence you want them to appear." },
      { title: "Merge Instantly", text: "Click 'Merge PDF' to combine documents locally and download your new merged file." }
    ],
    sections: [
      {
        title: "Lightning Fast Browser-Based Merging",
        body: "Merging happens instantly using local browser memory. Avoid waiting for slow cloud uploads and server rendering queues."
      },
      {
        title: "Zero-Upload Privacy Guarantee",
        body: "Your files never leave your computer or phone. Perfect for confidential contracts, financial records, and private documents."
      },
      {
        title: "Lossless Output Quality",
        body: "All vector graphics, embedded fonts, and high-resolution images are preserved with pristine fidelity."
      },
      {
        title: "Cross-Device & Offline Support",
        body: "Works seamlessly on Chrome, Safari, Firefox, Edge, iPhone, Android, and desktop operating systems."
      }
    ],
    faqs: [
      { q: "Is merging PDFs free?", a: "Yes. OM PDF merges files for free with no sign-up, no hidden fees, and no watermarks." },
      { q: "Do my files get uploaded to a server?", a: "No. Merging happens entirely inside your browser sandbox. Files never leave your local device." },
      { q: "Can I reorder pages before merging?", a: "Yes. Drag and drop document cards or thumbnails to arrange the exact page sequence before merging." },
      { q: "Is there a file size limit?", a: "There is no server limit. You can merge large documents up to several hundred megabytes depending on your device's memory." },
      { q: "Will the merged PDF keep its original quality?", a: "Yes. Text clarity, vector graphics, and image resolutions are preserved without re-compression." },
      { q: "Can I use OM PDF offline?", a: "Yes. OM PDF works offline as an installable PWA once loaded in your browser." }
    ]
  },

  split: {
    name: "Split PDF",
    headline: "Split PDF Pages and Extract Custom Ranges Instantly",
    description: "Easily extract specific pages, separate page ranges, or split a large PDF into individual single-page documents with 100% local privacy.",
    howTo: [
      { title: "Select PDF", text: "Upload the PDF document you want to divide or extract pages from." },
      { title: "Choose Split Method", text: "Select range extraction (e.g. 1-5, 8), split every N pages, or split into single pages." },
      { title: "Download Result", text: "Click 'Split PDF' to generate the new files and download them individually or as a ZIP." }
    ],
    sections: [
      {
        title: "Flexible Split Options",
        body: "Extract custom ranges, split every N pages, or split every single page into separate files with custom naming."
      },
      {
        title: "Private & Local Processing",
        body: "Split sensitive documents safely on your device without sending a single byte to an external server."
      },
      {
        title: "Instant Processing",
        body: "Save time with instantaneous local PDF extraction that bypasses upload and download queues."
      },
      {
        title: "Zero Quality Degradation",
        body: "Pages are extracted directly from the underlying PDF document stream without rasterization or downsampling."
      }
    ],
    faqs: [
      { q: "Can I split a PDF by custom page ranges?", a: "Yes. You can enter arbitrary ranges such as '1-3, 5, 7-10' to extract only the pages you need." },
      { q: "Does splitting PDFs work offline?", a: "Yes. Once the web application loads, splitting runs entirely offline on your device." },
      { q: "Will splitting reduce the quality of my PDF?", a: "No. Extracted pages maintain the original fonts, vector artwork, and image resolution." },
      { q: "Can I split a PDF into separate single-page files?", a: "Yes. Select the 'Single Pages' split mode to generate a dedicated PDF for each page." },
      { q: "Are my files stored anywhere on the web?", a: "Never. OM PDF has no document servers; everything happens inside your browser." }
    ]
  },

  splitBySize: {
    name: "Split PDF by Size",
    headline: "Split Large PDF Documents by Maximum File Size (MB)",
    description: "Automatically divide oversized PDF files into smaller chunks that comply with email attachment limits (e.g. 10MB or 25MB) or portal upload constraints without losing document quality.",
    howTo: [
      { title: "Upload PDF", text: "Select the large PDF file you need to partition." },
      { title: "Set Max Size", text: "Specify the target maximum size per chunk (e.g., 5 MB, 10 MB, or 25 MB)." },
      { title: "Generate Parts", text: "Click 'Split by Size' to automatically calculate page boundaries and download the split parts." }
    ],
    sections: [
      {
        title: "Intelligent Size Boundary Calculation",
        body: "OM PDF dynamically inspects page byte sizes to create balanced parts that fit under your specified size threshold."
      },
      {
        title: "Ideal for Email Attachments",
        body: "Easily comply with Gmail (25MB), Outlook (20MB), and corporate firewall attachment limits."
      },
      {
        title: "Zero Cloud Uploads",
        body: "Even large multi-hundred megabyte PDFs are divided entirely in browser memory for absolute privacy."
      },
      {
        title: "Batch Download as ZIP",
        body: "Download all resulting partition files in a single organized ZIP package or individually."
      }
    ],
    faqs: [
      { q: "How does splitting by size work?", a: "The tool measures the byte size of each page stream and groups sequential pages into parts that remain under your target megabyte limit." },
      { q: "Can a single large page exceed the limit?", a: "If a single page exceeds the target limit on its own, it will be placed in its own part at its minimum viable size." },
      { q: "Are files compressed during split by size?", a: "No, splitting by size preserves original quality without recompression unless you choose to compress them separately." },
      { q: "Is this tool free with no limits?", a: "Yes, you can split unlimited files of any size for free." }
    ]
  },

  compress: {
    name: "Compress PDF",
    headline: "Reduce PDF File Size Online While Maintaining High Quality",
    description: "Shrink large PDF documents into compact files ready for email, messaging, or web uploads. Enjoy intelligent image optimization and font subsetting completely in your browser.",
    howTo: [
      { title: "Select PDF", text: "Choose or drop the PDF file you want to compress." },
      { title: "Select Compression Level", text: "Pick from Recommended, High, or Extreme compression settings based on your clarity requirements." },
      { title: "Download Compressed PDF", text: "Click 'Compress PDF' and download your optimized document with reduced megabytes." }
    ],
    sections: [
      {
        title: "Smart Size Reduction",
        body: "Balances image downsampling, vector cleanup, and metadata stripping to dramatically shrink file size while keeping text sharp."
      },
      {
        title: "Privacy First",
        body: "Unlike other online compressors that send your financial reports or passports to cloud servers, OM PDF compresses 100% on your device."
      },
      {
        title: "Instant Visual Size Comparison",
        body: "View the exact original vs. compressed size and the percentage of saved storage immediately after processing."
      },
      {
        title: "Fast Local Processing",
        body: "Optimized WebAssembly algorithms finish compression in seconds without upload wait times."
      }
    ],
    faqs: [
      { q: "Is PDF compression free on OM PDF?", a: "Yes, 100% free with no sign-up, no subscriptions, and no file limits." },
      { q: "Will compression make text blurry?", a: "No. Vector text remains crystal clear; compression primarily optimizes embedded high-DPI imagery and unused metadata." },
      { q: "How much can I reduce my PDF size?", a: "Most PDFs with images can be reduced by 40% to 85% depending on original asset resolution." },
      { q: "Are my documents secure during compression?", a: "Yes, files never leave your device because compression runs locally in your browser." }
    ]
  },

  rotate: {
    name: "Rotate PDF",
    headline: "Rotate PDF Pages 90, 180, or 270 Degrees Online Free",
    description: "Permanently rotate individual pages or entire PDF documents to correct upside-down scans and sideways orientation. Quick, private, and instant.",
    howTo: [
      { title: "Upload PDF", text: "Select the PDF with pages that need orientation correction." },
      { title: "Rotate Pages", text: "Rotate all pages simultaneously or click individual page cards to turn them 90°, 180°, or 270°." },
      { title: "Save & Download", text: "Click 'Apply Rotation' to download your properly oriented PDF file." }
    ],
    sections: [
      {
        title: "Individual & Bulk Rotation",
        body: "Rotate all pages at once or fine-tune specific pages independently with responsive interactive controls."
      },
      {
        title: "Permanent Angle Fixing",
        body: "Updates the underlying PDF rotation metadata so pages display correctly in all PDF viewers, printers, and mobile devices."
      },
      {
        title: "Client-Side Processing",
        body: "Rotate files safely without sending sensitive documents to third-party web servers."
      },
      {
        title: "Original Quality Preserved",
        body: "Only the page orientation matrix is updated, preserving 100% of original vector and image clarity."
      }
    ],
    faqs: [
      { q: "Can I rotate specific pages instead of the whole file?", a: "Yes, you can rotate individual pages independently or apply rotation sitewide." },
      { q: "Will the rotation stay when I print or email the PDF?", a: "Yes, the rotation is permanently encoded into the PDF document structure." },
      { q: "Is there any cost to rotate PDFs?", a: "No, OM PDF Rotate is completely free with no registration." }
    ]
  },

  convert: {
    name: "Convert PDF",
    headline: "Convert PDF to High-Resolution Images & Formats",
    description: "Convert PDF pages to JPG, PNG, and WebP images with custom resolution DPI, or convert images into structured PDF documents in your browser.",
    howTo: [
      { title: "Upload Document", text: "Select the PDF file you wish to convert." },
      { title: "Choose Format & Quality", text: "Select target image format (PNG/JPG) and resolution scale (1x, 2x, 3x)." },
      { title: "Export Images", text: "Download converted images individually or as a single ZIP archive." }
    ],
    sections: [
      { title: "High-DPI Rendering", body: "Render PDF pages at up to 300+ DPI for crisp, publication-ready images." },
      { title: "Private Conversion", body: "All rasterization executes on your GPU/CPU locally without remote uploads." },
      { title: "Flexible Export Formats", body: "Export to PNG for lossless transparency or JPG for compact web sharing." },
      { title: "Batch Page Processing", body: "Convert multi-hundred page documents efficiently with live progress updates." }
    ],
    faqs: [
      { q: "What formats can I convert PDF to?", a: "You can convert PDF pages to JPG, PNG, WebP, Word (DOCX), and PowerPoint (PPTX)." },
      { q: "Are converted images high quality?", a: "Yes, you can choose custom rendering scales up to 3x (300 DPI) for razor-sharp typography and charts." },
      { q: "Is conversion private?", a: "Yes, conversion runs 100% client-side in your web browser." }
    ]
  },

  pdfToWord: {
    name: "PDF to Word Converter",
    headline: "Convert PDF Documents to Editable Microsoft Word (DOCX) Free",
    description: "Extract text, headings, and formatting from PDF files into editable Microsoft Word (.docx) documents. Fast, secure, and runs directly on your computer.",
    howTo: [
      { title: "Select PDF", text: "Upload the PDF document you need to convert into an editable Word file." },
      { title: "Process Text", text: "The client-side parser analyzes paragraphs, font styles, and layout elements." },
      { title: "Download DOCX", text: "Download your clean Microsoft Word document ready for editing in Word, Google Docs, or LibreOffice." }
    ],
    sections: [
      { title: "Editable DOCX Output", body: "Generates genuine Microsoft Word format compatible with Office 365, Google Docs, and Apple Pages." },
      { title: "Zero Data Leakage", body: "Document text is parsed locally in your browser so confidential business files remain secure." },
      { title: "Paragraph & Heading Detection", body: "Preserves natural reading flow, lists, and line breaks for straightforward editing." },
      { title: "Completely Free", body: "No paywalls, trial periods, or page limits on Word conversions." }
    ],
    faqs: [
      { q: "Can I edit the converted file in Microsoft Word?", a: "Yes, the downloaded file is a standard .docx format that opens seamlessly in Word and Google Docs." },
      { q: "Does PDF to Word require server upload?", a: "No, OM PDF extracts text and builds the DOCX binary locally inside your browser." },
      { q: "Does it work with scanned PDFs?", a: "For scanned documents without embedded text, use our Offline OCR tool first to make text selectable." }
    ]
  },

  pdfToJpg: {
    name: "PDF to JPG (Advanced)",
    headline: "Convert PDF Pages to JPG with Custom DPI & Quality Control",
    description: "High-precision PDF to JPG conversion with granular control over DPI scaling, JPEG compression quality, and custom page range selection.",
    howTo: [
      { title: "Upload PDF", text: "Select your document." },
      { title: "Adjust Settings", text: "Set output DPI, JPG quality slider (1-100%), and select specific pages to convert." },
      { title: "Download Images", text: "Save the resulting JPG images directly to your device." }
    ],
    sections: [
      { title: "Granular Quality Slider", body: "Tune image compression from lightweight previews to ultra-high-definition exports." },
      { title: "Custom Page Filtering", body: "Convert only the pages you need rather than the whole document." },
      { title: "Zero Server Uploads", body: "Rendered locally using PDF.js and Canvas APIs for instant results and maximum privacy." },
      { title: "ZIP Packaging", body: "Multi-page conversions are neatly bundled into a single ZIP file for 1-click download." }
    ],
    faqs: [
      { q: "Can I choose the output image quality?", a: "Yes, adjust the quality slider to balance file size and visual fidelity." },
      { q: "Can I convert just page 1 as a thumbnail?", a: "Yes, enter '1' in the page range input to convert only the cover page." },
      { q: "Is PDF to JPG free?", a: "Yes, 100% free with no watermark." }
    ]
  },

  pdfToLongImage: {
    name: "PDF to Long Image",
    headline: "Stitch PDF Pages into a Single Continuous Tall Image",
    description: "Merge multiple PDF pages into one seamless, vertically scrolling long image (JPG or PNG). Perfect for sharing presentations, mobile reading, infographics, and social feeds.",
    howTo: [
      { title: "Upload PDF", text: "Choose the multi-page PDF you want to stitch." },
      { title: "Configure Spacing & Format", text: "Set custom margin spacing between pages, background color, and output format." },
      { title: "Export Tall Image", text: "Click 'Generate Long Image' and save your vertically stitched graphic." }
    ],
    sections: [
      { title: "Seamless Vertical Stitching", body: "Combines sequential pages into a unified long graphic with customizable divider margins." },
      { title: "Mobile & Social Friendly", body: "Ideal for sharing document previews on messaging apps, Twitter/X, LinkedIn, and web portfolios." },
      { title: "High Resolution Canvas", body: "Renders crisp typography across lengthy documents without clipping." },
      { title: "Browser-Powered", body: "All canvas stitching happens in local memory for speed and privacy." }
    ],
    faqs: [
      { q: "What is a long image PDF?", a: "It stitches multiple pages vertically into one single image file so viewers can scroll smoothly." },
      { q: "Can I choose between JPG and PNG?", a: "Yes, select PNG for sharp graphic clarity or JPG for smaller image size." },
      { q: "Is there a limit on how many pages can be stitched?", a: "You can stitch dozens of pages depending on your browser canvas memory limits." }
    ]
  },

  extractImages: {
    name: "Extract Images from PDF",
    headline: "Extract All Embedded Photos & Graphics from PDF Online",
    description: "Pull all embedded JPEG, PNG, and raster images from a PDF file at their original native resolution with zero loss in quality.",
    howTo: [
      { title: "Upload PDF", text: "Select the PDF file containing the photos or graphics you want to extract." },
      { title: "Inspect Embedded Media", text: "The tool scans internal PDF streams to isolate all image assets." },
      { title: "Download Assets", text: "Download individual extracted photos or save all images in a ZIP archive." }
    ],
    sections: [
      { title: "Original Native Resolution", body: "Extracts original image streams directly from the PDF dictionary without re-rendering degradation." },
      { title: "No Screenshots Needed", body: "Avoid low-res screengrabs by grabbing the exact embedded assets." },
      { title: "Batch ZIP Export", body: "Quickly export dozens of photos from brochures, catalogs, and presentations in one click." },
      { title: "Private & Local", body: "All parsing happens client-side without transmitting files over the network." }
    ],
    faqs: [
      { q: "Does image extraction reduce quality?", a: "No. The images are extracted at the exact pixel dimensions and bitrate embedded in the PDF." },
      { q: "Can I extract images from scanned PDFs?", a: "Yes, scanned PDF pages are themselves embedded images and will be extracted cleanly." }
    ]
  },

  extractPages: {
    name: "Extract PDF Pages",
    headline: "Select and Save Specific Pages from Any PDF Document",
    description: "Select individual pages or custom ranges visually and export them into a brand-new standalone PDF document.",
    howTo: [
      { title: "Upload PDF", text: "Open the PDF document you want to extract from." },
      { title: "Select Pages", text: "Click on page thumbnails or enter range numbers (e.g. 2, 5-9) to choose pages." },
      { title: "Create New PDF", text: "Click 'Extract Pages' to download your clean new document." }
    ],
    sections: [
      { title: "Visual Thumbnail Selection", body: "Easily check and uncheck pages with responsive visual previews." },
      { title: "Lossless Extraction", body: "Pages are transferred into the new document structure without quality loss." },
      { title: "Instant & Private", body: "Fast local WebAssembly extraction ensures confidential files stay private." }
    ],
    faqs: [
      { q: "Can I reorder pages while extracting?", a: "Yes, you can specify the page sequence to reorder pages in the output document." },
      { q: "Is page extraction free?", a: "Yes, 100% free with no limits." }
    ]
  },

  insertBlank: {
    name: "Insert Blank Pages",
    headline: "Add Blank Pages Anywhere in Your PDF Document",
    description: "Insert empty pages before or after any page in your PDF. Match existing page dimensions automatically for clean printing, booklet layout, or note-taking.",
    howTo: [
      { title: "Upload PDF", text: "Select your PDF document." },
      { title: "Choose Insertion Points", text: "Specify which page positions need blank pages inserted." },
      { title: "Download Updated PDF", text: "Export the document with newly inserted pages seamlessly integrated." }
    ],
    sections: [
      { title: "Dimension Matching", body: "Inserted blank pages automatically match the exact width, height, and orientation of adjacent pages." },
      { title: "Great for Double-Sided Printing", body: "Ensure chapters start on odd-numbered right-hand pages for professional book printing." },
      { title: "Local Processing", body: "Insert pages in seconds with zero uploads and full data security." }
    ],
    faqs: [
      { q: "Will the blank page match my PDF page size?", a: "Yes, the tool copies the exact MediaBox dimensions of your document pages." }
    ]
  },

  removeEmpty: {
    name: "Remove Empty Pages",
    headline: "Detect and Delete Blank Pages from PDF Automatically",
    description: "Automatically scan your PDF for blank or whitespace-only pages and remove them in a single click. Ideal for cleaning up scanned document batches.",
    howTo: [
      { title: "Upload PDF", text: "Select your scanned or multi-page PDF." },
      { title: "Automatic Blank Detection", text: "The scanner analyzes pixel density and vector streams to highlight empty pages." },
      { title: "Remove & Save", text: "Confirm detected blank pages and download the cleaned document." }
    ],
    sections: [
      { title: "Smart Blank Detection", body: "Analyzes canvas pixel density and text streams to catch accidental blank scan pages." },
      { title: "Adjustable Threshold", body: "Tune sensitivity to ignore faint scanner dust or bleed-through marks." },
      { title: "Fast Document Cleanup", body: "Clean multi-hundred page scan batches in seconds without manual page-by-page deletion." }
    ],
    faqs: [
      { q: "How does it detect blank pages?", a: "It evaluates rendered pixel brightness and text presence across every page." }
    ]
  },

  splitBookmarks: {
    name: "Split by Bookmarks",
    headline: "Split PDF into Chapters and Sections Using Bookmarks",
    description: "Automatically divide a structured PDF into separate files based on document outline bookmarks and chapter headings.",
    howTo: [
      { title: "Upload PDF", text: "Select a PDF that contains bookmark outlines." },
      { title: "Select Bookmark Levels", text: "Choose which bookmark headings to split by." },
      { title: "Download Chapter Files", text: "Export chapters named automatically after their bookmark titles in a ZIP." }
    ],
    sections: [
      { title: "Automatic Chapter Naming", body: "Output files are automatically named using the title text of each bookmark." },
      { title: "Ideal for Ebooks & Manuals", body: "Effortlessly partition large technical manuals, textbooks, and reports by section." },
      { title: "Local & Private", body: "Bookmark parsing runs client-side with zero cloud uploads." }
    ],
    faqs: [
      { q: "What if my PDF does not have bookmarks?", a: "If your PDF lacks bookmarks, use our Split PDF or Split by Size tools to extract pages." }
    ]
  },

  autoRotate: {
    name: "Auto Rotate & Deskew",
    headline: "Auto-Fix PDF Page Orientation and Straighten Scans",
    description: "Automatically detect sideways or skewed pages and straighten them for professional reading and printing.",
    howTo: [
      { title: "Upload PDF", text: "Select your scanned or misaligned document." },
      { title: "Auto-Analyze", text: "The tool detects text orientation and deskew angles." },
      { title: "Apply Correction", text: "Download the straightened and properly rotated PDF." }
    ],
    sections: [
      { title: "Intelligent Text Orientation", body: "Identifies upside-down and sideways text lines to apply the proper 90/180/270 rotation." },
      { title: "Deskew Straightening", body: "Corrects subtle angles caused by crooked scanner feeders." },
      { title: "Local Processing", body: "Fast and private in-browser analysis." }
    ],
    faqs: [
      { q: "How does auto deskew work?", a: "It analyzes text baselines to calculate and counteract subtle slant angles." }
    ]
  },

  watermark: {
    name: "Watermark PDF",
    headline: "Add Custom Text or Image Watermarks to PDF Online",
    description: "Protect your intellectual property by applying customizable text stamps or logo watermarks across PDF pages with adjustable opacity, angle, and position.",
    howTo: [
      { title: "Upload PDF", text: "Select the document you wish to watermark." },
      { title: "Customize Watermark", text: "Enter custom text (e.g. 'CONFIDENTIAL', 'DRAFT') or upload a transparent PNG logo." },
      { title: "Set Position & Opacity", text: "Adjust rotation angle, font size, opacity, and positioning." },
      { title: "Apply & Download", text: "Download your protected watermarked PDF." }
    ],
    sections: [
      { title: "Text & Image Watermarking", body: "Support for custom typography stamps and company brand logos." },
      { title: "Opacity & Angle Controls", body: "Subtle translucent background watermarks that protect documents without obstructing readability." },
      { title: "Zero Upload Security", body: "Watermarking is stamped locally in browser memory." }
    ],
    faqs: [
      { q: "Can the watermark be removed easily?", a: "Watermarks are permanently rendered into the document content streams." },
      { q: "Can I watermark specific pages?", a: "Yes, you can apply watermarks to all pages, odd/even pages, or custom page ranges." }
    ]
  },

  crop: {
    name: "Crop PDF",
    headline: "Crop PDF Pages & Trim Margins Online Free",
    description: "Trim unwanted white margins, crop specific page sections, or standardize page dimensions across all pages with an interactive visual cropper.",
    howTo: [
      { title: "Upload PDF", text: "Select the PDF you want to crop." },
      { title: "Adjust Crop Box", text: "Drag the interactive bounding box over the content area you wish to keep." },
      { title: "Apply Crop", text: "Export the trimmed PDF with updated page boundaries." }
    ],
    sections: [
      { title: "Interactive Visual Cropping", body: "Drag handles to visually define exact crop margins with live pixel dimensions." },
      { title: "Batch Margin Trimming", body: "Apply crop boundaries to a single page or automatically across the entire document." },
      { title: "E-Reader Optimization", body: "Remove excessive white margins to make text larger and easier to read on Kindle and tablets." }
    ],
    faqs: [
      { q: "Does cropping reduce file size?", a: "Cropping adjusts the visible page viewbox, making pages cleaner and easier to read." }
    ]
  },

  pageNumbers: {
    name: "Add Page Numbers to PDF",
    headline: "Number PDF Pages with Custom Formatting & Placement",
    description: "Insert sequential page numbers, totals (e.g. 'Page X of Y'), and custom headers/footers with complete control over font, size, color, and positioning.",
    howTo: [
      { title: "Upload PDF", text: "Select the PDF that needs page numbering." },
      { title: "Configure Numbering Format", text: "Choose position (top/bottom, left/center/right), number format (e.g. 'Page 1 of 10'), and font style." },
      { title: "Apply Numbers", text: "Stamp page numbers instantly and download your document." }
    ],
    sections: [
      { title: "Custom Number Formats", body: "Support for standard numbers (1, 2, 3), Roman numerals (i, ii, iii), and 'Page X of Y' patterns." },
      { title: "Custom Start Page & Range", body: "Skip cover pages or table-of-contents by starting numbering from any specified page." },
      { title: "Precise Placement", body: "Position numbers in headers, footers, margins, or corners with exact pixel offsets." }
    ],
    faqs: [
      { q: "Can I skip the first page when adding numbers?", a: "Yes, you can set the starting page offset so cover pages remain clean." },
      { q: "Can I customize the font and color?", a: "Yes, select font family, size, color, and margins to match your document design." }
    ]
  },

  grayscale: {
    name: "Grayscale PDF",
    headline: "Convert Color PDF to Black and White (Grayscale) Free",
    description: "Convert color PDFs to clean monochrome black and white for smaller file sizes, faster printing, and reduced ink costs.",
    howTo: [
      { title: "Upload PDF", text: "Select your color PDF document." },
      { title: "Convert to Grayscale", text: "Click 'Convert to Grayscale' to transform all color spaces to monochrome." },
      { title: "Download Monochrome PDF", text: "Save the black and white PDF." }
    ],
    sections: [
      { title: "Reduce Ink & Printing Costs", body: "Monochrome documents print faster and avoid expensive color toner usage." },
      { title: "Smaller File Sizes", body: "Stripping color channel information reduces overall document payload." },
      { title: "High Contrast Text", body: "Optimizes contrast so text and diagrams remain sharp and readable." }
    ],
    faqs: [
      { q: "Will grayscale conversion make text hard to read?", a: "No, contrast algorithms ensure black text remains crisp and photos convert smoothly." }
    ]
  },

  resizePages: {
    name: "Resize PDF Pages",
    headline: "Standardize PDF Page Dimensions to A4, US Letter & More",
    description: "Resize and scale PDF pages to standard paper sizes including A4, Letter, Legal, A3, and custom dimensions while scaling content proportionally.",
    howTo: [
      { title: "Upload PDF", text: "Select the document you need to resize." },
      { title: "Choose Target Size", text: "Select presets like A4, US Letter, Legal, or enter custom dimensions." },
      { title: "Download Resized PDF", text: "Export your standardized document." }
    ],
    sections: [
      { title: "Popular Presets", body: "One-click resizing for ISO A4, A3, A5, US Letter, Legal, and Tabloid standards." },
      { title: "Proportional Content Scaling", body: "Maintains aspect ratio without stretching or distorting text and imagery." },
      { title: "Great for International Printing", body: "Easily convert US Letter documents for European A4 printers and vice versa." }
    ],
    faqs: [
      { q: "Will resizing distort my text or images?", a: "No, content scales proportionally with automatic centering." }
    ]
  },

  addMargins: {
    name: "Add Margins to PDF",
    headline: "Add Extra Margins & Padding to PDF Pages for Binding",
    description: "Add custom whitespace padding around PDF pages for spiral binding, hole punching, or handwritten annotations.",
    howTo: [
      { title: "Upload PDF", text: "Select your document." },
      { title: "Set Margin Width", text: "Enter desired margin padding in millimeters or inches for top, bottom, left, and right." },
      { title: "Export Padded PDF", text: "Download the updated PDF with clean margin gutters." }
    ],
    sections: [
      { title: "Binding & Hole Punching Gutters", body: "Add extra margin on left or alternating odd/even pages for book binding." },
      { title: "Annotation Margins", body: "Create wide side margins for student notes, teacher grading, and proofreading." }
    ],
    faqs: [
      { q: "Can I add different margins for odd and even pages?", a: "Yes, gutter margins for double-sided book printing are supported." }
    ]
  },

  metadataEditor: {
    name: "PDF Metadata Editor",
    headline: "View and Edit PDF Title, Author, Subject & Keywords",
    description: "Inspect and edit internal PDF metadata properties including Title, Author, Subject, Keywords, Creator, and Creation Date for clean document publishing.",
    howTo: [
      { title: "Upload PDF", text: "Select your document." },
      { title: "Edit Properties", text: "Update fields like Title, Author, Keywords, and Subject in the form." },
      { title: "Save Metadata", text: "Download the updated PDF with clean metadata tags." }
    ],
    sections: [
      { title: "Professional Publishing", body: "Ensure PDF title bars and search engine snippets show accurate document titles instead of draft filenames." },
      { title: "Search Engine Optimization", body: "Embed relevant keywords and subject descriptions inside PDF document catalogs." }
    ],
    faqs: [
      { q: "Why should I edit PDF metadata?", a: "Accurate metadata improves accessibility, search engine indexing, and professional presentation." }
    ]
  },

  sanitizeMetadata: {
    name: "Sanitize PDF Metadata",
    headline: "Remove Hidden Tracking Metadata & Author Info from PDF",
    description: "Strip sensitive hidden metadata including author names, internal file paths, creation timestamps, software version strings, and GPS tags before public distribution.",
    howTo: [
      { title: "Upload PDF", text: "Select the document you want to sanitize." },
      { title: "Inspect Hidden Fields", text: "Review hidden tags and XMP metadata embedded in the file." },
      { title: "Sanitize & Download", text: "Wipe all metadata tags clean in a single click." }
    ],
    sections: [
      { title: "Privacy Protection", body: "Eliminate author names, company network paths, and software versions that leak corporate information." },
      { title: "Legal & Whistleblower Security", body: "Ensure documents shared publicly or with media carry zero hidden metadata tracking." }
    ],
    faqs: [
      { q: "Does sanitizing remove visible text?", a: "No, visible document content is untouched; only hidden metadata tags in the file header are removed." }
    ]
  },

  flattenForms: {
    name: "Flatten PDF Forms",
    headline: "Flatten Fillable Form Fields into Static PDF Content",
    description: "Lock interactive AcroForms and XFA form fields into permanent, read-only document content to prevent tampering and ensure universal printing compatibility.",
    howTo: [
      { title: "Upload Fillable PDF", text: "Select your completed form." },
      { title: "Flatten Fields", text: "Click 'Flatten Form' to convert dynamic text fields, checkboxes, and signatures into static visual elements." },
      { title: "Save Locked PDF", text: "Download the secure, uneditable document." }
    ],
    sections: [
      { title: "Prevent Form Tampering", body: "Converts fillable text boxes into uneditable static vectors so values cannot be altered." },
      { title: "Universal Print & Mobile Display", body: "Guarantees form responses render identically across all mobile devices and web viewers." }
    ],
    faqs: [
      { q: "Can someone edit the form fields after flattening?", a: "No, flattening permanently merges form responses into the underlying page graphics." }
    ]
  },

  pdfToText: {
    name: "PDF to Text Extractor",
    headline: "Extract All Plain Text from PDF Instantly Free",
    description: "Extract clean, unformatted plain text from PDF documents for copy-pasting, data analysis, NLP pipelines, and note-taking.",
    howTo: [
      { title: "Upload PDF", text: "Select the document." },
      { title: "Extract Text", text: "The parser extracts text content from every page." },
      { title: "Copy or Download", text: "Copy extracted text to your clipboard or download as a .TXT file." }
    ],
    sections: [
      { title: "Fast Text Extraction", body: "Instantly pull thousands of words across long documents in milliseconds." },
      { title: "Clean Paragraph Formatting", body: "Preserves natural line breaks and reading order." }
    ],
    faqs: [
      { q: "Does this work with scanned documents?", a: "For scanned documents, use our Offline OCR tool to extract text from images." }
    ]
  },

  protect: {
    name: "Protect PDF",
    headline: "Encrypt and Password-Protect PDF Files with AES-256",
    description: "Secure your confidential PDF documents with military-grade AES-256 encryption and strong passwords. 100% private in-browser encryption.",
    howTo: [
      { title: "Upload PDF", text: "Select the document you want to secure." },
      { title: "Enter Password", text: "Choose a strong user password and optional owner/permission password." },
      { title: "Encrypt & Download", text: "Save the encrypted PDF. A password will now be required to view the document." }
    ],
    sections: [
      { title: "Military-Grade AES-256", body: "Industry-standard cryptographic protection ensures unauthorized parties cannot read your files." },
      { title: "Zero Upload Encryption", body: "Encryption keys and files never touch a server; all cryptographic operations run in browser memory." }
    ],
    faqs: [
      { q: "What happens if I forget the password?", a: "Because encryption runs locally and no passwords are stored on servers, we cannot recover forgotten passwords." }
    ]
  },

  unlock: {
    name: "Unlock PDF",
    headline: "Remove Password and Restrictions from PDF Files",
    description: "Decrypt password-protected PDFs and remove printing, copying, and editing restrictions from documents you own.",
    howTo: [
      { title: "Upload Protected PDF", text: "Select your encrypted document." },
      { title: "Enter Password", text: "Provide the known document password to decrypt the file." },
      { title: "Download Unlocked PDF", text: "Export a clean, unencrypted PDF that opens without password prompts." }
    ],
    sections: [
      { title: "Permanent Password Removal", body: "Removes security wrappers so you can view, edit, and print without entering passwords repeatedly." },
      { title: "Local Decryption", body: "Decryption happens safely on your device with no credential leakage." }
    ],
    faqs: [
      { q: "Can I unlock a PDF without the password?", a: "You must enter the valid password to decrypt documents protected by strong AES encryption." }
    ]
  },

  permissions: {
    name: "PDF Permissions",
    headline: "Control Printing, Copying & Editing Restrictions on PDF",
    description: "Set fine-grained document security permissions to restrict printing, text copying, page modification, and form filling on PDF files.",
    howTo: [
      { title: "Upload PDF", text: "Select your document." },
      { title: "Toggle Permissions", text: "Check or uncheck allowed actions (e.g. Allow High-Res Printing, Disallow Text Copying)." },
      { title: "Apply Security", text: "Download the secured document with permission locks active." }
    ],
    sections: [
      { title: "Granular Access Controls", body: "Prevent unauthorized copying of intellectual property while still allowing viewing." },
      { title: "Printing Restrictions", body: "Disable printing or restrict to low-resolution output for sensitive draft distribution." }
    ],
    faqs: [
      { q: "Do permissions work in all viewers?", a: "Standard PDF viewers like Adobe Acrobat respect permission flags set in the document catalog." }
    ]
  },

  ocr: {
    name: "Offline OCR PDF",
    headline: "Convert Scanned PDFs & Images into Searchable Text Free",
    description: "Use offline optical character recognition (OCR) powered by Tesseract WebAssembly to convert scanned documents and photos into searchable, selectable PDF text.",
    howTo: [
      { title: "Upload Scanned PDF or Image", text: "Select scanned invoices, book pages, or receipts." },
      { title: "Run Offline OCR", text: "The in-browser engine recognizes character glyphs locally without sending scans to the cloud." },
      { title: "Download Searchable PDF", text: "Export the document with an invisible text layer ready for search, copy-paste, and indexing." }
    ],
    sections: [
      { title: "100% Offline AI OCR", body: "Powered by Tesseract WebAssembly running directly in your browser. Complete privacy for sensitive medical and financial scans." },
      { title: "Searchable Text Layer", body: "Allows you to Ctrl+F search, highlight, and copy text from previously flattened raster images." }
    ],
    faqs: [
      { q: "Does OCR upload my scans to an AI server?", a: "No. The OCR neural network runs entirely inside your browser via WebAssembly." },
      { q: "Which languages are supported?", a: "English, Spanish, French, German, and multiple Latin-based languages." }
    ]
  },

  drawSign: {
    name: "Draw & Sign PDF",
    headline: "Sign PDF Documents Electronically with Draw, Type or Image",
    description: "Add electronic signatures to contracts, agreements, and forms. Draw your signature with a mouse or touchscreen, type a styled signature, or upload a signature image.",
    howTo: [
      { title: "Upload Document", text: "Open the contract or form you need to sign." },
      { title: "Create Signature", text: "Draw your signature, type your name, or upload an image stamp." },
      { title: "Position & Save", text: "Place the signature on the signing line, resize, and download the signed PDF." }
    ],
    sections: [
      { title: "Multiple Signature Modes", body: "Draw with pen/touch, type with cursive signature fonts, or upload a transparent signature PNG." },
      { title: "Zero Data Logging", body: "Signatures are placed in browser memory and never stored on remote servers." }
    ],
    faqs: [
      { q: "Are electronic signatures legally binding?", a: "In many jurisdictions (such as under the ESIGN Act), standard electronic signatures are legally valid for most commercial agreements." }
    ]
  },

  formBuilder: {
    name: "Form Builder",
    headline: "Create Fillable Interactive PDF Forms Online Free",
    description: "Add interactive fillable text fields, checkboxes, radio buttons, dropdowns, and signature areas to any PDF document.",
    howTo: [
      { title: "Upload Base PDF", text: "Select your existing form or blank template." },
      { title: "Add Form Fields", text: "Drag and drop text inputs, checkboxes, and dropdown lists onto the page." },
      { title: "Export Fillable PDF", text: "Download the interactive AcroForm ready for clients to fill and submit." }
    ],
    sections: [
      { title: "Intuitive Drag & Drop", body: "Place and resize form controls with precise alignment guides." },
      { title: "AcroForm Standard Compliance", body: "Creates standard PDF form fields compatible with Adobe Acrobat, browser viewers, and mobile apps." }
    ],
    faqs: [
      { q: "Can recipients fill the form without special software?", a: "Yes, standard fillable PDFs open in all modern web browsers like Chrome, Edge, and Safari." }
    ]
  },

  redact: {
    name: "PDF Redactor",
    headline: "Permanently Redact and Sanitize Sensitive Information from PDF",
    description: "Permanently black out and remove confidential text, social security numbers, credit cards, and addresses from PDF documents.",
    howTo: [
      { title: "Upload PDF", text: "Select the document containing private data." },
      { title: "Draw Redaction Boxes", text: "Highlight areas to redact with black masking boxes." },
      { title: "Permanently Sanitize", text: "Click 'Apply Redactions' to remove underlying text and vector objects completely." }
    ],
    sections: [
      { title: "True Cryptographic Redaction", body: "Unlike visual black rectangles that can be removed in vector editors, OM PDF purges the underlying text streams from the file." },
      { title: "Legal & Regulatory Compliance", body: "Safely share discovery documents, medical files, and financial records." }
    ],
    faqs: [
      { q: "Can someone highlight or copy redacted text?", a: "No, true redaction completely destroys the underlying text data." }
    ]
  },

  compare: {
    name: "Compare PDF",
    headline: "Compare Two PDF Documents Side-by-Side Online Free",
    description: "Visually and textually compare two PDF files side-by-side to highlight differences, revisions, and text changes between versions.",
    howTo: [
      { title: "Upload Both PDFs", text: "Select the original version and the revised version." },
      { title: "Review Side-by-Side", text: "Use synchronized scrolling and difference highlights to inspect changes." },
      { title: "Export Diff Report", text: "Download a summary report of all detected modifications." }
    ],
    sections: [
      { title: "Visual & Textual Diff", body: "Spot altered text, modified numbers, and shifted layout elements between contract revisions." },
      { title: "Synchronized Scrolling", body: "Scroll through both documents simultaneously to compare page-by-page." }
    ],
    faqs: [
      { q: "Can I compare contracts with different formatting?", a: "Yes, textual diff engines match sentences even if page breaks shifted." }
    ]
  },

  overlay: {
    name: "Overlay & Letterhead",
    headline: "Apply Letterhead Backgrounds and Watermark Overlays to PDF",
    description: "Combine corporate letterheads, background stamps, and grid templates onto existing PDF documents seamlessly.",
    howTo: [
      { title: "Upload Main PDF", text: "Select the document content." },
      { title: "Upload Letterhead PDF", text: "Select your company letterhead or background template." },
      { title: "Merge Overlay", text: "Apply the letterhead across all pages and download the finished branded PDF." }
    ],
    sections: [
      { title: "Corporate Branding", body: "Stamp professional company letterheads onto plain invoices and statements." },
      { title: "Background & Foreground Stamping", body: "Choose whether the template sits beneath text or overlays as a stamp." }
    ],
    faqs: [
      { q: "Does overlay work with multi-page letterheads?", a: "Yes, multi-page backgrounds can be cycled or applied to page 1." }
    ]
  },

  headersFooters: {
    name: "Custom Headers & Footers",
    headline: "Add Custom Header and Footer Text to PDF Pages",
    description: "Add running headers, document titles, confidentiality notices, and dates to document margins with custom alignment and typography.",
    howTo: [
      { title: "Upload PDF", text: "Select your document." },
      { title: "Enter Header & Footer Text", text: "Type custom text for top-left, top-right, bottom-left, and bottom-right positions." },
      { title: "Apply to PDF", text: "Download the updated document with styled running headers." }
    ],
    sections: [
      { title: "Dynamic Placeholders", body: "Insert automated dates, file names, and page numbers into headers." },
      { title: "Professional Document Styling", body: "Add company confidentiality notices across bottom footers." }
    ],
    faqs: [
      { q: "Can I use different headers on page 1?", a: "Yes, you can skip headers on cover pages." }
    ]
  },

  batesNumbering: {
    name: "Bates Numbering PDF",
    headline: "Assign Sequential Bates Numbers to Legal PDF Documents",
    description: "Index legal discovery and case files with sequential alphanumeric Bates stamping (e.g. 'PLAINTIFF-000001').",
    howTo: [
      { title: "Upload Legal Documents", text: "Select the PDFs to index." },
      { title: "Set Prefix & Counter", text: "Configure prefix (e.g. 'CASE-101-'), number of digits (e.g. 6), and starting index." },
      { title: "Apply Bates Numbers", text: "Download your sequentially numbered legal bundle." }
    ],
    sections: [
      { title: "Legal Case Standard", body: "Essential for litigation discovery bundles, court filings, and trial exhibits." },
      { title: "Multi-Document Batching", body: "Maintains a continuous number sequence across multiple separate files." }
    ],
    faqs: [
      { q: "What is Bates numbering used for?", a: "It provides a unique reference identifier for every single page in legal proceedings." }
    ]
  },

  inspectPdf: {
    name: "PDF Structure Inspector",
    headline: "Inspect PDF Internal Structure, Objects, Fonts & Trees",
    description: "Examine internal PDF objects, xref tables, font dictionaries, outline trees, and stream encodings directly in your browser.",
    howTo: [
      { title: "Upload PDF", text: "Select any PDF file." },
      { title: "Explore Object Tree", text: "Browse catalog dictionaries, page nodes, annotations, and metadata streams." },
      { title: "Debug & Validate", text: "Inspect PDF version standards and detect structural errors." }
    ],
    sections: [
      { title: "Deep Developer Inspection", body: "Inspect raw COS objects, indirect references, and stream lengths." },
      { title: "Zero Cloud Parsing", body: "Safe for inspecting proprietary document architectures locally." }
    ],
    faqs: [
      { q: "Who is the PDF Inspector for?", a: "Developers, document engineers, and security analysts diagnosing PDF issues." }
    ]
  },

  linearize: {
    name: "Linearize PDF (Fast Web View)",
    headline: "Optimize PDF for Fast Web Streaming and Byte-Serving",
    description: "Restructure PDF file objects for Fast Web View (linearization) so web browsers can stream and display page 1 instantly before the rest of the file finishes downloading.",
    howTo: [
      { title: "Upload PDF", text: "Select your large PDF document." },
      { title: "Linearize File", text: "The optimizer reorganizes object tables for byte-range serving." },
      { title: "Download Web-Ready PDF", text: "Publish the linearized PDF on your web server for instant streaming." }
    ],
    sections: [
      { title: "Instant Page 1 Display", body: "Enables HTTP byte-range serving so users don't wait for multi-hundred megabyte downloads." },
      { title: "Better SEO & Web UX", body: "Improves web viewer loading performance for online publications." }
    ],
    faqs: [
      { q: "What does Fast Web View mean?", a: "It allows web browsers to fetch and render specific pages on demand over HTTP without downloading the full file first." }
    ]
  },

  voiceReader: {
    name: "PDF Voice Reader",
    headline: "Listen to PDF Text Aloud with Natural Browser Speech (TTS)",
    description: "Convert written PDF text to natural audio speech using your device's built-in text-to-speech engine. Listen hands-free with pause, resume, speed, and pitch controls.",
    howTo: [
      { title: "Upload PDF", text: "Select any document or ebook." },
      { title: "Select Voice & Speed", text: "Choose your preferred speech synthesizer voice and playback speed." },
      { title: "Listen Hands-Free", text: "Click Play to read pages aloud with synchronized text highlighting." }
    ],
    sections: [
      { title: "Accessibility & Multitasking", body: "Listen to research papers, articles, and book chapters while working or commuting." },
      { title: "100% Private Audio", body: "Speech synthesis runs entirely on your device's native voice engine without sending text to cloud servers." }
    ],
    faqs: [
      { q: "Does the voice reader require internet?", a: "Native browser voices work completely offline without an internet connection." }
    ]
  },

  pdfToPptx: {
    name: "PDF to PowerPoint (PPTX)",
    headline: "Convert PDF Pages to Microsoft PowerPoint Slides Free",
    description: "Transform PDF documents into editable PowerPoint (.pptx) presentation slide decks. Fully client-side and offline.",
    howTo: [
      { title: "Upload PDF", text: "Select the presentation PDF or slides document." },
      { title: "Convert to Slides", text: "Each page is mapped to a high-resolution 16:9 or 4:3 PowerPoint slide." },
      { title: "Download PPTX", text: "Open and present in PowerPoint, Google Slides, or Keynote." }
    ],
    sections: [
      { title: "Slide Deck Conversion", body: "Easily turn static PDF handouts back into presentable slide decks." },
      { title: "Widescreen 16:9 & Standard 4:3", body: "Automatic aspect ratio matching ensures slides fill the screen cleanly." }
    ],
    faqs: [
      { q: "Can I open the result in Google Slides?", a: "Yes, the generated .pptx file is fully compatible with Google Slides and PowerPoint." }
    ]
  },

  htmlToPdf: {
    name: "HTML to PDF Converter",
    headline: "Render HTML & CSS Code into High-Quality PDF Documents",
    description: "Write or paste HTML and CSS code to generate pixel-perfect PDF documents, invoices, receipts, and certificates instantly.",
    howTo: [
      { title: "Input HTML & CSS", text: "Paste your HTML code or choose from pre-built invoice and report templates." },
      { title: "Preview Output", text: "View live rendering preview in real time." },
      { title: "Export PDF", text: "Download the styled PDF document." }
    ],
    sections: [
      { title: "Modern CSS Styling", body: "Full support for Flexbox, Grid, custom web fonts, and print media CSS." },
      { title: "Fast Template Generation", body: "Quickly generate invoices, tickets, resumes, and reports from code." }
    ],
    faqs: [
      { q: "Can I include images in HTML to PDF?", a: "Yes, base64 images and local image assets are supported." }
    ]
  },

  batchPipeline: {
    name: "Batch PDF Pipeline",
    headline: "Apply Multiple PDF Operations in a Single Batch Workflow",
    description: "Chain together multiple PDF operations (e.g. Rotate + Flatten + Compress + Watermark) and apply them across multiple files simultaneously.",
    howTo: [
      { title: "Upload Batch Files", text: "Select multiple PDF files." },
      { title: "Build Pipeline", text: "Add sequential actions (e.g., Grayscale, Compress, Watermark)." },
      { title: "Execute & Download", text: "Run the pipeline across all files and download processed documents in a ZIP." }
    ],
    sections: [
      { title: "Automate Repetitive Tasks", body: "Eliminate manual multi-step workflows by applying customized action chains." },
      { title: "Batch Efficiency", body: "Process dozens of files in parallel in your browser." }
    ],
    faqs: [
      { q: "Can I combine compress and watermark in one step?", a: "Yes, the batch pipeline allows chaining any sequence of operations." }
    ]
  },

  esignPdf: {
    name: "E-Sign PDF",
    headline: "Add Signature, Name, Date & Initial Fields to PDF",
    description: "Prepare and sign documents with formatted signature blocks, typed full name, timestamps, and initials with visual field placement.",
    howTo: [
      { title: "Upload PDF", text: "Select the agreement or contract." },
      { title: "Place Fields", text: "Drag signature, date, and initials fields onto the document." },
      { title: "Sign & Download", text: "Complete fields and export the finalized signed agreement." }
    ],
    sections: [
      { title: "Complete Signing Suite", body: "Add signature blocks, printed names, dates, and initials anywhere on the page." },
      { title: "Client-Side Privacy", body: "Keep confidential agreements off third-party servers." }
    ],
    faqs: [
      { q: "Is this free for unlimited documents?", a: "Yes, completely free with zero monthly document limits." }
    ]
  },

  excelPdf: {
    name: "Excel & PDF Converter",
    headline: "Convert Excel Spreadsheets to PDF or Extract PDF Tables to Excel",
    description: "Convert XLSX and CSV spreadsheets to cleanly formatted PDF tables, or extract tabular data from PDF files directly into editable Excel workbooks.",
    howTo: [
      { title: "Upload File", text: "Select an Excel spreadsheet (.xlsx/.csv) or PDF document." },
      { title: "Select Conversion Mode", text: "Choose Excel-to-PDF or PDF-to-Excel tabular extraction." },
      { title: "Download Converted File", text: "Save the resulting spreadsheet or PDF document." }
    ],
    sections: [
      { title: "Tabular Data Extraction", body: "Extract rows, columns, and figures from financial reports directly into Excel." },
      { title: "Print-Ready Spreadsheets", body: "Convert messy Excel sheets into clean, paginated PDF documents." }
    ],
    faqs: [
      { q: "Does it extract formulas or values?", a: "It extracts calculated cell values and table structures into standard XLSX format." }
    ]
  },

  darkModePdf: {
    name: "Dark Mode PDF",
    headline: "Invert PDF Colors for Comfortable Night-Time Reading",
    description: "Convert bright white PDF pages to a high-contrast dark theme (dark background with light text) to reduce eye strain during nighttime reading.",
    howTo: [
      { title: "Upload PDF", text: "Select the document or textbook." },
      { title: "Choose Theme", text: "Select Dark Mode, Sepia, or High-Contrast Inversion." },
      { title: "Download Dark PDF", text: "Save the eye-friendly document." }
    ],
    sections: [
      { title: "Reduce Eye Strain", body: "Perfect for late-night studying, coding documentation, and low-light environments." },
      { title: "Color-Preserving Inversion", body: "Inverts background and text colors while preserving diagram visibility." }
    ],
    faqs: [
      { q: "Does dark mode permanently change the file?", a: "You download a newly styled copy; your original file remains unchanged." }
    ]
  },

  bookletPdf: {
    name: "Booklet Creator",
    headline: "Arrange PDF Pages into 2-Up Booklet Layout for Printing",
    description: "Reorder and impose PDF pages into 2-up booklet spreads so printed sheets can be folded in half and stapled into a physical booklet or zine.",
    howTo: [
      { title: "Upload PDF", text: "Select the document you want to print as a booklet." },
      { title: "Select Sheet Size & Binding", text: "Choose paper size (A4 / US Letter) and binding orientation (left/right)." },
      { title: "Export Print-Ready Booklet", text: "Print double-sided (short-edge flip) and fold in the center." }
    ],
    sections: [
      { title: "Automatic Page Imposition", body: "Calculates correct front-and-back page pairing so booklet pages appear in sequential order when folded." },
      { title: "Great for Programs & Zines", body: "Easily make event programs, pamphlets, manuals, and booklets from any document." }
    ],
    faqs: [
      { q: "How do I print the booklet?", a: "Print the output file double-sided with short-edge binding, then fold sheets in half." }
    ]
  },

  markdownPdf: {
    name: "Markdown to PDF",
    headline: "Convert Markdown Notes into Beautifully Styled PDF Documents",
    description: "Write or paste GitHub-flavored Markdown text with tables, code syntax highlighting, and LaTeX math to export clean, professional PDF documents.",
    howTo: [
      { title: "Write or Paste Markdown", text: "Enter your markdown notes or documentation in the editor." },
      { title: "Choose Styling Theme", text: "Select typography themes (GitHub, Academic, Modern Minimal)." },
      { title: "Download PDF", text: "Export the rendered document." }
    ],
    sections: [
      { title: "GitHub Flavored Markdown", body: "Full support for tables, task lists, blockquotes, and code blocks." },
      { title: "Syntax Highlighting", body: "Clean code highlighting for JavaScript, Python, C++, HTML, and dozens of languages." }
    ],
    faqs: [
      { q: "Does it support code blocks and tables?", a: "Yes, GitHub flavored markdown syntax including code fences and tables is fully supported." }
    ]
  },

  removeLinksPdf: {
    name: "Remove Links from PDF",
    headline: "Strip Clickable Hyperlink Annotations from PDF Files",
    description: "Remove all clickable web links, URI actions, and external URL annotations from a PDF file while preserving visible text styling.",
    howTo: [
      { title: "Upload PDF", text: "Select the document containing web links." },
      { title: "Scan Annotations", text: "The tool identifies all URI and hyperlink annotation objects." },
      { title: "Strip & Download", text: "Export the clean PDF with hyperlink actions removed." }
    ],
    sections: [
      { title: "Security & Phishing Prevention", body: "Remove unwanted external links from distributed documents and student exams." },
      { title: "Preserve Visual Text", body: "Removes underlying click triggers without deleting the visible text." }
    ],
    faqs: [
      { q: "Will the link text disappear?", a: "No, visible text remains intact; only the clickable URL link trigger is stripped." }
    ]
  },

  qrPdf: {
    name: "QR Code PDF Generator",
    headline: "Generate and Print Bulk QR Codes onto a PDF Grid",
    description: "Generate customized QR codes from URLs or text and arrange them into printable label sheets and sticker grids on PDF.",
    howTo: [
      { title: "Enter URLs or Text", text: "Type or paste the links/text for your QR codes." },
      { title: "Configure Grid Layout", text: "Set rows, columns, labels, and QR error correction level." },
      { title: "Download Printable PDF", text: "Export a ready-to-print PDF page for labels and stickers." }
    ],
    sections: [
      { title: "Printable Grid Sheets", body: "Arrange multiple QR codes per sheet matching Avery label sizes." },
      { title: "Custom Text Labels", body: "Include custom caption text under each QR code." }
    ],
    faqs: [
      { q: "Are the generated QR codes permanent?", a: "Yes, standard static QR codes never expire and require no external redirection server." }
    ]
  },

  verifyPdf: {
    name: "Verify PDF Integrity",
    headline: "Calculate Cryptographic Hash & Verify PDF Authenticity",
    description: "Calculate SHA-256, SHA-1, and MD5 cryptographic checksum hashes of PDF files to verify document integrity and detect tampering.",
    howTo: [
      { title: "Upload PDF", text: "Select the file you want to verify." },
      { title: "Compute Hashes", text: "The browser calculates cryptographic hashes in real time." },
      { title: "Compare & Verify", text: "Compare checksum with original hash to confirm authenticity." }
    ],
    sections: [
      { title: "Tamper Detection", body: "Confirm that a document has not been altered or corrupted during transit." },
      { title: "Cryptographic Standard", body: "Computes industry-standard SHA-256 and MD5 hashes entirely on your device." }
    ],
    faqs: [
      { q: "Can a modified file have the same SHA-256 hash?", a: "No, SHA-256 is computationally collision-resistant; even a 1-character change alters the entire hash." }
    ]
  },

  chatPdf: {
    name: "Chat with PDF (Offline AI)",
    headline: "Ask Questions and Summarize PDF Documents 100% Offline",
    description: "Interact with an AI language model to ask questions, summarize chapters, and extract key facts from your PDF documents completely inside your browser with WebLLM.",
    howTo: [
      { title: "Upload PDF", text: "Select the document you want to analyze." },
      { title: "Ask Questions", text: "Type questions in the chat window about the document's content." },
      { title: "Get Instant Insights", text: "Receive answers and summaries computed by the local in-browser AI model." }
    ],
    sections: [
      { title: "100% Private Local LLM", body: "Powered by WebLLM running directly on your device's WebGPU. Zero text or queries are sent to external AI cloud servers." },
      { title: "Instant Summaries & Citations", body: "Quickly summarize lengthy legal filings, research papers, and technical specifications." }
    ],
    faqs: [
      { q: "Does Chat with PDF send my data to OpenAI or external servers?", a: "No! WebLLM runs the AI model entirely inside your browser using your computer's WebGPU hardware." },
      { q: "What documents work best?", a: "Research papers, agreements, user manuals, and multi-page reports." }
    ]
  },

  editPdf: {
    name: "Edit PDF",
    headline: "Annotate, Draw, Highlight and Add Text to PDF Online Free",
    description: "Free in-browser PDF editor to add text boxes, draw annotations, highlight key phrases, and modify document pages without software installation.",
    howTo: [
      { title: "Upload PDF", text: "Select the document you want to edit." },
      { title: "Annotate & Draw", text: "Use text, pen, highlight, and shape tools to mark up pages." },
      { title: "Download Edited PDF", text: "Export your finished document." }
    ],
    sections: [
      { title: "Full Annotation Toolkit", body: "Draw, highlight, strike through, insert text, and add shapes with intuitive controls." },
      { title: "100% Local & Free", body: "Edit confidential documents safely without server uploads." }
    ],
    faqs: [
      { q: "Is the PDF editor free?", a: "Yes, fully free with no subscription or watermark." }
    ]
  }
};

const KEY_ALIAS_MAP = {
  'mergeranges': 'mergeRanges',
  'merge_ranges': 'mergeRanges',
  'splitbysize': 'splitBySize',
  'split_by_size': 'splitBySize',
  'extractpages': 'extractPages',
  'extract_pages': 'extractPages',
  'pdftoword': 'pdfToWord',
  'pdf_to_word': 'pdfToWord',
  'pdftojpg': 'pdfToJpg',
  'pdf_to_jpg': 'pdfToJpg',
  'pdftolongimage': 'pdfToLongImage',
  'pdf_to_long_image': 'pdfToLongImage',
  'extractimages': 'extractImages',
  'extract_images': 'extractImages',
  'imagetopdf': 'imageToPdf',
  'image_to_pdf': 'imageToPdf',
  'insertblank': 'insertBlank',
  'insert_blank': 'insertBlank',
  'insert_blank_pages': 'insertBlank',
  'removeempty': 'removeEmpty',
  'remove_empty': 'removeEmpty',
  'remove_empty_pages': 'removeEmpty',
  'splitbookmarks': 'splitBookmarks',
  'split_by_bookmarks': 'splitBookmarks',
  'autorotate': 'autoRotate',
  'auto_rotate': 'autoRotate',
  'auto_rotate_deskew': 'autoRotate',
  'pagenumbers': 'pageNumbers',
  'page_numbers': 'pageNumbers',
  'resizepages': 'resizePages',
  'resize_pages': 'resizePages',
  'addmargins': 'addMargins',
  'add_margins': 'addMargins',
  'metadata': 'metadataEditor',
  'metadataeditor': 'metadataEditor',
  'metadata_editor': 'metadataEditor',
  'sanitizemetadata': 'sanitizeMetadata',
  'sanitize_metadata': 'sanitizeMetadata',
  'flattenforms': 'flattenForms',
  'flatten_forms': 'flattenForms',
  'pdftotext': 'pdfToText',
  'pdf_to_text': 'pdfToText',
  'drawsign': 'drawSign',
  'draw_sign': 'drawSign',
  'draw_sign_pdf': 'drawSign',
  'formbuilder': 'formBuilder',
  'form_builder': 'formBuilder',
  'headersfooters': 'headersFooters',
  'headers_footers': 'headersFooters',
  'headers_footers_pdf': 'headersFooters',
  'batesnumbering': 'batesNumbering',
  'bates_numbering': 'batesNumbering',
  'bates_numbering_pdf': 'batesNumbering',
  'inspectpdf': 'inspectPdf',
  'inspect_pdf': 'inspectPdf',
  'voicereader': 'voiceReader',
  'voice_reader': 'voiceReader',
  'voice_reader_pdf': 'voiceReader',
  'pdftopptx': 'pdfToPptx',
  'pdf_to_pptx': 'pdfToPptx',
  'htmltopdf': 'htmlToPdf',
  'html_to_pdf': 'htmlToPdf',
  'batchpipeline': 'batchPipeline',
  'batch_pipeline': 'batchPipeline',
  'esignpdf': 'esignPdf',
  'esign_pdf': 'esignPdf',
  'excelpdf': 'excelPdf',
  'excel_pdf': 'excelPdf',
  'darkmodepdf': 'darkModePdf',
  'dark_mode_pdf': 'darkModePdf',
  'bookletpdf': 'bookletPdf',
  'booklet_pdf': 'bookletPdf',
  'markdownpdf': 'markdownPdf',
  'markdown_pdf': 'markdownPdf',
  'removelinkspdf': 'removeLinksPdf',
  'remove_links_pdf': 'removeLinksPdf',
  'qrpdf': 'qrPdf',
  'qr_pdf': 'qrPdf',
  'verifypdf': 'verifyPdf',
  'verify_pdf': 'verifyPdf',
  'chatpdf': 'chatPdf',
  'chat_pdf': 'chatPdf',
  'editpdf': 'editPdf',
  'edit_pdf': 'editPdf',
};

export function getToolContent(toolKey) {
  if (!toolKey) return null;
  const normalizedKey = KEY_ALIAS_MAP[toolKey.toLowerCase()] || KEY_ALIAS_MAP[toolKey] || toolKey;
  return TOOL_CONTENT[normalizedKey] || TOOL_CONTENT[toolKey] || null;
}
