import { db, collection, addDoc, serverTimestamp } from '../firebase';

export async function logUserAction(user, action, payload = {}) {
  if (!action) return false;
  const { status = 'success', tool = null, meta = {} } = payload;
  try {
    await addDoc(collection(db, 'logs'), {
      uid: user?.uid || 'anonymous',
      email: user?.email || 'anonymous',
      displayName: user?.displayName || 'anonymous',
      action,
      tool,
      status,
      meta,
      createdAt: serverTimestamp(),
      clientTime: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.warn('[ActivityLog]', err);
    return false;
  }
}
