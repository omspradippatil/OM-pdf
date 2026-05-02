// myFiles.js — "My Files" dashboard (Firestore + Storage)

import {
  db, storage,
  collection, query, where, getDocs, orderBy, deleteDoc, doc,
  ref, getDownloadURL, deleteObject
} from './firebase.js';

/**
 * Fetch all files for a given uid, ordered newest first.
 * Returns [] on error.
 */
export async function fetchUserFiles(uid) {
  try {
    const q = query(
      collection(db, 'user_files'),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('[MyFiles] Fetch error:', err);
    return [];
  }
}

/**
 * Delete a file from both Firestore and Firebase Storage.
 */
export async function deleteUserFile(docId, storagePath) {
  try {
    await deleteDoc(doc(db, 'user_files', docId));
    if (storagePath) {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
    }
    return { ok: true };
  } catch (err) {
    console.error('[MyFiles] Delete error:', err);
    return { ok: false, error: err.message };
  }
}

/** Format bytes to human-readable string */
function fmt(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

/** Format Firestore timestamp to locale date string */
function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const TOOL_LABELS = {
  merge: '🔗 Merge',
  split: '✂️ Split',
  rotate: '🔄 Rotate',
  page_numbers: '🔢 Page Nos',
};

/**
 * Render the My Files list into #myFilesGrid.
 * onDelete(docId, storagePath) is called when delete button clicked.
 */
export function renderMyFiles(files, onDelete) {
  const grid = document.getElementById('myFilesGrid');
  const empty = document.getElementById('myFilesEmpty');
  const count = document.getElementById('myFilesCount');

  if (!grid) return;

  count.textContent = `${files.length} file${files.length !== 1 ? 's' : ''}`;

  if (files.length === 0) {
    grid.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  grid.innerHTML = files.map(f => `
    <div class="mf-card" data-id="${f.id}">
      <div class="mf-card-icon">📄</div>
      <div class="mf-card-info">
        <div class="mf-card-name" title="${f.name}">${f.name}</div>
        <div class="mf-card-meta">
          <span class="mf-tag">${TOOL_LABELS[f.tool] || '📁 File'}</span>
          <span>${fmt(f.size)}</span>
          ${f.pages ? `<span>${f.pages} pages</span>` : ''}
          <span>${fmtDate(f.createdAt)}</span>
        </div>
      </div>
      <div class="mf-card-actions">
        <a class="mf-btn mf-btn-download" href="${f.url}" target="_blank" rel="noopener" download="${f.name}" aria-label="Download ${f.name}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download
        </a>
        <button class="mf-btn mf-btn-delete" data-doc="${f.id}" data-path="${f.storagePath || ''}" aria-label="Delete ${f.name}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          Delete
        </button>
      </div>
    </div>
  `).join('');

  // Attach delete listeners
  grid.querySelectorAll('.mf-btn-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const docId = btn.dataset.doc;
      const path  = btn.dataset.path;
      if (!confirm(`Delete "${btn.closest('.mf-card').querySelector('.mf-card-name').textContent}"?\nThis cannot be undone.`)) return;
      btn.disabled = true;
      btn.textContent = 'Deleting…';
      await onDelete(docId, path);
    });
  });
}
