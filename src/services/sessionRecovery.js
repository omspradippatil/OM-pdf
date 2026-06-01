import { get, set, del } from 'idb-keyval';

/**
 * Saves a list of File objects and any associated state to IndexedDB for crash recovery.
 * IndexedDB natively supports storing File and Blob objects via structured cloning.
 * 
 * @param {string} sessionKey - Unique key for the tool (e.g. 'merge_session')
 * @param {File[]} files - Array of File objects to save
 * @param {object} metadata - Any extra state (e.g. order, settings)
 */
export async function saveSession(sessionKey, files, metadata = {}) {
  try {
    await set(sessionKey, { files, metadata, timestamp: Date.now() });
  } catch (err) {
    console.error('Failed to save session to IndexedDB:', err);
  }
}

/**
 * Retrieves a saved session from IndexedDB.
 * Returns null if no session exists or if it's older than maxAgeMs.
 * 
 * @param {string} sessionKey 
 * @param {number} maxAgeMs - Default 24 hours
 * @returns {object|null} - { files: File[], metadata: object }
 */
export async function loadSession(sessionKey, maxAgeMs = 24 * 60 * 60 * 1000) {
  try {
    const session = await get(sessionKey);
    if (!session) return null;

    if (Date.now() - session.timestamp > maxAgeMs) {
      await clearSession(sessionKey);
      return null;
    }

    return session;
  } catch (err) {
    console.error('Failed to load session from IndexedDB:', err);
    return null;
  }
}

export async function clearSession(sessionKey) {
  try {
    await del(sessionKey);
  } catch (err) {
    console.error('Failed to clear session from IndexedDB:', err);
  }
}
