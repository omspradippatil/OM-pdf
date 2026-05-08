const STORAGE_KEY = 'om_pdf_recent_files';
const MAX_ITEMS = 8;

function safeParse(value) {
  try { return JSON.parse(value); } catch { return []; }
}

export function getRecentFiles(tool = null) {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const list = Array.isArray(safeParse(raw)) ? safeParse(raw) : [];
  if (!tool) return list;
  return list.filter(item => item.tool === tool);
}

export function addRecentFile(entry) {
  if (typeof window === 'undefined' || !entry?.name) return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const list = Array.isArray(safeParse(raw)) ? safeParse(raw) : [];
  const normalized = {
    id: entry.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    tool: entry.tool || 'unknown',
    name: entry.name,
    size: entry.size || 0,
    pages: entry.pages || null,
    createdAt: entry.createdAt || new Date().toISOString(),
    meta: entry.meta || {},
  };
  const filtered = list.filter(item => !(item.tool === normalized.tool && item.name === normalized.name));
  const next = [normalized, ...filtered].slice(0, MAX_ITEMS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearRecentFiles(tool = null) {
  if (typeof window === 'undefined') return [];
  if (!tool) {
    window.localStorage.removeItem(STORAGE_KEY);
    return [];
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const list = Array.isArray(safeParse(raw)) ? safeParse(raw) : [];
  const next = list.filter(item => item.tool !== tool);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
