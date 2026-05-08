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
- 🛡️ **Security Suite** — AES-256 encryption, password removal, and permission control
- ☁️ **Google Drive** — persistent cloud storage integration for all tools
- 📊 **Progress bar** — real-time step-by-step feedback per file
- 🌙 **Dark mode** — auto-detects system preference + manual toggle
- 📱 **Fully responsive** — desktop, tablet, and mobile with premium Mega-Menu
- 🔒 **100% Private** — all processing happens in your browser
- ⚡ **Lightning fast** — no upload wait, instant processing using QPDF WASM
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
git clone https://github.com/omspradippatil/OM-pdf.git
cd OM-pdf

# 2. Install all dependencies (reads from package.json)
npm install

# ── OR install from DEPENDENCIES.md manually ──
# npm install pdf-lib pdfjs-dist jszip
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
| `jszip` | `^3.10.1` | ZIP archive creation — bundles split pages into one download |
| `vite` *(dev)* | `^5.2.0` | Build tool and dev server |

---

## 📁 Project Structure

```text
OM-pdf/
│
├── package.json                # npm config, scripts, and dependency versions
├── DEPENDENCIES.md             # npm dependency reference — actual install uses package.json
├── vite.config.js              # Vite bundler config (output → dist/, code splits pdf-lib)
├── netlify.toml                # Netlify deploy config (build cmd + publish dir + headers)
├── .gitignore                  # Ignores node_modules/, dist/, .env, OS/editor files
├├── public/                     # Static files & WASM binaries
│   ├── qpdf.js                 # Security engine loader
│   ├── qpdf.wasm               # Security engine binary
│   ├── sitemap.xml             # SEO Sitemap
│   └── robots.txt              # Crawler instructions
│
└── src/                        # React Application Source
    ├── App.jsx                 # Root component & Routing
    ├── main.jsx                # App Entry Point
    ├── components/             # Reusable UI Components (Navbar, Footer, MegaMenu)
    ├── pages/                  # Tool Pages (Merge, Split, Protect, etc.)
    ├── context/                # Auth & App State (Google Drive persistence)
    ├── services/               # External APIs (Firebase, Google Drive)
    ├── utils/                  # Core PDF Engines (pdfGuard, pdfjs)
    └── style.css               # Global Design System & Animations
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
| [JSZip](https://stuk.github.io/jszip/) | ZIP archive generation for split PDFs |
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

Found a bug? Please [open an issue](https://github.com/omspradippatil/OM-pdf/issues) with:

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

**All rights reserved. Owner: OM Patil**

---

## ⭐ Show Your Support

If you found this project helpful, please give it a **⭐ star** on GitHub!

---

## 👤 Contact the Developer

**Developed by OM Patil**

- **Portfolio**: [ompradippatil.netlify.app](https://ompradippatil.netlify.app/)
- **GitHub**: [@omspradippatil](https://github.com/omspradippatil)
- **LinkedIn**: [OM Pradip Patil](https://in.linkedin.com/in/om-pradip-patil)
- **Email**: [omspradippatil@gmail.com](mailto:omspradippatil@gmail.com)

---

<div align="center">

Built with ❤️ by **OM Patil** — All Rights Reserved.

</div>
