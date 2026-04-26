// main.js – application entry point; wires events together

import './style.css';
import { addFiles, getFiles, clearFiles, subscribe, setPageCount } from './fileManager.js';
import { renderFiles, showValidation, showError, hideError, showProgress, hideProgress, showSuccess, setDropzoneActive } from './uiManager.js';
import { mergePDFs, downloadPDF, getPageCount } from './pdfMerger.js';

/* ─── DOM references ─── */
const dropzone    = document.getElementById('dropzone');
const fileInput   = document.getElementById('fileInput');
const addMoreBtn  = document.getElementById('addMoreBtn');
const addMoreInput= document.getElementById('addMoreInput');
const clearAllBtn = document.getElementById('clearAllBtn');
const mergeBtn    = document.getElementById('mergeBtn');
const mergeBtnInner = document.getElementById('mergeBtnInner');
const themeToggle = document.getElementById('themeToggle');
const filenameInput = document.getElementById('filenameInput');

/* ─── Theme ─── */
const THEME_KEY = 'om-pdf-theme';
const saved = localStorage.getItem(THEME_KEY);
if (saved) document.body.dataset.theme = saved;

themeToggle.addEventListener('click', () => {
  const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  document.body.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
});

/* ─── Subscribe to file changes ─── */
subscribe(files => {
  renderFiles(files);
  // Set a smart default filename when files are first loaded
  if (files.length > 0 && !filenameInput.value) {
    const today = new Date().toISOString().slice(0, 10);
    filenameInput.value = `merged_${today}`;
  }
  if (files.length === 0) filenameInput.value = '';
});

/* ─── File input handlers ─── */
async function handleFiles(rawFiles) {
  const list = Array.from(rawFiles);
  const { added, warnings } = addFiles(list);

  if (warnings.length > 0) showValidation(warnings.join(' '));

  // Asynchronously load page counts for newly added files
  const currentFiles = getFiles();
  for (const entry of currentFiles) {
    if (entry.pages === null) {
      getPageCount(entry.file).then(count => {
        if (count !== null) setPageCount(entry.id, count);
      });
    }
  }
}

fileInput.addEventListener('change', e => {
  handleFiles(e.target.files);
  e.target.value = ''; // reset so same file can be re-added after removal
});

addMoreBtn.addEventListener('click', () => addMoreInput.click());
addMoreInput.addEventListener('change', e => {
  handleFiles(e.target.files);
  e.target.value = '';
});

clearAllBtn.addEventListener('click', () => clearFiles());

/* ─── Dropzone click ─── */
dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});

/* ─── Drag-and-drop onto the dropzone ─── */
let dragCounter = 0;

dropzone.addEventListener('dragenter', e => {
  e.preventDefault();
  dragCounter++;
  setDropzoneActive(true);
});
dropzone.addEventListener('dragleave', () => {
  dragCounter--;
  if (dragCounter <= 0) { dragCounter = 0; setDropzoneActive(false); }
});
dropzone.addEventListener('dragover', e => e.preventDefault());
dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dragCounter = 0;
  setDropzoneActive(false);
  handleFiles(e.dataTransfer.files);
});

// Global drop prevention (avoid browser opening PDFs)
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => e.preventDefault());

/* ─── Merge ─── */
mergeBtn.addEventListener('click', async () => {
  hideError();
  const files = getFiles();

  if (files.length < 2) {
    showValidation('Please add at least 2 PDF files to merge.');
    return;
  }

  // Resolve output filename
  const rawName = filenameInput.value.trim();
  const today = new Date().toISOString().slice(0, 10);
  const filename = (rawName || `merged_${today}`).replace(/\.pdf$/i, '') + '.pdf';

  // Show merging state
  mergeBtnInner.innerHTML = `<span class="spinner"></span> Merging…`;
  showProgress('Merging PDFs…');

  try {
    const bytes = await mergePDFs(files);
    const timestamp = new Date().toISOString().slice(0,10);
    const filename  = `merged_${timestamp}.pdf`;
    downloadPDF(bytes, filename);

    const totalPages = files.reduce((sum, f) => sum + (f.pages || 0), 0);
    showSuccess(`Downloaded "${filename}" · ${files.length} files merged${totalPages ? ` · ${totalPages} pages` : ''}`);
    filenameInput.value = '';
  } catch (err) {
    console.error('[OM PDF] Merge error:', err);
    showError(`Merge failed: ${err.message || 'An unexpected error occurred. Please try again.'}`);
  } finally {
    hideProgress();
    mergeBtnInner.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 7H4C3.46957 7 2.96086 7.21071 2.58579 7.58579C2.21071 7.96086 2 8.46957 2 9V19C2 19.5304 2.21071 20.0391 2.58579 20.4142C2.96086 20.7893 3.46957 21 4 21H14C14.5304 21 15.0391 20.7893 15.4142 20.4142C15.7893 20.0391 16 19.5304 16 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M10 7H20C21.1046 7 22 7.89543 22 9V19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M17 3L21 7L17 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Merge PDFs`;
  }
});
