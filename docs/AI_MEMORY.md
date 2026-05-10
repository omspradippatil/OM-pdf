# AI_MEMORY.md - Project Architecture & Context

**Last Updated:** [Date of last significant change]

## Quick Project Overview
- **Project Name:** OM-pdf
- **Type:** React + Vite web application (PWA)
- **Purpose:** PDF manipulation tool with features like merge, split, compress, convert, etc.
- **Backend:** Firebase (Firestore + Storage)
- **Frontend Framework:** React (JSX) with custom component architecture

## Architecture Summary

### Core Structure
- **src/App.jsx**: Main app entry point
- **src/main.jsx**: Vite entry point
- **src/components/**: Reusable React components
- **src/pages/**: Page-level components for different PDF tools
- **src/services/**: Backend integrations (Firebase, Google Drive, analytics)
- **src/utils/**: Utility functions (pdfjs wrapper, pdfGuard)
- **src/workers/**: Web Worker for offloading PDF processing

### Key Features & Modules
- PDF tools: CompressPDF, MergePDF, SplitPDF, RotatePDF, CropPDF, ConvertPDF, WatermarkPDF, ProtectPDF, UnlockPDF, MetadataEditor, PageNumbers, ImageToPDF, PdfToText, OrganizePDF, PermissionsPDF
- User features: MyFiles, Privacy Dashboard, Recent Files, Save to Google Drive
- Auth: Context-based (src/context/AuthContext.jsx)
- UI: Custom styled components with CSS modules per page

### Data Flow
1. User uploads file via DropZone → FileList
2. PDF processing via pdfWorker (Web Worker)
3. Results handled by fileManager.js
4. Firebase integration for storage/auth
5. Google Drive integration for export

### State Management
- React Context (AuthContext) for auth state
- Local component state
- Service layer for business logic (activityLog, recentFiles, userProfile, etc.)

### Build & Deploy
- Build tool: Vite
- Deploy: Netlify (with redirects/headers in public/_redirects and _headers)
- PWA: InstallPWA component for installation support

---

## Recent Changes Log

### [Date] - [Summary]
- What changed
- Why it was changed
- Files affected: [list]

### Example Entry - Component Refactor
- Refactored PdfCanvas to use Web Workers for large files
- Improves UI responsiveness during PDF processing
- Files: src/components/PdfCanvas.jsx, src/workers/pdfWorker.js, src/workers/workerClient.js

---

## Key Patterns & Conventions

### Component Pattern
- Functional components with hooks
- One component per file (with rare exceptions)
- Props destructuring
- CSS modules in src/styles/ matching page names

### Service Layer Pattern
- Services in src/services/ handle external integrations
- Firebase wrapper in src/firebase.js
- Google Drive API in src/services/googleDrive.js

### PDF Processing Pattern
- Core logic in dedicated files (pdfMerger.js, splitPdf.js, etc.)
- Web Worker offloading via pdfWorker.js + workerClient.js
- pdfGuard.js for security/validation

### Naming Conventions
- Files: camelCase for JS files
- Pages: PascalCase (CompressPDF.jsx)
- Components: PascalCase (DropZone.jsx)
- Styles: lowercase-kebab-case for CSS filenames

---

## Known Issues & Technical Debt

- [ ] Issue 1: [Description] (Priority: High/Medium/Low)
- [ ] Issue 2: [Description]

---

## Critical Dependencies

- **pdf-lib**: PDF manipulation library
- **pdfjs-dist**: PDF rendering
- **firebase**: Backend services
- **google-auth-library**: OAuth for Google Drive
- **react**: UI framework
- **vite**: Build tool

---

## Integration Points (Security/Auth)

- **Firebase**: Auth, Firestore, Storage
- **Google Drive**: OAuth-based file export
- **PWA**: Service Workers for offline capability

---

## Recent Decisions to Remember

- Using Web Workers to keep UI responsive during heavy PDF processing
- Storing user activity logs in Firestore for analytics
- PWA approach for offline support and installation

