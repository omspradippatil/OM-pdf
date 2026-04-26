// main.js – entry point

import './style.css';
import { addFiles, getFiles, clearFiles, subscribe, setPageCount } from './fileManager.js';
import {
  renderFiles, showValidation, showError, hideError,
  showProgress, hideProgress, showSuccess, setDropzoneActive
} from './uiManager.js';
import { mergePDFs, downloadPDF, getPageCount, timestampedFilename } from './pdfMerger.js';
import { parsePageRanges, extractPages, splitEveryPage, downloadBytes } from './splitPdf.js';
import { formatBytes } from './fileManager.js';

/* ══════════════════════════════════
   THEME
══════════════════════════════════ */
const THEME_KEY = 'om-pdf-theme';
const saved = localStorage.getItem(THEME_KEY);
if (saved) document.body.dataset.theme = saved;
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

let lastMergedBytes = null;
let lastMergedFilename = '';

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
  getFiles().forEach(entry => {
    if (entry.pages === null) getPageCount(entry.file).then(n => { if (n !== null) setPageCount(entry.id, n); });
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

    const totalPages = files.reduce((s, f) => s + (f.pages || 0), 0);
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
      // Split every page — sequential downloads
      const results = await splitEveryPage(splitFile, pct => setSplitProgress(Math.round(pct * 0.9)));
      setSplitProgress(100);
      for (let i = 0; i < results.length; i++) {
        const { bytes, pageNum } = results[i];
        const filename = `${baseName}_page${String(pageNum).padStart(3,'0')}_${timestamp}.pdf`;
        downloadBytes(bytes, filename);
        await new Promise(r => setTimeout(r, 400));
      }
      splitSuccessDetails.textContent = `${results.length} individual PDFs downloaded`;
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
