import { auth, db, doc, getDoc, setDoc, increment, firebaseReady } from '../firebase';

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

/**
 * Syncs local stats to Firestore on login.
 */
export async function syncStatsWithCloud(user) {
  const targetUser = user || auth?.currentUser;
  if (!targetUser || !firebaseReady || !db) return;
  
  const local = getPrivacyStats();
  const ref = doc(db, 'users', targetUser.uid, 'private', 'stats');

  try {
    const snap = await getDoc(ref);
    const remote = snap.exists() ? snap.data() : defaults;

    const merged = {
      localJobs: Math.max(local.localJobs, remote.localJobs || 0),
      driveUploads: Math.max(local.driveUploads, remote.driveUploads || 0),
      cloudUploads: Math.max(local.cloudUploads, remote.cloudUploads || 0),
    };

    await setDoc(ref, merged, { merge: true });
    writeStats(merged);
    return merged;
  } catch (err) {
    console.warn('[PrivacyStats] Cloud sync failed:', err.message);
  }
}

async function updateCloudStat(field) {
  const user = auth?.currentUser;
  if (!user || !firebaseReady || !db) return;
  
  const ref = doc(db, 'users', user.uid, 'private', 'stats');
  try {
    await setDoc(ref, { [field]: increment(1) }, { merge: true });
  } catch (err) {
    console.warn('[PrivacyStats] Async cloud update failed:', err.message);
  }
}

export function bumpLocalJob() {
  const stats = getPrivacyStats();
  stats.localJobs += 1;
  writeStats(stats);
  updateCloudStat('localJobs');
  return stats;
}

export function bumpDriveUpload() {
  const stats = getPrivacyStats();
  stats.driveUploads += 1;
  writeStats(stats);
  updateCloudStat('driveUploads');
  return stats;
}

export function bumpCloudUpload() {
  const stats = getPrivacyStats();
  stats.cloudUploads += 1;
  writeStats(stats);
  updateCloudStat('cloudUploads');
  return stats;
}
