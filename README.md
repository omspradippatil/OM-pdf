<div align="center">

<img src="https://img.shields.io/badge/OM%20PDF-2563EB?style=for-the-badge&logo=adobeacrobatreader&logoColor=white" alt="OM PDF" />

# OM PDF

**Simple. Fast. Free PDF Tools.**

Merge multiple PDF files instantly — right in your browser. No uploads, no sign-up, completely private.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Netlify-00C7B7?style=flat-square&logo=netlify)](https://your-site.netlify.app)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](LICENSE)
[![Built with Vite](https://img.shields.io/badge/Built%20with-Vite-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)

</div>

---

## ✨ Features

- 📂 **Drag & Drop** — drag files directly onto the page
- 🔀 **Reorder Files** — drag to rearrange merge order
- 📄 **Page Count** — displays page count per file
- 📊 **Progress Bar** — real-time merge progress
- 🌙 **Dark Mode** — toggle & persisted via localStorage
- 📱 **Fully Responsive** — works on mobile, tablet, desktop
- 🔒 **100% Private** — all processing happens in your browser
- ⚡ **Lightning Fast** — client-side only, no server round-trips
- 🚀 **Netlify Ready** — one-click deploy

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm v9 or higher

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/OM-pdf.git
cd OM-pdf

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

Output will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

---

## 📁 Project Structure

```
OM-pdf/
├── index.html              # App shell (semantic HTML)
├── package.json            # Dependencies & scripts
├── vite.config.js          # Vite bundler config
├── netlify.toml            # Netlify deploy config
├── LICENSE                 # MIT License
└── src/
    ├── main.js             # Entry point — wires all modules
    ├── style.css           # Global styles (design tokens, dark mode)
    ├── fileManager.js      # File state: add, remove, reorder, validate
    ├── pdfMerger.js        # pdf-lib merge logic + download
    └── uiManager.js        # DOM rendering, progress, alerts
```

---

## 🌐 Deploy to Netlify

### Option 1 — Netlify CLI

```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

### Option 2 — Git Integration

1. Push this repo to GitHub
2. Go to [app.netlify.com](https://app.netlify.com) → **Add new site**
3. Connect your GitHub repo
4. Build settings are auto-detected from `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Click **Deploy** ✅

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Semantic markup & accessibility |
| CSS3 | Styling, dark mode, animations |
| JavaScript (ESM) | App logic, modular architecture |
| [pdf-lib](https://pdf-lib.js.org/) | Client-side PDF merging |
| [Vite](https://vitejs.dev/) | Build tool & dev server |
| Netlify | Hosting & deployment |

---

## 🤝 Contributing

Contributions are welcome! Bug fixes, features, and improvements are appreciated.

> **Important:** By submitting a pull request or contribution, you agree that
> **full ownership of your contribution is assigned to the project Owner (OM)**.
> You retain no co-ownership or IP rights. See [LICENSE](LICENSE) for full terms.

### How to Contribute

1. **Fork** this repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to your branch: `git push origin feature/amazing-feature`
5. **Open a Pull Request** 🎉

### Ideas for Contributions

- 🔒 Password-protected PDF support  
- ✂️ PDF split / extract pages tool  
- 🖼️ PDF to image conversion  
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

If you found this project helpful, please give it a **⭐ star** on GitHub — it means a lot!

---

<div align="center">

Built with ❤️ by **OM** — All Rights Reserved.

</div>
