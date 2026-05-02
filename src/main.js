// main.js – entry point

import './style.css';
import { addFiles, getFiles, clearFiles, subscribe, setPageCount, setThumbnail } from './fileManager.js';
import {
  renderFiles, showValidation, showError, hideError,
  showProgress, hideProgress, showSuccess, setDropzoneActive, updateProgressLabel
} from './uiManager.js';
import { mergePDFs, downloadPDF, getPageCount, timestampedFilename } from './pdfMerger.js';
import { parsePageRanges, extractPages, splitEveryPage, downloadBytes } from './splitPdf.js';
import { rotatePdf } from './rotatePdf.js';
import { formatBytes } from './fileManager.js';
import { generateThumbnail } from './thumbnailGenerator.js';
import { auth, provider, signInWithPopup, signOut, onAuthStateChanged, storage, ref, uploadBytes, getDownloadURL } from './firebase.js';

/* ══════════════════════════════════
   GLOBAL STATE
══════════════════════════════════ */
let lastMergedBytes = null;
let lastMergedFilename = '';

/* ══════════════════════════════════
   THEME — system detect + manual override
══════════════════════════════════ */
const THEME_KEY = 'om-pdf-theme';
const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme) {
  document.body.dataset.theme = savedTheme;
} else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.body.dataset.theme = 'dark';
}
// Listen for OS-level changes (only if user hasn't manually set)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  if (!localStorage.getItem(THEME_KEY)) {
    document.body.dataset.theme = e.matches ? 'dark' : 'light';
  }
});
document.getElementById('themeToggle').addEventListener('click', () => {
  const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  document.body.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
});

/* ══════════════════════════════════
   TOOL TABS
══════════════════════════════════ */
document.querySelectorAll('.tool-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tool-tab').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
    document.querySelectorAll('.tool-panel').forEach(p => p.hidden = true);
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    document.getElementById(`tool-${btn.dataset.tool}`).hidden = false;
  });
});

/* ══════════════════════════════════
   AUTHENTICATION & CLOUD
══════════════════════════════════ */
let currentUser = null;
const loginBtn = document.getElementById('loginBtn');
const userProfile = document.getElementById('userProfile');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userProfileBtn = document.getElementById('userProfileBtn');
const authDropdown = document.getElementById('authDropdown');
const logoutBtn = document.getElementById('logoutBtn');
const saveToCloudBtn = document.getElementById('saveToCloudBtn');

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    loginBtn.hidden = true;
    userProfile.hidden = false;
    userAvatar.src = user.photoURL || '';
    userName.textContent = user.displayName || 'User';
    if (saveToCloudBtn) saveToCloudBtn.hidden = false;
  } else {
    loginBtn.hidden = false;
    userProfile.hidden = true;
    authDropdown.hidden = true;
    if (saveToCloudBtn) saveToCloudBtn.hidden = true;
  }
});

loginBtn.addEventListener('click', async () => {
  try {
    loginBtn.style.opacity = '0.5';
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Login failed:", error);
    showError("Google Sign-In failed. " + error.message);
  } finally {
    loginBtn.style.opacity = '1';
  }
});

userProfileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  authDropdown.hidden = !authDropdown.hidden;
});

document.addEventListener('click', (e) => {
  if (!userProfile.contains(e.target)) {
    authDropdown.hidden = true;
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout failed:", error);
  }
});

if (saveToCloudBtn) {
  saveToCloudBtn.addEventListener('click', async () => {
    if (!currentUser || !lastMergedBytes) return;
    
    try {
      saveToCloudBtn.classList.add('loading');
      saveToCloudBtn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px;border-top-color:var(--primary);"></span> Saving...`;
      
      const fileRef = ref(storage, `users/${currentUser.uid}/${lastMergedFilename}`);
      await uploadBytes(fileRef, lastMergedBytes);
      const url = await getDownloadURL(fileRef);
      
      // Save metadata to Firestore
      try {
        const { db, collection, addDoc, serverTimestamp } = await import('./firebase.js');
        const storagePath = `users/${currentUser.uid}/${lastMergedFilename}`;
        await addDoc(collection(db, 'user_files'), {
          uid: currentUser.uid,
          name: lastMergedFilename,
          size: lastMergedBytes.byteLength || lastMergedBytes.size,
          tool: 'merge',
          url: url,
          storagePath,
          createdAt: serverTimestamp()
        });
      } catch(e) { console.error('Firestore error:', e); }
      
      // Update button to success state
      saveToCloudBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Saved`;
      saveToCloudBtn.style.background = 'var(--success-bg)';
      saveToCloudBtn.style.color = 'var(--success)';
      saveToCloudBtn.style.borderColor = 'var(--success-border)';
      
      // Reset button after 3 seconds
      setTimeout(() => {
        saveToCloudBtn.classList.remove('loading');
        saveToCloudBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9M12 12v9m-4-4 4-4 4 4"/></svg> Save to Cloud`;
        saveToCloudBtn.style = '';
      }, 3000);
      
    } catch (error) {
      console.error("Upload failed:", error);
      showError("Failed to save to cloud: " + error.message);
      saveToCloudBtn.classList.remove('loading');
      saveToCloudBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9M12 12v9m-4-4 4-4 4 4"/></svg> Save to Cloud`;
    }
  });
}

/* ══════════════════════════════════
   MERGE TOOL
══════════════════════════════════ */
const dropzone      = document.getElementById('dropzone');
const fileInput     = document.getElementById('fileInput');
const addMoreBtn    = document.getElementById('addMoreBtn');
const addMoreInput  = document.getElementById('addMoreInput');
const clearAllBtn   = document.getElementById('clearAllBtn');
const mergeBtn      = document.getElementById('mergeBtn');
const mergeBtnInner = document.getElementById('mergeBtnInner');
const filenameInput = document.getElementById('filenameInput');
const downloadAgainBtn = document.getElementById('downloadAgainBtn');
const successDismiss   = document.getElementById('successDismiss');

// File state subscription
subscribe(files => {
  renderFiles(files);
  if (files.length > 0 && !filenameInput.value) {
    filenameInput.value = `merged_${new Date().toISOString().slice(0,10)}`;
  }
  if (files.length === 0) filenameInput.value = '';
});

// File handlers
async function handleFiles(rawFiles) {
  const { warnings } = addFiles(Array.from(rawFiles));
  if (warnings.length) showValidation(warnings.join(' | '));
  // Async load page counts + thumbnails for new entries (those still null)
  getFiles().forEach(entry => {
    if (entry.pages === null) {
      getPageCount(entry.file).then(n => { if (n !== null) setPageCount(entry.id, n); });
    }
    if (entry.thumbnail === null) {
      generateThumbnail(entry.file).then(dataUrl => {
        if (dataUrl) setThumbnail(entry.id, dataUrl);
      });
    }
  });
}

fileInput.addEventListener('change', e => { handleFiles(e.target.files); e.target.value = ''; });
addMoreBtn.addEventListener('click', () => addMoreInput.click());
addMoreInput.addEventListener('change', e => { handleFiles(e.target.files); e.target.value = ''; });
clearAllBtn.addEventListener('click', clearFiles);
successDismiss.addEventListener('click', () => { document.getElementById('successBanner').hidden = true; });

// Dropzone
dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
let dragCounter = 0;
dropzone.addEventListener('dragenter', e => { e.preventDefault(); dragCounter++; setDropzoneActive(true); });
dropzone.addEventListener('dragleave', () => { if (--dragCounter <= 0) { dragCounter = 0; setDropzoneActive(false); } });
dropzone.addEventListener('dragover', e => e.preventDefault());
dropzone.addEventListener('drop', e => { e.preventDefault(); dragCounter = 0; setDropzoneActive(false); handleFiles(e.dataTransfer.files); });
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => e.preventDefault());

// Download Again
downloadAgainBtn.addEventListener('click', () => {
  if (lastMergedBytes) downloadPDF(lastMergedBytes, lastMergedFilename);
});

// Merge
const MERGE_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="8" y="3" width="14" height="14" rx="2" stroke="currentColor" stroke-width="2"/></svg> Merge PDFs`;

mergeBtn.addEventListener('click', async () => {
  hideError();
  const files = getFiles();
  if (files.length < 2) { showValidation('Please add at least 2 PDF files to merge.'); return; }

  mergeBtnInner.innerHTML = `<span class="spinner"></span> Merging your PDFs…`;
  mergeBtn.disabled = true;
  showProgress('Merging PDFs…');

  try {
    const rawName = filenameInput.value.trim();
    const filename = timestampedFilename(rawName || 'merged');
    const { bytes, warnings: w } = await mergePDFs(files);
    lastMergedBytes = bytes; lastMergedFilename = filename;

    downloadPDF(bytes, filename);
    if (w.length) showValidation(w.join(' | '));

    const totalPages = files.reduce((s, f) => {
      if (Array.isArray(f.pageOrder)) return s + f.pageOrder.length;
      return s + (f.pages || 0);
    }, 0);
    showSuccess(`"${filename}" · ${files.length} files${totalPages ? ' · ' + totalPages + ' pages' : ''}`);
    filenameInput.value = '';
  } catch (err) {
    console.error('[OM PDF] Merge error:', err);
    showError(`Merge failed: ${err.message || 'Unexpected error. Please try again.'}`);
  } finally {
    hideProgress();
    mergeBtnInner.innerHTML = MERGE_ICON;
    mergeBtn.disabled = false;
  }
});

/* ══════════════════════════════════
   SPLIT TOOL
══════════════════════════════════ */
const splitDropzone    = document.getElementById('splitDropzone');
const splitFileInput   = document.getElementById('splitFileInput');
const splitFileInfo    = document.getElementById('splitFileInfo');
const splitFileName    = document.getElementById('splitFileName');
const splitFileSize    = document.getElementById('splitFileSize');
const splitPageCount   = document.getElementById('splitPageCount');
const splitClearBtn    = document.getElementById('splitClearBtn');
const splitBtn         = document.getElementById('splitBtn');
const splitBtnInner    = document.getElementById('splitBtnInner');
const pageRangeInput   = document.getElementById('pageRangeInput');
const splitFilenameInput = document.getElementById('splitFilenameInput');
const rangePanel       = document.getElementById('rangePanel');
const everyPanel       = document.getElementById('everyPanel');
const splitErrAlert    = document.getElementById('splitErrorAlert');
const splitErrMsg      = document.getElementById('splitErrorMessage');
const splitProgress    = document.getElementById('splitProgressContainer');
const splitFill        = document.getElementById('splitProgressFill');
const splitPct         = document.getElementById('splitProgressPct');
const splitSuccessBanner = document.getElementById('splitSuccessBanner');
const splitSuccessDetails = document.getElementById('splitSuccessDetails');
const splitSuccessDismiss = document.getElementById('splitSuccessDismiss');

let splitFile = null;
let splitTotalPages = 0;
let splitMode = 'range';

function showSplitError(msg) {
  splitErrMsg.textContent = msg;
  splitErrAlert.hidden = false;
  setTimeout(() => splitErrAlert.hidden = true, 6000);
}
function setSplitProgress(pct) {
  splitFill.style.width = pct + '%';
  splitPct.textContent  = pct + '%';
}

async function loadSplitFile(file) {
  if (!file || !file.name.toLowerCase().endsWith('.pdf')) { showSplitError('Please select a PDF file.'); return; }
  if (file.size > 50 * 1024 * 1024) { showSplitError('File exceeds 50 MB limit.'); return; }
  splitFile = file;
  splitFileName.textContent = file.name;
  splitFileSize.textContent = formatBytes(file.size);
  splitPageCount.textContent = 'Loading…';
  splitDropzone.hidden = true;
  splitFileInfo.hidden = false;
  const count = await getPageCount(file);
  splitTotalPages = count || 0;
  splitPageCount.textContent = count ? `${count} pages` : 'Unknown pages';
  splitFilenameInput.value = file.name.replace(/\.pdf$/i, '') + '_extracted';
}

// Split dropzone
splitDropzone.addEventListener('click', () => splitFileInput.click());
splitDropzone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); splitFileInput.click(); } });
splitDropzone.addEventListener('dragover', e => e.preventDefault());
splitDropzone.addEventListener('drop', e => { e.preventDefault(); loadSplitFile(e.dataTransfer.files[0]); });
splitFileInput.addEventListener('change', e => { loadSplitFile(e.target.files[0]); e.target.value = ''; });

// Clear split file
splitClearBtn.addEventListener('click', () => {
  splitFile = null; splitTotalPages = 0;
  splitFileInfo.hidden = true;
  splitDropzone.hidden = false;
  splitSuccessBanner.hidden = true;
});

// Mode toggle
document.querySelectorAll('.split-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.split-mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    splitMode = btn.dataset.mode;
    rangePanel.hidden = splitMode !== 'range';
    everyPanel.hidden = splitMode !== 'every';
  });
});

// Dismiss split success
splitSuccessDismiss.addEventListener('click', () => splitSuccessBanner.hidden = true);

const SPLIT_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Split PDF`;

// Split action
splitBtn.addEventListener('click', async () => {
  if (!splitFile) { showSplitError('Please select a PDF file first.'); return; }
  splitSuccessBanner.hidden = true;
  splitErrAlert.hidden = true;
  splitProgress.hidden = false;
  setSplitProgress(0);
  splitBtn.disabled = true;
  splitBtnInner.innerHTML = `<span class="spinner"></span> Splitting…`;

  try {
    const baseName = splitFilenameInput.value.trim().replace(/\.pdf$/i, '') || 'extracted';
    const timestamp = new Date().toISOString().slice(0,10).replace(/-/g, '');

    if (splitMode === 'range') {
      const indices = parsePageRanges(pageRangeInput.value, splitTotalPages);
      if (indices.length === 0) { showSplitError('No valid pages found. Check your page range.'); return; }
      setSplitProgress(30);
      const bytes = await extractPages(splitFile, indices);
      setSplitProgress(90);
      const filename = `${baseName}_${timestamp}.pdf`;
      downloadBytes(bytes, filename);
      setSplitProgress(100);
      splitSuccessDetails.textContent = `"${filename}" · ${indices.length} page${indices.length !== 1 ? 's' : ''} extracted`;
      splitSuccessBanner.hidden = false;
    } else {
      // Split every page → single ZIP download
      document.getElementById('splitProgressLabel').textContent = 'Splitting pages…';
      const zipBlob = await splitEveryPage(splitFile, baseName, pct => setSplitProgress(Math.round(pct)));
      document.getElementById('splitProgressLabel').textContent = 'Creating ZIP…';
      const zipFilename = `${baseName}_pages_${new Date().toISOString().slice(0,10)}.zip`;
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url; a.download = zipFilename;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
      splitSuccessDetails.textContent = `"${zipFilename}" — ${splitTotalPages} pages as individual PDFs in a ZIP`;
      splitSuccessBanner.hidden = false;
    }
  } catch (err) {
    console.error('[OM PDF] Split error:', err);
    showSplitError(`Split failed: ${err.message || 'Unexpected error.'}`);
  } finally {
    splitProgress.hidden = true;
    splitBtnInner.innerHTML = SPLIT_ICON;
    splitBtn.disabled = false;
  }
});

/* ══════════════════════════════════
   ROTATE TOOL
══════════════════════════════════ */
const rotateDropzone      = document.getElementById('rotateDropzone');
const rotateFileInput     = document.getElementById('rotateFileInput');
const rotateFileInfo      = document.getElementById('rotateFileInfo');
const rotateFileName      = document.getElementById('rotateFileName');
const rotateFileSize      = document.getElementById('rotateFileSize');
const rotatePageCount     = document.getElementById('rotatePageCount');
const rotateClearBtn      = document.getElementById('rotateClearBtn');
const rotateBtn           = document.getElementById('rotateBtn');
const rotateBtnInner      = document.getElementById('rotateBtnInner');
const rotateRangeInput    = document.getElementById('rotateRangeInput');
const rotateFilenameInput = document.getElementById('rotateFilenameInput');
const rotateErrorAlert    = document.getElementById('rotateErrorAlert');
const rotateErrorMessage  = document.getElementById('rotateErrorMessage');
const rotateSuccessBanner = document.getElementById('rotateSuccessBanner');
const rotateSuccessDetails = document.getElementById('rotateSuccessDetails');
const rotateSuccessDismiss = document.getElementById('rotateSuccessDismiss');

let rotateFile = null;
let rotateTotalPages = 0;
let rotateDegrees = 90;

function showRotateError(msg) {
  rotateErrorMessage.textContent = msg;
  rotateErrorAlert.hidden = false;
  setTimeout(() => rotateErrorAlert.hidden = true, 6000);
}

async function loadRotateFile(file) {
  if (!file || !file.name.toLowerCase().endsWith('.pdf')) { showRotateError('Please select a PDF file.'); return; }
  if (file.size > 50 * 1024 * 1024) { showRotateError('File exceeds 50 MB limit.'); return; }
  rotateFile = file;
  rotateFileName.textContent = file.name;
  rotateFileSize.textContent = formatBytes(file.size);
  rotatePageCount.textContent = 'Loading…';
  rotateDropzone.hidden = true;
  rotateFileInfo.hidden = false;
  rotateSuccessBanner.hidden = true;

  const count = await getPageCount(file);
  rotateTotalPages = count || 0;
  rotatePageCount.textContent = count ? `${count} pages` : 'Unknown pages';
  rotateFilenameInput.value = file.name.replace(/\.pdf$/i, '') + '_rotated';
}

rotateDropzone.addEventListener('click', () => rotateFileInput.click());
rotateDropzone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); rotateFileInput.click(); } });
rotateDropzone.addEventListener('dragover', e => e.preventDefault());
rotateDropzone.addEventListener('drop', e => { e.preventDefault(); loadRotateFile(e.dataTransfer.files[0]); });
rotateFileInput.addEventListener('change', e => { loadRotateFile(e.target.files[0]); e.target.value = ''; });

rotateClearBtn.addEventListener('click', () => {
  rotateFile = null; rotateTotalPages = 0;
  rotateFileInfo.hidden = true;
  rotateDropzone.hidden = false;
  rotateSuccessBanner.hidden = true;
});

rotateSuccessDismiss.addEventListener('click', () => rotateSuccessBanner.hidden = true);

document.querySelectorAll('.rotate-degree-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.rotate-degree-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    rotateDegrees = parseInt(btn.dataset.deg, 10);
  });
});

const ROTATE_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 4v6h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 20v-6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 10a8 8 0 0 1 14-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 14a8 8 0 0 1-14 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Rotate PDF`;

rotateBtn.addEventListener('click', async () => {
  if (!rotateFile) { showRotateError('Please select a PDF file first.'); return; }
  rotateSuccessBanner.hidden = true;
  rotateErrorAlert.hidden = true;
  rotateBtn.disabled = true;
  rotateBtnInner.innerHTML = `<span class="spinner"></span> Rotating…`;

  try {
    const indices = parsePageRanges(rotateRangeInput.value, rotateTotalPages);
    if (indices.length === 0) { showRotateError('No valid pages found. Check your page range.'); return; }
    const bytes = await rotatePdf(rotateFile, indices, rotateDegrees);
    const baseName = rotateFilenameInput.value.trim().replace(/\.pdf$/i, '') || 'rotated';
    const filename = `${baseName}_${new Date().toISOString().slice(0,10)}.pdf`;
    downloadBytes(bytes, filename);
    rotateSuccessDetails.textContent = `"${filename}" · ${indices.length} page${indices.length !== 1 ? 's' : ''} rotated ${rotateDegrees} deg`;
    rotateSuccessBanner.hidden = false;
  } catch (err) {
    console.error('[OM PDF] Rotate error:', err);
    showRotateError(`Rotate failed: ${err.message || 'Unexpected error.'}`);
  } finally {
    rotateBtnInner.innerHTML = ROTATE_ICON;
    rotateBtn.disabled = false;
  }
});

/* ══════════════════════════════════
   PAGE NUMBERS TOOL
══════════════════════════════════ */
import { addPageNumbers, getPdfPageCount } from './pageNumbers.js';
import { formatBytes as fmtBytes } from './fileManager.js';

let pnFile = null;
const pnDropzone       = document.getElementById('pnDropzone');
const pnFileInput      = document.getElementById('pnFileInput');
const pnFileInfo       = document.getElementById('pnFileInfo');
const pnFileName       = document.getElementById('pnFileName');
const pnFileSize       = document.getElementById('pnFileSize');
const pnFilePages      = document.getElementById('pnFilePages');
const pnClearBtn       = document.getElementById('pnClearBtn');
const pnBtn            = document.getElementById('pnBtn');
const pnBtnInner       = document.getElementById('pnBtnInner');
const pnProgressContainer = document.getElementById('pnProgressContainer');
const pnProgressLabel  = document.getElementById('pnProgressLabel');
const pnProgressPct    = document.getElementById('pnProgressPct');
const pnProgressFill   = document.getElementById('pnProgressFill');
const pnSuccessBanner  = document.getElementById('pnSuccessBanner');
const pnSuccessDetails = document.getElementById('pnSuccessDetails');
const pnSuccessDismiss = document.getElementById('pnSuccessDismiss');
const pnErrorAlert     = document.getElementById('pnErrorAlert');
const pnErrorMessage   = document.getElementById('pnErrorMessage');

function setPnProgress(pct) {
  pnProgressPct.textContent = pct + '%';
  pnProgressFill.style.width = pct + '%';
}

async function loadPnFile(file) {
  if (!file || file.type !== 'application/pdf') {
    pnErrorMessage.textContent = 'Please select a valid PDF file.';
    pnErrorAlert.hidden = false; return;
  }
  pnFile = file;
  pnDropzone.hidden = true;
  pnFileInfo.hidden = false;
  pnFileName.textContent  = file.name;
  pnFileSize.textContent  = fmtBytes(file.size);
  pnFilePages.textContent = 'counting…';
  const count = await getPdfPageCount(file);
  pnFilePages.textContent = count ? `${count} pages` : 'unknown pages';
}

pnDropzone.addEventListener('click', () => pnFileInput.click());
pnDropzone.addEventListener('dragover', e => { e.preventDefault(); });
pnDropzone.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadPnFile(f); });
pnFileInput.addEventListener('change', e => { if (e.target.files[0]) loadPnFile(e.target.files[0]); e.target.value = ''; });
pnClearBtn.addEventListener('click', () => {
  pnFile = null;
  pnDropzone.hidden = false;
  pnFileInfo.hidden = true;
  pnSuccessBanner.hidden = true;
  pnErrorAlert.hidden = true;
});
pnSuccessDismiss.addEventListener('click', () => { pnSuccessBanner.hidden = true; });

const PN_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8L14 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="9" y1="13" x2="15" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="9" y1="17" x2="15" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> Add Page Numbers`;

pnBtn.addEventListener('click', async () => {
  if (!pnFile) return;
  pnErrorAlert.hidden  = true;
  pnSuccessBanner.hidden = true;
  pnBtnInner.innerHTML = `<span class="spinner"></span> Adding numbers…`;
  pnBtn.disabled = true;
  pnProgressContainer.hidden = false;
  setPnProgress(0);

  try {
    const opts = {
      startFrom: parseInt(document.getElementById('pnStartFrom').value) || 1,
      startPage: parseInt(document.getElementById('pnStartPage').value) || 1,
      position:  document.getElementById('pnPosition').value,
      prefix:    document.getElementById('pnPrefix').value,
      showTotal: document.getElementById('pnShowTotal').checked,
      fontSize:  parseInt(document.getElementById('pnFontSize').value) || 11,
    };
    const bytes = await addPageNumbers(pnFile, opts, setPnProgress);
    const baseName = (document.getElementById('pnFilenameInput').value.trim().replace(/\.pdf$/i,'') || 'numbered');
    const filename = `${baseName}_${new Date().toISOString().slice(0,10)}.pdf`;
    downloadBytes(bytes, filename);
    pnSuccessDetails.textContent = ` "${filename}"`;
    pnSuccessBanner.hidden = false;
  } catch (err) {
    pnErrorMessage.textContent = err.message || 'Failed to add page numbers.';
    pnErrorAlert.hidden = false;
  } finally {
    pnProgressContainer.hidden = true;
    pnBtnInner.innerHTML = PN_ICON;
    pnBtn.disabled = false;
  }
});

/* ══════════════════════════════════
   MY FILES DASHBOARD
══════════════════════════════════ */
import { fetchUserFiles, deleteUserFile, renderMyFiles } from './myFiles.js';

const mfLoginAlert  = document.getElementById('mfLoginAlert');
const mfContent     = document.getElementById('mfContent');
const mfLoading     = document.getElementById('mfLoading');
const myFilesRefresh = document.getElementById('myFilesRefresh');
const myFilesCountBadge = document.getElementById('myFilesCountBadge');

async function loadMyFiles() {
  if (!currentUser) return;
  mfLoginAlert.hidden = true;
  mfContent.hidden    = true;
  mfLoading.hidden    = false;
  const files = await fetchUserFiles(currentUser.uid);
  mfLoading.hidden    = true;
  mfContent.hidden    = false;
  // Update tab badge
  myFilesCountBadge.textContent = files.length;
  myFilesCountBadge.hidden = files.length === 0;
  renderMyFiles(files, async (docId, path) => {
    const res = await deleteUserFile(docId, path);
    if (res.ok) await loadMyFiles();
    else alert('Delete failed: ' + res.error);
  });
}

// Load when My Files tab is clicked
document.getElementById('tab-myfiles').addEventListener('click', () => {
  if (currentUser) { loadMyFiles(); }
  else { mfLoginAlert.hidden = false; mfContent.hidden = true; mfLoading.hidden = true; }
});

myFilesRefresh.addEventListener('click', loadMyFiles);

// Reload My Files when user logs in
onAuthStateChanged(auth, user => {
  if (user && document.getElementById('tool-myfiles') && !document.getElementById('tool-myfiles').hidden) {
    loadMyFiles();
  }
});

