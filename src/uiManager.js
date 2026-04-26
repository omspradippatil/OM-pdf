// uiManager.js – all DOM manipulation helpers

import { removeFile, reorderFiles, formatBytes, getTotalSize } from './fileManager.js';

const dropzone        = document.getElementById('dropzone');
const filePanel       = document.getElementById('filePanel');
const fileList        = document.getElementById('fileList');
const fileCountBadge  = document.getElementById('fileCountBadge');
const mergeSection    = document.getElementById('mergeSection');
const mergeBtn        = document.getElementById('mergeBtn');
const progressContainer = document.getElementById('progressContainer');
const progressFill    = document.getElementById('progressFill');
const progressPct     = document.getElementById('progressPct');
const progressLabel   = document.getElementById('progressLabel');
const progressTrack   = document.getElementById('progressTrack');
const successBanner   = document.getElementById('successBanner');
const successDetails  = document.getElementById('successDetails');
const successDismiss  = document.getElementById('successDismiss');
const validationAlert   = document.getElementById('validationAlert');
const validationMessage = document.getElementById('validationMessage');
const errorAlert      = document.getElementById('errorAlert');
const errorMessage    = document.getElementById('errorMessage');

successDismiss.addEventListener('click', () => hide(successBanner));

function show(el) { el.hidden = false; }
function hide(el) { el.hidden = true;  }

/* ─── Render file list ─── */
let dragSrcIndex = null;

export function renderFiles(files) {
  if (files.length === 0) {
    hide(filePanel); hide(mergeSection); show(dropzone);
  } else {
    show(filePanel); hide(dropzone); show(mergeSection);
  }

  const total = getTotalSize();
  fileCountBadge.textContent =
    `${files.length} file${files.length !== 1 ? 's' : ''}` +
    (total ? ` · ${formatBytes(total)}` : '');

  fileList.innerHTML = '';
  files.forEach((entry, index) => {
    const li = document.createElement('li');
    li.className = 'file-item';
    li.draggable  = true;
    li.dataset.index = index;

    // Thumbnail or placeholder
    const thumbHtml = entry.thumbnail
      ? `<img class="file-thumb" src="${entry.thumbnail}" alt="Page 1 preview" loading="lazy" />`
      : `<div class="file-thumb file-thumb-placeholder" aria-hidden="true">
           <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8L14 2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
         </div>`;

    li.innerHTML = `
      <div class="file-drag-handle" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="9" cy="5" r="1.5" fill="currentColor"/><circle cx="9" cy="12" r="1.5" fill="currentColor"/>
          <circle cx="9" cy="19" r="1.5" fill="currentColor"/><circle cx="15" cy="5" r="1.5" fill="currentColor"/>
          <circle cx="15" cy="12" r="1.5" fill="currentColor"/><circle cx="15" cy="19" r="1.5" fill="currentColor"/>
        </svg>
      </div>
      ${thumbHtml}
      <div class="file-info">
        <div class="file-name" title="${entry.name}">${entry.name}</div>
        <div class="file-meta">
          <span class="file-size">${formatBytes(entry.size)}</span>
          ${entry.pages !== null
            ? `<span class="file-pages">${entry.pages} page${entry.pages !== 1 ? 's' : ''}</span>`
            : '<span class="file-pages file-pages-loading">Loading…</span>'}
        </div>
      </div>
      <div class="file-order" aria-label="Position ${index + 1}">${index + 1}</div>
      <button class="btn-remove" data-id="${entry.id}" aria-label="Remove ${entry.name}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>`;

    li.querySelector('.btn-remove').addEventListener('click', e => {
      e.stopPropagation();
      removeFile(parseInt(e.currentTarget.dataset.id, 10));
    });

    // Drag-and-drop reorder
    li.addEventListener('dragstart', e => {
      dragSrcIndex = index; li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    li.addEventListener('dragend', () => {
      li.classList.remove('dragging');
      document.querySelectorAll('.file-item').forEach(el => el.classList.remove('drag-target'));
    });
    li.addEventListener('dragover', e => {
      e.preventDefault(); e.dataTransfer.dropEffect = 'move';
      document.querySelectorAll('.file-item').forEach(el => el.classList.remove('drag-target'));
      li.classList.add('drag-target');
    });
    li.addEventListener('drop', e => {
      e.preventDefault();
      if (dragSrcIndex !== null && dragSrcIndex !== index) reorderFiles(dragSrcIndex, index);
      dragSrcIndex = null;
    });

    fileList.appendChild(li);
  });
}

/* ─── Alerts ─── */
let _vTimer = null;
export function showValidation(msg) {
  validationMessage.textContent = msg; show(validationAlert);
  clearTimeout(_vTimer); _vTimer = setTimeout(() => hide(validationAlert), 5000);
}
export function hideValidation() { clearTimeout(_vTimer); hide(validationAlert); }

let _eTimer = null;
export function showError(msg) {
  errorMessage.textContent = msg; show(errorAlert);
  clearTimeout(_eTimer); _eTimer = setTimeout(() => hide(errorAlert), 8000);
}
export function hideError() { clearTimeout(_eTimer); hide(errorAlert); }

/* ─── Progress ─── */
export function showProgress(label = 'Processing…') {
  hide(errorAlert); hide(successBanner);
  progressLabel.textContent = label;
  setProgress(0); show(progressContainer);
  mergeBtn.disabled = true;
}
export function setProgress(pct) {
  const c = Math.min(100, Math.max(0, Math.round(pct)));
  progressFill.style.width = c + '%';
  progressPct.textContent  = c + '%';
  progressTrack.setAttribute('aria-valuenow', c);
}
export function updateProgressLabel(label) { progressLabel.textContent = label; }
export function hideProgress() { hide(progressContainer); mergeBtn.disabled = false; }

/* ─── Success ─── */
let _sTimer = null;
export function showSuccess(details) {
  successDetails.textContent = details; show(successBanner);
  clearTimeout(_sTimer); _sTimer = setTimeout(() => hide(successBanner), 8000);
}

/* ─── Dropzone state ─── */
export function setDropzoneActive(active) { dropzone.classList.toggle('drag-over', active); }
