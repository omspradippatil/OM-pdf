// uiManager.js – all DOM manipulation helpers

import { removeFile, reorderFiles, formatBytes } from './fileManager.js';

const dropzone       = document.getElementById('dropzone');
const filePanel      = document.getElementById('filePanel');
const fileList       = document.getElementById('fileList');
const fileCountBadge = document.getElementById('fileCountBadge');
const mergeSection   = document.getElementById('mergeSection');
const mergeBtn       = document.getElementById('mergeBtn');
const mergeBtnInner  = document.getElementById('mergeBtnInner');
const progressContainer = document.getElementById('progressContainer');
const progressFill   = document.getElementById('progressFill');
const progressPct    = document.getElementById('progressPct');
const progressLabel  = document.getElementById('progressLabel');
const progressTrack  = document.getElementById('progressTrack');
const successBanner  = document.getElementById('successBanner');
const successDetails = document.getElementById('successDetails');
const successDismiss = document.getElementById('successDismiss');
const validationAlert  = document.getElementById('validationAlert');
const validationMessage= document.getElementById('validationMessage');
const errorAlert     = document.getElementById('errorAlert');
const errorMessage   = document.getElementById('errorMessage');

successDismiss.addEventListener('click', () => hide(successBanner));

function show(el)  { el.hidden = false; }
function hide(el)  { el.hidden = true;  }

/* ─── Render file list ─── */
let dragSrcIndex = null;

export function renderFiles(files) {
  // Toggle panels
  if (files.length === 0) {
    hide(filePanel);
    hide(mergeSection);
    show(dropzone);
  } else {
    show(filePanel);
    hide(dropzone);
    show(mergeSection);
  }

  fileCountBadge.textContent = `${files.length} file${files.length !== 1 ? 's' : ''}`;

  // Rebuild list
  fileList.innerHTML = '';
  files.forEach((entry, index) => {
    const li = document.createElement('li');
    li.className = 'file-item';
    li.draggable = true;
    li.dataset.index = index;
    li.innerHTML = `
      <div class="file-drag-handle" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="9" cy="5" r="1.5" fill="currentColor"/>
          <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
          <circle cx="9" cy="19" r="1.5" fill="currentColor"/>
          <circle cx="15" cy="5" r="1.5" fill="currentColor"/>
          <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
          <circle cx="15" cy="19" r="1.5" fill="currentColor"/>
        </svg>
      </div>
      <div class="file-icon" aria-hidden="true">📄</div>
      <div class="file-info">
        <div class="file-name" title="${entry.name}">${entry.name}</div>
        <div class="file-meta">
          <span class="file-size">${formatBytes(entry.size)}</span>
          ${entry.pages !== null ? `<span class="file-pages">${entry.pages} page${entry.pages !== 1 ? 's' : ''}</span>` : ''}
        </div>
      </div>
      <div class="file-order" aria-label="Position ${index + 1}">${index + 1}</div>
      <button class="btn-remove" data-id="${entry.id}" aria-label="Remove ${entry.name}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>`;

    // Remove
    li.querySelector('.btn-remove').addEventListener('click', e => {
      e.stopPropagation();
      const id = parseInt(e.currentTarget.dataset.id, 10);
      removeFile(id);
    });

    // Drag-and-drop reorder
    li.addEventListener('dragstart', e => {
      dragSrcIndex = index;
      li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    li.addEventListener('dragend', () => {
      li.classList.remove('dragging');
      document.querySelectorAll('.file-item').forEach(el => el.classList.remove('drag-target'));
    });
    li.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      document.querySelectorAll('.file-item').forEach(el => el.classList.remove('drag-target'));
      li.classList.add('drag-target');
    });
    li.addEventListener('drop', e => {
      e.preventDefault();
      const toIndex = index;
      if (dragSrcIndex !== null && dragSrcIndex !== toIndex) {
        reorderFiles(dragSrcIndex, toIndex);
      }
      dragSrcIndex = null;
    });

    fileList.appendChild(li);
  });
}

/* ─── Validation / Error alerts ─── */
let _validationTimer = null;
export function showValidation(msg) {
  validationMessage.textContent = msg;
  show(validationAlert);
  clearTimeout(_validationTimer);
  _validationTimer = setTimeout(() => hide(validationAlert), 5000);
}
export function hideValidation() {
  clearTimeout(_validationTimer);
  hide(validationAlert);
}

let _errorTimer = null;
export function showError(msg) {
  errorMessage.textContent = msg;
  show(errorAlert);
  clearTimeout(_errorTimer);
  _errorTimer = setTimeout(() => hide(errorAlert), 8000);
}
export function hideError() {
  clearTimeout(_errorTimer);
  hide(errorAlert);
}

/* ─── Progress ─── */
export function showProgress(label = 'Merging PDFs…') {
  hide(errorAlert);
  hide(successBanner);
  progressLabel.textContent = label;
  setProgress(0);
  show(progressContainer);
  mergeBtn.disabled = true;
}

export function setProgress(pct) {
  const clamped = Math.min(100, Math.max(0, Math.round(pct)));
  progressFill.style.width = clamped + '%';
  progressPct.textContent  = clamped + '%';
  progressTrack.setAttribute('aria-valuenow', clamped);
}

export function hideProgress() {
  hide(progressContainer);
  mergeBtn.disabled = false;
}

/* ─── Success ─── */
let _successTimer = null;
export function showSuccess(details) {
  successDetails.textContent = details;
  show(successBanner);
  clearTimeout(_successTimer);
  _successTimer = setTimeout(() => hide(successBanner), 6000);
}

/* ─── Dropzone drag-over visual ─── */
export function setDropzoneActive(active) {
  dropzone.classList.toggle('drag-over', active);
}
