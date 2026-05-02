// fileManager.js – manages the in-memory file list and emits change events

const MAX_FILE_SIZE_MB    = 200;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const LARGE_FILE_WARN_MB  = 100;

let files  = []; // { id, file, name, size, pages, thumbnail, pageOrder, pageThumbs, pageThumbsLoaded }
let nextId = 0;

const listeners = new Set();
export function subscribe(fn)  { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { listeners.forEach(fn => fn([...files])); }

export function getFiles() { return [...files]; }

export function getTotalSize() { return files.reduce((s, f) => s + f.size, 0); }

/** Returns { added, warnings[] } */
export function addFiles(rawFiles) {
  const warnings = [];
  let added = 0;
  for (const file of rawFiles) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      warnings.push(`"${file.name}" is not a PDF file and was skipped.`); continue;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      warnings.push(`"${file.name}" exceeds the ${MAX_FILE_SIZE_MB} MB limit and was skipped.`); continue;
    }
    if (file.size > LARGE_FILE_WARN_MB * 1024 * 1024) {
      warnings.push(`"${file.name}" is large (${formatBytes(file.size)}) — processing may be slower.`);
    }
    if (files.some(f => f.name === file.name && f.size === file.size)) {
      warnings.push(`"${file.name}" is already in the list.`); continue;
    }
    files.push({
      id: nextId++,
      file,
      name: file.name,
      size: file.size,
      pages: null,
      thumbnail: null,
      pageOrder: null,
      pageThumbs: null,
      pageThumbsLoaded: false
    });
    added++;
  }
  emit();
  return { added, warnings };
}

export function removeFile(id)  { files = files.filter(f => f.id !== id); emit(); }
export function clearFiles()    { files = []; emit(); }

export function reorderFiles(fromIndex, toIndex) {
  if (fromIndex === toIndex) return;
  const [moved] = files.splice(fromIndex, 1);
  files.splice(toIndex, 0, moved);
  emit();
}

export function setPageCount(id, pages) {
  const e = files.find(f => f.id === id);
  if (e) {
    e.pages = pages;
    if (pages !== null && e.pageOrder === null) {
      e.pageOrder = Array.from({ length: pages }, (_, i) => i);
    }
    if (pages !== null && e.pageThumbs === null) {
      e.pageThumbs = Array.from({ length: pages }, () => null);
    }
    emit();
  }
}

export function setThumbnail(id, dataUrl) {
  const e = files.find(f => f.id === id);
  if (e) { e.thumbnail = dataUrl; emit(); }
}

export function setPageThumbnails(id, thumbs) {
  const e = files.find(f => f.id === id);
  if (!e) return;
  e.pageThumbs = thumbs;
  e.pageThumbsLoaded = true;
  emit();
}

export function reorderPages(id, fromIndex, toIndex) {
  const e = files.find(f => f.id === id);
  if (!e || !e.pageOrder || fromIndex === toIndex) return;
  const [moved] = e.pageOrder.splice(fromIndex, 1);
  e.pageOrder.splice(toIndex, 0, moved);
  emit();
}

export function removePageFromOrder(id, pageIndex) {
  const e = files.find(f => f.id === id);
  if (!e || !e.pageOrder) return;
  e.pageOrder = e.pageOrder.filter(idx => idx !== pageIndex);
  emit();
}

export function restorePages(id) {
  const e = files.find(f => f.id === id);
  if (!e || e.pages === null) return;
  e.pageOrder = Array.from({ length: e.pages }, (_, i) => i);
  emit();
}

export function formatBytes(bytes) {
  if (bytes < 1024)           return bytes + ' B';
  if (bytes < 1024 * 1024)    return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
