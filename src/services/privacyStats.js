const STORAGE_KEY = 'om_pdf_privacy_stats';

const defaults = {
  localJobs: 0,
  driveUploads: 0,
  cloudUploads: 0,
};

function safeParse(value) {
  try { return JSON.parse(value); } catch { return null; }
}

export function getPrivacyStats() {
  if (typeof window === 'undefined') return { ...defaults };
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = safeParse(raw);
  return { ...defaults, ...(parsed || {}) };
}

function writeStats(next) {
  if (typeof window === 'undefined') return next;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function bumpLocalJob() {
  const stats = getPrivacyStats();
  stats.localJobs += 1;
  return writeStats(stats);
}

export function bumpDriveUpload() {
  const stats = getPrivacyStats();
  stats.driveUploads += 1;
  return writeStats(stats);
}

export function bumpCloudUpload() {
  const stats = getPrivacyStats();
  stats.cloudUploads += 1;
  return writeStats(stats);
}
