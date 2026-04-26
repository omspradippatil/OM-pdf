// fileManager.js – manages the in-memory file list and emits change events

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

let files = []; // { id, file, name, size, pages }
let nextId = 0;

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  listeners.forEach(fn => fn([...files]));
}

export function getFiles() {
  return [...files];
}

/**
 * Add File objects; returns { added, warnings[] }
 */
export function addFiles(rawFiles) {
  const warnings = [];
  let added = 0;

  for (const file of rawFiles) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      warnings.push(`"${file.name}" is not a PDF file and was skipped.`);
      continue;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      warnings.push(`"${file.name}" exceeds the ${MAX_FILE_SIZE_MB} MB limit and was skipped.`);
      continue;
    }
    // Avoid duplicates by name+size
    const isDupe = files.some(f => f.name === file.name && f.size === file.size);
    if (isDupe) {
      warnings.push(`"${file.name}" is already in the list.`);
      continue;
    }
    files.push({ id: nextId++, file, name: file.name, size: file.size, pages: null });
    added++;
  }

  emit();
  return { added, warnings };
}

export function removeFile(id) {
  files = files.filter(f => f.id !== id);
  emit();
}

export function clearFiles() {
  files = [];
  emit();
}

export function reorderFiles(fromIndex, toIndex) {
  if (fromIndex === toIndex) return;
  const [moved] = files.splice(fromIndex, 1);
  files.splice(toIndex, 0, moved);
  emit();
}

export function setPageCount(id, pages) {
  const entry = files.find(f => f.id === id);
  if (entry) {
    entry.pages = pages;
    emit();
  }
}

export function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
