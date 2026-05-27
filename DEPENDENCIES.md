# OM PDF – Node.js Dependencies
# ─────────────────────────────────────────────────────────────────
# This file documents all required packages.
# To install everything, run:
#
#   npm install
#
# Node.js is required: https://nodejs.org/ (v18 or higher)
# ─────────────────────────────────────────────────────────────────

# ── Runtime dependencies ──────────────────────────────────────────
pdf-lib@^1.17.1          # PDF creation, merging, and manipulation (client-side)
pdfjs-dist@^5.6.205      # PDF rendering — used to generate thumbnail previews
jszip@^3.10.1            # ZIP archive creation — bundles split pages into one download
xlsx@^0.18.5             # Spreadsheet parsing and generation (runs client-side)
marked@^12.0.1           # Markdown parser and compiler (runs client-side)
qrcode@^1.5.3            # QR Code pattern generator (runs client-side)

# ── Dev dependencies (build tooling only) ────────────────────────
vite@^5.2.0              # Fast build tool and dev server (outputs to dist/)
