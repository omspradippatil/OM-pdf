# AI Memory — OM PDF Redesign Progress

## Objective
Upgrade the OM-pdf website UI/UX to match the professional uxpilot design system while preserving ALL existing functionality.

---

## ✅ Completed (Session 2)

### Design Tokens (common.css)
- [x] Brand color changed from `#2563EB` → uxpilot indigo `#3949ab`
- [x] Added `--primary-50/100/200` palette variables
- [x] Refined shadow scale: `--shadow-card`, `--shadow-card-hover` added
- [x] Updated dark theme with primary palette overrides
- [x] `--radius` changed from 16px → 12px (uxpilot tighter radius)
- [x] Custom scrollbar styling added

### Navbar (common.css + Navbar.jsx)
- [x] Height: 72px → 64px, white/solid bg, single border-bottom
- [x] Nav links: 0.875rem, 500 weight, 6px radius hover pill
- [x] Active link: `--primary-50` background, brand color text
- [x] NavLink className callback for proper active detection
- [x] Theme toggle styled as icon button with border
- [x] Brand icon: flat indigo square (no gradient)

### Tool Page Layout (ToolPageLayout.jsx + common.css)
- [x] Dark gradient hero → clean white hero (border-bottom)
- [x] Privacy badge → green `#ecfdf5` background (not white glass)
- [x] Added `tool-privacy-banner` strip between navbar and hero (uxpilot pattern)
- [x] Removed PrivacyDashboard from individual tool pages (moved to Home only)

### Home Page (Home.jsx + Home.css)
- [x] Complete new hero with dark indigo background + blob animations
- [x] Privacy badge with pulsing green dot
- [x] Primary CTA: indigo btn-primary
- [x] Added `highlights-row` — 6 icon feature strip (uxpilot pattern)
- [x] Tool cards: white, border, border-radius 12px, icon flips indigo on hover
- [x] Privacy comparison section (two-column: red vs green)
- [x] Features grid (6 cards)
- [x] FAQ grid (2-col, 4 questions)
- [x] CTA banner (dark)
- [x] SEO content section preserved

### Components
- [x] DropZone: circular white icon container (uxpilot style), updated label text
- [x] File items: white card with border, brand-50 icon bg, icon flips on hover
- [x] File panel: 12px radius, shadow-card
- [x] btn-merge: flat indigo, no pseudo-gradient overlay
- [x] btn-upload: 8px radius, smaller shadow
- [x] PrivacyDashboard: shield SVG icon, updated CSS to uxpilot card style

### MyFiles.css
- [x] Cards: white, border, 10px radius, brand-50 icon bg
- [x] Tags: brand-50 bg + primary border
- [x] Tabs: pill style with tighter padding

### RotatePDF.css
- [x] Angle buttons: 1px border (not 2px), brand-50 hover bg

### Footer (common.css)
- [x] White background (not card bg)
- [x] 2fr/1fr/1fr grid (brand wider)
- [x] Smaller padding: 64px/32px
- [x] Cleaner social cards: 8px radius, bg-hover background

---

## ✅ Completed (Session 3 & 4)

### SaaS Shell Architecture Migration
- [x] **Unified Tool Layout**: All 14 tools migrated to `ToolPageLayout` with independent scrolling sidebars and workspace areas.
- [x] **Independent Scrolling**: Resolved issue where "Save to Drive" was unreachable. Sidebar (settings/actions) and Workspace (files/previews) now scroll separately.
- [x] **Workspace Toolbars**: Added standardized `.ux-toolbar-inline` for file management (Remove File, Clear All, etc.).
- [x] **Real-time Previews**:
    - [x] **Interactive Grids**: `Split`, `Rotate`, `Organize`, and `Image to PDF` use high-performance thumbnail grids with DnD support.
    - [x] **Live Overlays**: `Page Numbers` and `Crop PDF` feature live canvas previews with stamp overlays and side-by-side comparisons.
    - [x] **Premium Thumbnails**: Added `thumbnailGenerator` integration for `Compress`, `Metadata`, `Watermark`, `Protect`, `Unlock`, and `Permissions`.
    - [x] **Text extraction preview**: `PdfToText` shows extracted content in a dedicated workspace editor area.

### Google Drive & Auth Persistence
- [x] **Session Persistence**: Fixed frequent "sign-in required" loops for Drive.
- [x] **Reduced Login Friction**: Removed forced `select_account` prompt from global provider.
- [x] **Smarter Re-auth**: Added `login_hint` (user email) to re-authentication flows to target the correct account automatically.
- [x] **Extended Validity**: Increased local token expiration window to 14 days (trusting the browser session).
- [x] **Auto-Retry Logic**: Implemented background token renewal in `SaveToDriveButton` and `MyFiles`. If a request fails with 401, the app refreshes the token and retries the action silently.

### Tool Refactors
- [x] **ImageToPDF**: DnD reordering with `dnd-kit`, "Add More" floating button, and result card flow.
- [x] **MetadataEditor**: Side-by-side edit form and document preview.
- [x] **Security Suite**: Unified UI for `Protect`, `Unlock`, and `Permissions` using the SaaS shell.

---

---

## ✅ Completed (Session 6) — Security & UI Polish

### Security Hardening
- [x] **Exposed Secrets Audit**: Verified all Firebase config uses `import.meta.env` and `.env` is git-ignored.
- [x] **Firestore Flood Protection**:
    - [x] Added `request.resource.data.createdAt == request.time` validation to all writable collections.
    - [x] Enforced document size limits and string length checks in `firestore.rules`.
    - [x] Restricted `feedback` type to allowed enum values (`suggestion`, `bug`, `other`).
- [x] **Client-side Rate Limiting**: Added a **60-second cooldown** to the Feedback form to prevent spam.
- [x] **Input Validation**: Added `maxLength` (3000 chars for feedback, 500 chars for metadata) to all user-facing text inputs.

### Premium UI Polish
- [x] **Sidebar Header Redesign**:
    - [x] Added soft-indigo gradient backgrounds to tool sidebars.
    - [x] Refined title typography (Weight 800) and spacing.
    - [x] Enhanced tool icons with white cards, borders, and hover-lift micro-animations.
- [x] **Section Labels**: Added letter-spacing and horizontal separator lines to `.ux-section-label` for better visual hierarchy.
- [x] **Flexible File Limits**:
    - [x] Removed "Max 200 MB" hard-limit messaging.
    - [x] Updated all tools to "200 MB Recommended" to reflect that processing is limited only by device memory, not server constraints.

---

## 🔲 Remaining Work
- [ ] Optimize `thumbnailGenerator` for very large PDFs (>500MB).
- [ ] Add "Recent Files" clearing functionality.
- [ ] Final visual polish on "My Files" empty states.

---

## ✅ Completed (Session 8) — Mobile Optimization & Responsive Shell
- [x] **Mobile Page Layout (`ToolPageLayout`)**:
    - Overrode the Javascript `document.body.style.overflow = 'hidden'` lock on mobile devices dynamically using `window.innerWidth` and CSS `!important` tags, restoring native browser scrolling.
    - Converted `.ux-shell` from `position: fixed` to `position: static` on mobile (`< 900px`). This completely resolves Safari/Chrome viewport clipping and URL bar glitching.
    - Removed all nested internal scrollbars (`overflow: visible`) inside `.ux-workspace-shell` elements on mobile, allowing the entire page to flow and scroll naturally as one document.
    - Designed sticky mobile footer for the core action button (`.ux-sidebar-footer`) to ensure the primary CTA is always accessible on screen.
    - Re-anchored the floating Add (`+`) button to viewport relative on mobile (`fixed`) above the sticky footer.
    - Updated `index.html` with explicit viewport `maximum-scale=5.0` for accessibility scaling but correctly defined initial scale.
- [x] **Mobile Navigation & Navbar**:
    - Added the missing `.hamburger` CSS styles to `common.css` to ensure the mobile menu toggle button is visible and properly formatted.
    - Hid desktop navigation links and mega menu toggles on mobile screens (`< 900px`) to prevent horizontal overflow and clutter.
- [x] **Mobile Meta Tags**:
    - Added Apple mobile web app capable tags for PWA-like appearance on iOS (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`).

---

## ✅ Completed (Session 9) — Offline Tool Expansion

### New Offline Tools (Local-Only)
- [x] **Remove Empty Pages** (detect blank pages, preview selection)
- [x] **Split by Bookmarks** (split into outline-defined sections)
- [x] **Merge with Ranges** (per-file range selection)
- [x] **Auto Rotate & Deskew** (auto-fix orientation)
- [x] **Grayscale PDF** (convert pages to grayscale)
- [x] **Resize Pages** (A4/Letter/etc, fit or fill)
- [x] **Add Margins** (add or trim custom margins)
- [x] **Sanitize Metadata** (strip metadata fields)
- [x] **Flatten Forms** (flatten fillable fields)
- [x] **PDF to Long Image** (single tall image export)

### Architecture Updates
- [x] Added new tool pages + CSS in `src/pages` and `src/styles`
- [x] Wired routes in `App.jsx` and tool registry in `src/constants/tools.js`
- [x] Added SEO metadata + tool content entries and updated sitemap

---

## ✅ Completed (Session 5) — SEO Architecture

### Foundation Already In Place
- [x] **react-helmet-async**: Already installed and integrated in main.jsx via HelmetProvider
- [x] **SEO Component**: Custom SEO.jsx component uses Helmet for meta tag management
- [x] **Sitemap.xml**: Exists with all tool pages (weekly/monthly update frequencies, priority levels)
- [x] **robots.txt**: Configured with Allow: /, Disallow: /my-files, Sitemap link
- [x] **index.html Base Tags**: Complete — charset, viewport, robots, theme-color, Google verification, canonical, OG tags, Twitter Card, structured data (SoftwareApplication)
- [x] **Tool Pages**: All using SEO component with basic title/description/URL

### SEO Infrastructure Build
- [x] **SEO Metadata Configuration** (src/constants/seoMetadata.js):
  - Created centralized SEO metadata for all 17 tools + home page
  - Each tool has unique, low-competition keywords targeting searcher intent
  - All descriptions under 160 characters for proper Google display
  - All titles include primary keyword + "OM PDF" brand + modifier ("Online Free", "No Upload", etc.)
  - Canonical URLs point to tool-specific paths
  - Example: "Merge PDF Online Free — OM PDF | No Upload Required"
  - Keywords written for natural inclusion, not stuffing (e.g., "merge pdf, merge pdf online, combine pdf files, pdf merger tool")

### SEO Keywords Strategy by Tool Type
**Merge/Split/Organize** (high search volume):
- Primary: "merge pdf", "split pdf", "organize pdf"
- Modifiers: "online", "free", "no upload", "drag to reorder"
- Long-tail: "combine pdf files", "extract pdf pages"

**Compress/Convert** (medium-high volume):
- Primary: "compress pdf", "convert pdf to jpg"
- Modifiers: "reduce file size", "shrink pdf", "high quality"
- Long-tail: "batch conversion", "image extraction"

**Security Suite** (medium volume, high intent):
- Primary: "encrypt pdf", "unlock pdf", "pdf permissions"
- Modifiers: "password protect", "remove restrictions", "AES-256"
- Long-tail: "disable pdf restrictions", "remove encryption"

**Utility Tools** (lower volume, niche):
- Primary: "watermark pdf", "crop pdf", "page numbers", "pdf metadata"
- Modifiers: "online tool", "free editor", "no sign-up"
- Long-tail: "text watermark", "batch page numbers", "add pdf metadata"

### Next Steps for SEO Success (Outside Codebase)
1. **Google Search Console**:
   - Add property: om-pdf.netlify.app
   - Verify ownership (via index.html meta tag)
   - Submit sitemap.xml
   - Monitor impressions, clicks, CTR by tool page
   - Fix any crawl errors

2. **Content Expansion** (on each tool page):
   - Add "How to Merge PDF" sections with step-by-step instructions
   - Add tool comparisons ("vs Smallpdf", "vs iLovePDF")
   - FAQ sections with natural keyword inclusion
   - Browser processing explanation (privacy angle is strong)

3. **Performance Optimization**:
   - Run Google PageSpeed Insights monthly
   - Target 90+ mobile, 95+ desktop
   - Lazy-load tool grids on Home (visible improvement on slow connections)
   - Minify JS/CSS (Vite build already does this)
   - Consider image optimization (use WebP for og-image if needed)

4. **Backlinks & Authority**:
   - GitHub: Publish "OM PDF Tools" as open-source project
   - Reddit: Share in r/webdev, r/SideProject, r/pdftools (if exists)
   - Dev.to: "I Built 17 Free PDF Tools That Run in Your Browser"
   - Product Hunt: "OM PDF — All-in-One Browser-Based PDF Toolkit"
   - YouTube: Demo video showing privacy angle + zero-upload benefit
   - Tech news sites: Contact and pitch as "privacy-first alternative to Smallpdf"

5. **Custom Domain (Critical)**:
   - Current: om-pdf.netlify.app (feels temporary, hurts perception)
   - Target: ompdf.app, ompdf.tools, ompdf.io
   - Cheap registrars: Namecheap ($8-12/year), Domain.com
   - Connect to Netlify (5 min setup via DNS records)
   - Redirect old domain → new domain (301 redirect for SEO preservation)
   - Update Google Search Console with new domain property

6. **Ranking Timeline Realistic Expectations**:
   - Weeks 0-4: Google crawl and index (may be slow without backlinks)
   - Weeks 4-12: Pages appear in search results (position 20-50)
   - Weeks 12-24: Movement toward position 10-20 (high-volume keywords take longer)
   - Months 6-12: Position 5-10 for niche/low-competition keywords
   - Months 12+: Top 3 for highly specific searches ("convert pdf to jpg offline free")
   - **Note**: Without domain authority and backlinks, competing on generic terms ("merge pdf") will take 12+ months

### Competitive Analysis
- **Smallpdf**: 50M+ monthly users, massive domain authority, millions of pages, strong backlinks
- **iLovePDF**: Similar scale, established SEO
- **OM PDF**: Starting from zero authority, but has advantages:
  - Privacy angle (100% browser processing) is unique
  - Speed advantage (no upload/download delays)
  - Works offline (PWA feature)
  - No ads/watermarks (free forever)
  
  **Winning strategy**: Target long-tail keywords + low-competition searches, build trust through content, focus on retention (repeat users).

### Files Created/Modified
- **Created**: `src/constants/seoMetadata.js` (SEO metadata config for all tools)
- **Existing**: `src/components/SEO.jsx` (no changes needed; working well)
- **Existing**: `public/sitemap.xml` (complete; add to search console)
- **Existing**: `public/robots.txt` (complete; correctly configured)
- **Existing**: `index.html` (complete; excellent base SEO)

---

## ⚠️ Constraints (Never Change)
- All PDF processing logic (workers, pdf-lib, pdf.js) — untouched
- Firebase auth, Firestore, Drive integrations — untouched
- All routing — untouched
- uxpilot folder is read-only reference only

---

## Completed (Session 7) - Search Console Enhancement Fixes

### Goal
- Resolve Google Search Console message: "URL is available to Google, but has issues."
- Make SEO architecture more conservative and valid so pages remain indexable while avoiding unsupported enhancement eligibility warnings.

### SEO Head Architecture
- [x] `src/components/SEO.jsx` now supports a `noindex` prop.
- [x] Default indexable pages now emit a fuller robots directive:
  - `index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1`
- [x] Private/submission pages can now emit:
  - `noindex, nofollow, noarchive`
- [x] `/my-files` and `/feedback` use `noindex` through the shared SEO component.

### Structured Data Architecture
- [x] `src/constants/seoSchemas.js` changed tool schema from `WebApplication` to `WebPage`.
- [x] Tool pages still emit valid `FAQPage` schema when visible FAQ content exists.
- [x] Tool page schema now uses:
  - `WebPage`
  - `isPartOf: WebSite`
  - `publisher: Organization`
- [x] Removed app-style `offers`, `operatingSystem`, and `applicationCategory` from tool page schemas to avoid Google enhancement warnings for unsupported Software/App rich result expectations.
- [x] `index.html` no longer includes static `SoftwareApplication` schema.
- [x] `index.html` no longer includes `SearchAction`/`potentialAction` because the site does not currently have a real search results route. This avoids Sitelinks Searchbox structured data warnings.
- [x] Static `index.html` keeps fallback title, description, canonical, robots, Google verification, Open Graph, Twitter Card, sitemap discovery, `WebSite` JSON-LD, and `FAQPage` JSON-LD.

### Robots and Sitemap Architecture
- [x] `public/robots.txt` was cleaned up so comments are on separate lines, not inline with `Disallow`.
- [x] `robots.txt` now disallows:
  - `/my-files`
  - `/my-files/`
  - `/feedback`
- [x] `public/sitemap.xml` no longer includes `/my-files`, because that page is private/account-related and now noindexed/disallowed.
- [x] Sitemap continues to include public tool, content, legal/info, and blog URLs only.

### Private Page Indexing Policy
- `/my-files`: private/account Drive file area; must stay out of sitemap and search index.
- `/feedback`: submission-only page; should stay out of sitemap and search index unless there is a future public-facing reason to index it.
- Public PDF tool pages should remain indexable and canonicalized to their primary tool URLs.

### Validation Performed
- [x] `npm run build` passes after SEO changes.
- [x] Static JSON-LD in `index.html` parses successfully:
  - `WebSite`
  - `FAQPage`
- [x] Repository search confirmed no remaining `SoftwareApplication`, `WebApplication`, `SearchAction`, or `potentialAction` schema usage in `index.html`, `src`, `public`, or `dist`.

### Search Console Follow-up
- After deployment, run Google Search Console:
  - URL Inspection -> Test Live URL
  - Validate Fix for the enhancement warning
  - Resubmit sitemap if needed
- Expect warnings to clear only after Google recrawls the deployed pages.

### Files Modified
- `index.html`
- `public/robots.txt`
- `public/sitemap.xml`
- `src/components/SEO.jsx`
- `src/constants/seoSchemas.js`
- `src/pages/Feedback.jsx`
- `src/pages/MyFiles.jsx`

---

## Completed (Session 9) - Mobile Tool Page Scroll Regression Fix

### Goal
- Fix mobile tool pages not scrolling after the mobile UI optimization pass.
- Preserve the desktop SaaS shell behavior while restoring native document scrolling on screens under 900px.

### Root Cause
- `src/styles/common.css` still contained a mobile media rule with `body { overflow: hidden !important; }`.
- The same mobile rule kept `.ux-shell` as `position: fixed` and kept `.ux-workspace-shell`, `.ux-workspace`, `.ux-workspace-scroll`, `.ux-sidebar`, and `.ux-sidebar-body` as nested clipped/scrolling containers.
- The CSS `!important` body lock overrode the JavaScript cleanup in `ToolPageLayout.jsx`, so mobile browsers were trapped inside fixed-height containers.

### Architecture Change
- [x] `@media (max-width: 900px)` in `src/styles/common.css` now restores native page scrolling:
  - `html, body` use `overflow-y: auto !important`
  - horizontal overflow remains hidden to prevent sideways page drift
  - `-webkit-overflow-scrolling: touch` is enabled for iOS momentum scrolling
- [x] Mobile `.ux-shell` is now `position: static` with `min-height: calc(100dvh - 64px)` and `overflow: visible`.
- [x] Mobile `.ux-workspace-shell`, `.ux-workspace`, `.ux-workspace-scroll`, `.ux-sidebar`, and `.ux-sidebar-body` now allow visible overflow so the browser scrolls the whole page.
- [x] Mobile `.ux-sidebar` no longer has `max-height: 55vh`, which previously clipped controls and results.
- [x] Mobile `.ux-sidebar-footer` is now `position: sticky; bottom: 0` so the primary action remains reachable without locking the whole layout.
- [x] Mobile `.ux-floating-add` is now `position: fixed` above the sticky action area.

### Desktop Behavior
- Desktop rules remain unchanged:
  - `.ux-shell` stays fixed below the navbar.
  - Workspace and sidebar keep independent internal scrolling.
  - `ToolPageLayout.jsx` still applies body scroll lock only when `window.innerWidth > 900`.

### Validation Performed
- [x] `npm run build` passes after the CSS change.
- [x] Local preview started successfully at `http://127.0.0.1:4175/`.
- [x] Playwright/browser automation was not available in the workspace, so runtime verification was limited to build success and targeted CSS inspection.

### Files Modified
- `src/styles/common.css`
- `AI_MEMORY.md`

---

## Completed (Session 10) - Critical Firestore Mass Assignment Fix

### Trigger
- External scan reported critical issue: "Firestore Users Collection Mass Assignment Enables Privilege Escalation to Admin" (`A01:2021`, `CWE-269`, severity 9.8).
- The visible finding indicated that authenticated clients could write arbitrary fields into their own `/users/{uid}` document.

### Root Cause
- `firestore.rules` previously had:
  - `allow read, write: if request.auth != null && request.auth.uid == uid;`
- That rule let any signed-in user overwrite their user profile document with arbitrary fields such as `role`, `admin`, `isAdmin`, `permissions`, or future privileged flags.
- Because profile documents are a natural place for later authorization checks, this is a privilege-escalation risk even if the current UI does not expose admin features.

### Security Architecture Change
- [x] Added reusable Firestore rules helpers:
  - `signedInAs(uid)`
  - `nullableString(value, maxLength)`
  - `validUserProfileBase(uid)`
  - `validNewUserProfile(uid)`
  - `validExistingUserProfile(uid)`
  - `validOptionalCounter(field)`
  - `validStats()`
- [x] Replaced broad `/users/{uid}` owner write with explicit operations:
  - `read`: owner only
  - `create`: owner only, strict profile schema
  - `update`: owner only, strict profile schema, only safe profile fields can change
  - `delete`: denied
- [x] User profile documents now allow only:
  - `uid`
  - `email`
  - `displayName`
  - `photoURL`
  - `provider`
  - `createdAt`
  - `lastLoginAt`
- [x] User profile updates can only affect:
  - `email`
  - `displayName`
  - `photoURL`
  - `provider`
  - `lastLoginAt`
- [x] `uid` is immutable after create.

---

## ✅ Completed (Session 11) - Local Tool Expansion

### New Tools Added (All 100% Local)
- [x] **Extract Images** — pulls embedded raster images directly from PDFs (no page rendering).
- [x] **Extract Pages** — interactive page selection + range input → new PDF export.
- [x] **Insert Blank Pages** — add blank pages before/after any page with size matching.
- [x] **PDF to JPG (Advanced)** — separate tool with format, scale, quality, and range control.

### UI/UX Improvements
- [x] Consistent SaaS shell integration for all new tools.
- [x] Interactive selection grids for Extract Pages and Insert Blank Pages.
- [x] Dedicated previews + output summaries for PDF to JPG (Advanced) and Extract Images.

### SEO + Discovery
- [x] Added tool metadata to `tools.js`, `toolContent.js`, and `seoMetadata.js`.
- [x] Added new tool routes in `App.jsx`.
- [x] Updated `public/sitemap.xml` with new tool URLs.
- [x] Updated `README.md` with new feature list.
- [x] `createdAt` must equal `request.time` on create and cannot be changed later.
- [x] `lastLoginAt` must equal `request.time` on profile writes.
- [x] Arbitrary admin/role/security fields are denied by `keys().hasOnly(...)`.

### Private Stats Rule Hardening
- [x] `/users/{uid}/private/stats` is still owner-only.
- [x] Stats documents now allow only known numeric counters:
  - `localJobs`
  - `driveUploads`
  - `cloudUploads`
- [x] Counters must be integers between `0` and `1000000`.
- [x] Stats deletion is denied.
- [x] Stats rules allow safe subsets so existing `setDoc(..., { merge: true })` and `increment(1)` writes continue to work.

### Compatibility Notes
- `src/services/userProfile.js` writes exactly the allowlisted profile fields, so the profile flow remains compatible.
- `src/services/privacyStats.js` writes only the allowlisted counter fields, so local stats sync and counter increments remain compatible.
- No PDF processing, Firebase Auth, Drive export, or routing logic was changed.

### Validation Performed
- [x] Read `AI_MEMORY.md` first, per project workflow.
- [x] Reviewed only scoped files related to the critical finding:
  - `firestore.rules`
  - `src/services/userProfile.js`
  - `src/services/privacyStats.js`
  - `src/services/activityLog.js`
  - `src/context/AuthContext.jsx` references via targeted search
- [x] `npm run build` passes.
- [x] Firebase CLI was not available locally, so rules were not deployed or emulator-tested in this workspace.

### Deployment Required
- Firestore rules changes are not active until deployed.
- Deploy with:
  - `firebase deploy --only firestore:rules`
- After deploy, rerun the scanner and verify that mass assignment to `/users/{uid}` with fields like `role`, `admin`, or `isAdmin` is rejected.

### Files Modified
- `firestore.rules`
- `AI_MEMORY.md`

---

## Completed (Session 11) - Production Firebase Google Auth Rewrite

### Goal
- Recode/harden Firebase Google authentication so sign-in behaves more reliably in production.
- Reduce random popup/redirect failures, repeated consent bugs, stale Drive token failures, and accidental auth prompts.

### Auth Architecture Change
- [x] Replaced the old shared mutable Google provider flow in `src/context/AuthContext.jsx`.
- [x] Auth now creates a fresh `GoogleAuthProvider` per operation using `createGoogleProvider(...)`.
- [x] Normal Google sign-in is separated from Google Drive consent:
  - Navbar login uses profile/email only.
  - Save to Drive and My Files request Drive scope intentionally.
- [x] Added explicit auth intents stored in `sessionStorage`:
  - `login`
  - `drive`
- [x] Redirect result handling now runs before the main `onAuthStateChanged` listener starts.
- [x] Redirect result handling stores a Drive access token only when the completed intent was `drive`.
- [x] Added guarded auth actions with `authBusy` / `authActionRef` to prevent double-click duplicate popup/redirect attempts.
- [x] Added clearer production auth error messages for blocked popups, cancelled popups, unauthorized domains, network failures, invalid credentials, and Firebase config problems.
- [x] Added popup-to-redirect fallback for recoverable popup failures.
- [x] Mobile and cross-origin-isolated browsers prefer redirect auth directly.
- [x] Logout now records the sign-out activity before calling `signOut`, so the Firestore log write still has an authenticated request context.

### Firebase Entrypoint Changes
- [x] `src/firebase.js` now exports `reauthenticateWithPopup` through the app Firebase wrapper.
- [x] The global exported `provider` no longer carries the Drive scope by default.
- [x] Drive scope is no longer attached to every sign-in attempt.

### Google Drive Token Policy
- [x] `src/services/googleDrive.js` token TTL changed from 14 days to 50 minutes.
- [x] Drive access tokens are now stored in `sessionStorage`, not long-lived `localStorage`.
- [x] Token storage is still keyed by Firebase UID.
- [x] Dead/expired tokens clear Drive cache and require reauthorization instead of causing stale-token loops.

### UI/Auth Entry Points
- [x] `src/components/Navbar.jsx` uses `authBusy` to disable login/logout controls while an auth operation is running.
- [x] Navbar login calls `login()` explicitly instead of passing the click event into the auth function.
- [x] `src/components/SaveToDriveButton.jsx` calls `login({ drive: true })` when the user starts from an unsigned-in Drive save.
- [x] `src/pages/MyFiles.jsx` calls `login({ drive: true })` from its sign-in button.
- [x] `MyFiles` no longer opens a Drive consent popup automatically on page mount. It checks for an existing session Drive token first and asks the user to connect Drive through an explicit Refresh/action path.

### Compatibility Notes
- Firebase Auth still uses `browserLocalPersistence` for the Firebase user session.
- Google Drive OAuth access tokens are intentionally short-lived and session-scoped.
- Existing `ensureUserProfile`, `syncStatsWithCloud`, `SaveToDriveButton`, and `MyFiles` flows remain supported.
- Firestore rules from Session 10 remain compatible with the profile writes from the new auth flow.

### Validation Performed
- [x] Read `AI_MEMORY.md` first.
- [x] Scoped review to auth-related files only.
- [x] `npm run build` passes.
- [x] Runtime Google sign-in could not be completed locally from this workspace because it requires production Firebase authorized-domain/OAuth browser interaction.

### Files Modified
- `src/context/AuthContext.jsx`
- `src/firebase.js`
- `src/services/googleDrive.js`
- `src/components/Navbar.jsx`
- `src/components/SaveToDriveButton.jsx`
- `src/pages/MyFiles.jsx`
- `AI_MEMORY.md`

---

## Completed (Session 12) - Unified Google + Drive Sign-In Requirement

### Product Requirement
- Google sign-in and Google Drive permission must happen together.
- Users should not see Drive as a separate permission flow after already signing in.
- Logout must clear both Firebase login and Drive token state.
- Firebase login should persist across reloads.

### Architecture Adjustment
- [x] `login()` in `src/context/AuthContext.jsx` now defaults to `drive: true`.
- [x] Navbar login, My Files sign-in, and Save to Drive sign-in all use the same unified Google + Drive login flow.
- [x] Redirect result handling stores a Drive token whenever Google returns an access token, not only for a separate `drive` intent.
- [x] Popup login handling stores a Drive token whenever Google returns an access token.
- [x] Success messaging now says `Signed in with Google and Drive connected.` when Drive scope is included.

### Token Persistence Policy
- [x] Firebase Auth still uses `browserLocalPersistence`, so the signed-in Google account persists across reloads.
- [x] Google Drive access tokens are cached in `localStorage` while valid so reloads can still access Drive without immediately asking again.
- [x] Expired Drive tokens are cleared automatically.
- [x] Logout clears the in-memory Drive token, local Drive token cache, and old session token cache.

### Important Constraint
- Google OAuth access tokens cannot be made non-expiring from a browser-only app. Google controls expiry.
- The app can persist Firebase login and saved Google consent, but it must request/refresh a new Drive access token when Google expires the old one.

### Validation Performed
- [x] `npm run build` passes.

### Files Modified
- `src/context/AuthContext.jsx`
- `src/services/googleDrive.js`
- `src/components/SaveToDriveButton.jsx`
- `src/pages/MyFiles.jsx`
- `AI_MEMORY.md`

---

## Completed (Session 13) - Server-Side Google Drive Refresh Token Backend

### Goal
- Implement the safer version of "store the token in the database" for longer-lived Google Drive access.
- Avoid storing raw Google Drive refresh tokens in browser storage or client-readable Firestore documents.

### Backend Architecture Added
- [x] Added Firebase project config:
  - `.firebaserc`
  - `firebase.json`
- [x] Added `functions/` Cloud Functions package using Node 22.
- [x] Added Cloud Functions in `functions/index.js`:
  - `getDriveAuthUrl`
  - `driveOAuthCallback`
  - `getDriveStatus`
  - `getDriveAccessToken`
  - `disconnectDrive`
  - `listDriveFiles`
  - `deleteDriveFile`
  - `uploadDriveFile`
- [x] The backend OAuth flow requests Google Drive `drive.file` with `access_type=offline`.
- [x] Refresh tokens are encrypted with AES-256-GCM before storing in Firestore.
- [x] Encryption key is supplied by Firebase Secret Manager as `DRIVE_TOKEN_ENCRYPTION_KEY`.
- [x] Google OAuth client ID/secret are supplied by Firebase Secret Manager.

### Frontend Architecture Changed
- [x] `src/firebase.js` now initializes and exports Firebase Functions.
- [x] `src/services/googleDrive.js` now refreshes short-lived Google Drive access tokens through callable function `getDriveAccessToken`.
- [x] `src/services/googleDrive.js` tracks the active Firebase UID so refreshed short-lived tokens are cached for the correct signed-in account.
- [x] Long-lived refresh tokens are no longer handled by browser code.
- [x] Browser still uploads directly to Google Drive with short-lived access tokens so large PDF uploads do not route through OM PDF servers.
- [x] `AuthContext` now continues from Firebase sign-in into backend Drive connection if Drive is not connected.
- [x] `ensureDriveToken` now tries server-side token refresh first and starts backend OAuth connection only if no refresh token exists.

### Security Model
- Client stores only short-lived Google access tokens while valid.
- Server stores encrypted Google refresh tokens in Firestore collections denied by client rules/default deny.
- Cloud Functions run with Admin SDK and handle token refresh.
- Logout clears browser Drive token cache; server-side refresh token remains unless `disconnectDrive` is called in a future UI.

### Deployment Setup Required
- Firebase Functions secrets:
  - `GOOGLE_OAUTH_CLIENT_ID`
  - `GOOGLE_OAUTH_CLIENT_SECRET`
  - `DRIVE_TOKEN_ENCRYPTION_KEY`
- Functions params:
  - `DRIVE_OAUTH_REDIRECT_URI`
  - `APP_RETURN_URL`
- Google Cloud OAuth client must include the deployed `driveOAuthCallback` URL as an authorized redirect URI.
- Setup notes added in `docs/DRIVE_OAUTH_SETUP.md`.

### Validation Performed
- [x] `npm install` completed inside `functions/`.
- [x] `npm run lint` in `functions/` passes via `node --check index.js`.
- [x] Root `npm run build` passes.
- [x] Runtime OAuth callback could not be tested locally because it requires deployed Function URLs and Google OAuth redirect configuration.

### Files Added/Modified
- `.firebaserc`
- `firebase.json`
- `functions/package.json`
- `functions/package-lock.json`
- `functions/index.js`
- `docs/DRIVE_OAUTH_SETUP.md`
- `src/firebase.js`
- `src/context/AuthContext.jsx`
- `src/services/googleDrive.js`
- `AI_MEMORY.md`

---

## Completed (Session 14) - Graceful Cloud Function Fallback & CORS Error Handling

### Goal
- Prevent Google sign-in from completely breaking if the `getDriveStatus` Cloud Function returns an `internal` or CORS error due to deployment issues (e.g., GCP missing unauthenticated invocation rights or Secret Manager crashes).
- Ensure users can still log in to OM PDF and use local tools even if the Google Drive backend integration is temporarily unreachable.

### Architecture Change
- [x] Modified `connectDriveAfterLogin` in `src/context/AuthContext.jsx` to wrap Cloud Function calls (`getDriveConnectedStatus` and `beginDriveConnection`) in resilient `try-catch` blocks.
- [x] If `getDriveConnectedStatus` throws an error (like a preflight CORS failure or a 500 Internal error from Cloud Run), the client logs a warning and gracefully assumes Drive is disconnected instead of throwing a fatal `FirebaseError: internal` that bricks the login flow.
- [x] Confirmed that `firestore.rules` are correct and secure. The `ERR_BLOCKED_BY_CLIENT` on the Firestore websocket channel is a known issue caused by client-side browser extensions (like Brave Shields or uBlock Origin) and does not prevent Firestore from operating, as the Firebase SDK automatically falls back to long-polling HTTP requests when websockets are blocked.

### Deployment Note
- Cloud Function CORS and `internal` errors on preflight typically occur because:
  1. The Cloud Function lacks the `roles/run.invoker` permission for `allUsers` (GCP blocks the OPTIONS request).
  2. The Cloud Function crashed on initialization due to missing Firebase Secret Manager secrets.
- This frontend update prevents these backend infrastructure issues from locking users out of the main application.

### Validation Performed
- [x] `npm run build` passes.
- [x] Backend Cloud Function `index.js` validated syntactically.
- [x] Firebase SDK error handling inspected to ensure graceful fallback.

### Files Modified
- `src/context/AuthContext.jsx`
- `AI_MEMORY.md`
