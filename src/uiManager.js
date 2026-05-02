// uiManager.js – all DOM manipulation helpers

import {
  removeFile,
  reorderFiles,
  formatBytes,
  getTotalSize,
  reorderPages,
  removePageFromOrder,
  restorePages,
  setPageThumbnails
} from './fileManager.js';
import { generatePageThumbnails } from './thumbnailGenerator.js';

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
let dragPagePos = null;
let dragPageFile = null;
const expandedFiles = new Set();
const loadingThumbs = new Set();

function getSelectedPageCount(entry) {
  if (Array.isArray(entry.pageOrder)) return entry.pageOrder.length;
  return entry.pages || 0;
}

function getPageMetaHtml(entry) {
  if (entry.pages === null) {
    return '<span class="file-pages file-pages-loading">Loading…</span>';
  }
  const selected = getSelectedPageCount(entry);
  if (Array.isArray(entry.pageOrder) && selected !== entry.pages) {
    return `<span class="file-pages file-pages-partial">${selected} / ${entry.pages} pages</span>`;
  }
  return `<span class="file-pages">${entry.pages} page${entry.pages !== 1 ? 's' : ''}</span>`;
}

async function ensurePageThumbs(entry) {
  if (!entry || entry.pages === null || entry.pageThumbsLoaded || loadingThumbs.has(entry.id)) return;
  loadingThumbs.add(entry.id);
  const thumbs = await generatePageThumbnails(entry.file);
  if (thumbs) {
    setPageThumbnails(entry.id, thumbs);
  } else {
    const fallback = Array.from({ length: entry.pages }, () => null);
    setPageThumbnails(entry.id, fallback);
  }
  loadingThumbs.delete(entry.id);
}

function renderPageGrid(entry, panel) {
  const grid = panel.querySelector('.page-grid');
  const empty = panel.querySelector('.page-empty');
  grid.innerHTML = '';

  if (entry.pages === null) {
    empty.textContent = 'Loading pages…';
    empty.hidden = false;
    return;
  }

  const order = Array.isArray(entry.pageOrder) ? entry.pageOrder : [];
  if (order.length === 0) {
    empty.textContent = 'All pages removed.';
    empty.hidden = false;
    return;
  }

  empty.hidden = true;

  order.forEach((pageIndex, pos) => {
    const item = document.createElement('div');
    item.className = 'page-item';
    item.draggable = true;
    item.dataset.pos = pos;
    item.dataset.pageIndex = pageIndex;

    const thumb = entry.pageThumbs && entry.pageThumbs[pageIndex];
    item.innerHTML = `
      <div class="page-thumb-wrap">
        ${thumb
          ? `<img class="page-thumb" src="${thumb}" alt="Page ${pageIndex + 1} preview" loading="lazy" />`
          : '<div class="page-thumb-placeholder" aria-hidden="true"></div>'}
      </div>
      <div class="page-number">${pageIndex + 1}</div>
      <button class="page-delete" type="button" aria-label="Remove page ${pageIndex + 1}">x</button>`;

    item.querySelector('.page-delete').addEventListener('click', e => {
      e.stopPropagation();
      removePageFromOrder(entry.id, pageIndex);
    });

    item.addEventListener('dragstart', e => {
      dragPageFile = entry.id;
      dragPagePos = pos;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      dragPageFile = null;
      dragPagePos = null;
      grid.querySelectorAll('.page-item').forEach(el => el.classList.remove('drag-target'));
    });
    item.addEventListener('dragover', e => {
      if (dragPageFile !== entry.id) return;
      e.preventDefault();
      grid.querySelectorAll('.page-item').forEach(el => el.classList.remove('drag-target'));
      item.classList.add('drag-target');
    });
    item.addEventListener('drop', e => {
      if (dragPageFile !== entry.id) return;
      e.preventDefault();
      if (dragPagePos !== null && dragPagePos !== pos) {
        reorderPages(entry.id, dragPagePos, pos);
      }
      dragPageFile = null;
      dragPagePos = null;
    });

    grid.appendChild(item);
  });
}

export function renderFiles(files) {
  const currentIds = new Set(files.map(f => f.id));
  expandedFiles.forEach(id => { if (!currentIds.has(id)) expandedFiles.delete(id); });

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
    li.dataset.index = index;
    li.dataset.id = entry.id;

    // Thumbnail or placeholder
    const thumbHtml = entry.thumbnail
      ? `<img class="file-thumb" src="${entry.thumbnail}" alt="Page 1 preview" loading="lazy" />`
      : `<div class="file-thumb file-thumb-placeholder" aria-hidden="true">
           <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8L14 2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
         </div>`;

    const selectedPages = getSelectedPageCount(entry);
    const pagesLabel = entry.pages !== null ? `Pages (${selectedPages}/${entry.pages})` : 'Pages';
    const expanded = expandedFiles.has(entry.id);
    const resetDisabled = entry.pages === null || !Array.isArray(entry.pageOrder) || entry.pageOrder.length === entry.pages;

    li.innerHTML = `
      <div class="file-row" draggable="true">
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
            ${getPageMetaHtml(entry)}
          </div>
        </div>
        <div class="file-order" aria-label="Position ${index + 1}">${index + 1}</div>
        <button class="btn-pages" type="button" data-id="${entry.id}" aria-expanded="${expanded}"${entry.pages === null ? ' disabled' : ''}>
          ${pagesLabel}
        </button>
        <button class="btn-remove" data-id="${entry.id}" aria-label="Remove ${entry.name}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="page-panel" ${expanded ? '' : 'hidden'}>
        <div class="page-panel-header">
          <div class="page-panel-title">${entry.pages !== null ? `Pages (${selectedPages}/${entry.pages})` : 'Pages'}</div>
          <div class="page-panel-actions">
            <button class="btn-text btn-compact" type="button" data-action="reset"${resetDisabled ? ' disabled' : ''}>Reset</button>
          </div>
        </div>
        <p class="page-panel-hint">Drag thumbnails to reorder. Click x to remove a page.</p>
        <div class="page-grid" role="list"></div>
        <p class="page-empty" hidden>All pages removed.</p>
      </div>`;

    const removeBtn = li.querySelector('.btn-remove');
    removeBtn.addEventListener('click', e => {
      e.stopPropagation();
      removeFile(parseInt(e.currentTarget.dataset.id, 10));
    });

    const panel = li.querySelector('.page-panel');
    const pagesBtn = li.querySelector('.btn-pages');
    const resetBtn = panel.querySelector('[data-action="reset"]');

    pagesBtn.addEventListener('click', e => {
      e.stopPropagation();
      const nowOpen = panel.hidden;
      panel.hidden = !nowOpen;
      pagesBtn.setAttribute('aria-expanded', String(nowOpen));
      pagesBtn.classList.toggle('active', nowOpen);
      if (nowOpen) {
        expandedFiles.add(entry.id);
        renderPageGrid(entry, panel);
        ensurePageThumbs(entry);
      } else {
        expandedFiles.delete(entry.id);
      }
    });

    if (expanded) {
      pagesBtn.classList.add('active');
      renderPageGrid(entry, panel);
      ensurePageThumbs(entry);
    }

    resetBtn.addEventListener('click', e => {
      e.stopPropagation();
      restorePages(entry.id);
    });

    // Drag-and-drop reorder
    const row = li.querySelector('.file-row');
    row.addEventListener('dragstart', e => {
      dragSrcIndex = index; li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', () => {
      li.classList.remove('dragging');
      document.querySelectorAll('.file-item').forEach(el => el.classList.remove('drag-target'));
    });
    row.addEventListener('dragover', e => {
      e.preventDefault(); e.dataTransfer.dropEffect = 'move';
      document.querySelectorAll('.file-item').forEach(el => el.classList.remove('drag-target'));
      li.classList.add('drag-target');
    });
    row.addEventListener('drop', e => {
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
