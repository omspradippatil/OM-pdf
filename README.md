<div align="center">

<img src="https://img.shields.io/badge/OM%20PDF-2563EB?style=for-the-badge&logo=adobeacrobatreader&logoColor=white" alt="OM PDF" />

# OM PDF

**Simple. Fast. Free PDF Tools.**

Merge or split PDF files instantly — right in your browser. No uploads, no sign-up, completely private.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Netlify-00C7B7?style=flat-square&logo=netlify)](https://om-pdf.netlify.app)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](LICENSE)
[![Built with Vite](https://img.shields.io/badge/Built%20with-Vite-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)

🌐 **Live:** [https://om-pdf.netlify.app](https://om-pdf.netlify.app)

</div>

---

## ✨ Features

- 📂 **File preview list** — name, size, page count, and **live PDF thumbnail** of page 1
- 🔀 **Drag to reorder** — rearrange merge order before combining
- ✂️ **Split PDF** — extract page ranges or split every page individually
- 📊 **Progress bar** — real-time step-by-step feedback per file
- 🌙 **Dark mode** — auto-detects system preference + manual toggle
- 📱 **Fully responsive** — desktop, tablet, and mobile
- 🔒 **100% Private** — all processing happens in your browser
- ⚡ **Lightning fast** — no upload wait, instant processing
- 🏷️ **Custom output filename** — rename before downloading
- 📈 **SEO optimized** — sitemap, structured data, Open Graph

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) **v18 or higher**
- npm **v9 or higher**

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/OM-pdf.git
cd OM-pdf

# 2. Install all dependencies (reads from package.json)
npm install

# ── OR install from DEPENDENCIES.md manually ──
# npm install pdf-lib pdfjs-dist
# npm install --save-dev vite
```

> All required packages are listed in [`DEPENDENCIES.md`](DEPENDENCIES.md).  
> Running `npm install` automatically installs everything from `package.json`.

### Run Locally

```bash
npm run dev
# → http://localhost:5173
```

### Build for Production

```bash
npm run build
# → outputs to dist/
```

### Preview Production Build

```bash
npm run preview
```

---

## 📦 Dependencies

All packages are documented in [`DEPENDENCIES.md`](DEPENDENCIES.md).

| Package | Version | Purpose |
|---|---|---|
| `pdf-lib` | `^1.17.1` | PDF creation, merging, and manipulation (runs client-side) |
| `pdfjs-dist` | `^5.6.205` | PDF rendering engine — generates thumbnail previews |
| `vite` *(dev)* | `^5.2.0` | Build tool and dev server |

---

## 📁 Project Structure

```
OM-pdf/
│
├── index.html                  # App entry — full semantic HTML, all panels
├── package.json                # npm config, scripts, and dependency versions
├── DEPENDENCIES.md             # npm dependency reference � actual install uses package.json
├── vite.config.js              # Vite bundler config (output → dist/, code splits pdf-lib)
├── netlify.toml                # Netlify deploy config (build cmd + publish dir + headers)
├── .gitignore                  # Ignores node_modules/, dist/, .env, OS/editor files
├── LICENSE                     # Proprietary license — owner: OM, contributions welcome
├── README.md                   # This file
│
├── public/                     # Static files copied as-is to dist/
│   ├── robots.txt              # Tells search crawlers to index all pages
│   └── sitemap.xml             # XML sitemap for https://om-pdf.netlify.app
│
└── src/                        # All application source code
    │
    ├── main.js                 # ★ Entry point — wires ALL modules together
    │                           #   • Tool tab switching (Merge / Split)
    │                           #   • Theme: system dark mode + manual toggle
    │                           #   • Merge tool: dropzone, file input, merge action
    │                           #   • Split tool: file upload, mode toggle, split action
    │                           #   • Download Again button logic
    │
    ├── style.css               # ★ Global stylesheet
    │                           #   • CSS design tokens (colors, shadows, radius)
    │                           #   • Light + dark mode via [data-theme] attribute
    │                           #   • All component styles: navbar, hero, dropzone,
    │                           #     file list, thumbnails, progress, alerts, tabs,
    │                           #     split tool, privacy section, features, footer
    │                           #   • Responsive breakpoints (mobile-first)
    │                           #   • Animations: fadeIn, slideIn, shimmer, spinner
    │
    ├── fileManager.js          # File state manager (in-memory store)
    │                           #   • addFiles()      — validates & adds File objects
    │                           #   • removeFile()    — removes by ID
    │                           #   • clearFiles()    — resets list
    │                           #   • reorderFiles()  — drag-and-drop reordering
    │                           #   • setPageCount()  — stores page count per file
    │                           #   • setThumbnail()  — stores thumbnail data URL
    │                           #   • getTotalSize()  — sum of all file sizes
    │                           #   • subscribe()     — event emitter for UI updates
    │                           #   • Limits: 200 MB per file, 100 MB soft warning
    │
    ├── uiManager.js            # DOM rendering and UI state
    │                           #   • renderFiles()   — builds the file list with
    │                           #                       thumbnails, page counts, drag handles
    │                           #   • showValidation / showError — auto-dismiss alerts
    │                           #   • showProgress / setProgress / hideProgress
    │                           #   • updateProgressLabel() — per-file step feedback
    │                           #   • showSuccess()   — auto-dismiss success banner
    │                           #   • setDropzoneActive() — drag-over visual state
    │
    ├── pdfMerger.js            # PDF merge engine (pdf-lib)
    │                           #   • mergePDFs()     — merges files in order,
    │                           #                       handles encrypted PDFs gracefully,
    │                           #                       returns { bytes, warnings[] }
    │                           #   • getPageCount()  — reads page count from a File
    │                           #   • timestampedFilename() — generates output name
    │                           #                       with YYYY-MM-DD_HH-MM-SS suffix
    │                           #   • downloadPDF()   — triggers browser download
    │
    ├── splitPdf.js             # PDF split engine (pdf-lib)
    │                           #   • parsePageRanges() — parses "1-3, 5, 7-9" strings
    │                           #                         into 0-indexed page arrays
    │                           #   • extractPages()  — extracts a range into new PDF
    │                           #   • splitEveryPage()— splits each page individually,
    │                           #                       reports progress via callback
    │                           #   • downloadBytes() — triggers download of any bytes
    │
    └── thumbnailGenerator.js   # PDF thumbnail renderer (pdfjs-dist)
                                #   • generateThumbnail() — renders page 1 of a PDF
                                #                           to a 72px wide JPEG data URL
                                #   • Uses CDN worker for pdfjs to avoid bundle complexity
                                #   • Returns null on failure (encrypted, corrupt files)
```

---

## 🌐 Deploy to Netlify

### Option 1 — Git Integration (Recommended)

1. Push this repo to GitHub
2. Go to [app.netlify.com](https://app.netlify.com) → **Add new site**
3. Connect your GitHub repo
4. Settings are auto-detected from `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Click **Deploy** ✅

### Option 2 — Netlify CLI

```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

### After Deploy — Submit to Google

Submit your sitemap to [Google Search Console](https://search.google.com/search-console):

```
https://om-pdf.netlify.app/sitemap.xml
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Semantic markup & accessibility (ARIA) |
| CSS3 | Styling, dark mode, animations, responsive |
| JavaScript (ESM) | Modular app logic |
| [pdf-lib](https://pdf-lib.js.org/) | Client-side PDF merging & splitting |
| [pdfjs-dist](https://mozilla.github.io/pdf.js/) | PDF page rendering for thumbnails |
| [Vite](https://vitejs.dev/) | Build tool & dev server |
| Netlify | Hosting, CDN & deployment |

---

## 🤝 Contributing

Contributions are welcome! Bug fixes, features, and improvements are appreciated.

> **Important:** By submitting a pull request or contribution, you agree that
> **full ownership of your contribution is assigned to the project Owner (OM Patil)**.
> You retain no co-ownership or IP rights. See [LICENSE](LICENSE) for full terms.

### How to Contribute

1. **Fork** this repository
2. **Install** dependencies: `npm install`
3. **Create** a feature branch: `git checkout -b feature/my-feature`
4. **Commit** your changes: `git commit -m 'Add my feature'`
5. **Push** to your branch: `git push origin feature/my-feature`
6. **Open a Pull Request** 🎉

### Ideas for Contributions

- 🔒 Password-protected PDF support
- ✂️ PDF compression
- 🌍 Internationalization (i18n)
- ♿ Accessibility improvements
- 🧪 Unit tests

> ⚠️ Do **not** copy or reuse the UI design, layout, or branding in other projects.
> This is explicitly prohibited by the [LICENSE](LICENSE).

---

## 🐛 Bug Reports

Found a bug? Please [open an issue](https://github.com/your-username/OM-pdf/issues) with:

- A clear description of the problem
- Steps to reproduce
- Expected vs. actual behavior
- Browser & OS info

---

## 📜 License

This project uses a **Proprietary License** — see [LICENSE](LICENSE) for full terms.

- ✅ You may view and study the code
- ✅ You may contribute (rights assigned to the Owner)
- ✅ You may run it locally for personal use
- ❌ You may not copy, redistribute, or reuse the design
- ❌ You may not deploy a public instance without permission
- ❌ You may not use the "OM PDF" name or branding

**All rights reserved. Owner: OM**

---

## ⭐ Show Your Support

If you found this project helpful, please give it a **⭐ star** on GitHub!

---

<div align="center">

Built with ❤️ by **OM** — All Rights Reserved.

</div>
