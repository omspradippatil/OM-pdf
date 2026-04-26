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

# ── Dev dependencies (build tooling only) ────────────────────────
vite@^5.2.0              # Fast build tool and dev server (outputs to dist/)
