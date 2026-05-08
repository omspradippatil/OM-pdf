import { db, collection, addDoc, serverTimestamp } from '../firebase';

export async function logUserAction(user, action, payload = {}) {
  if (!action) return false;
  const { status = 'success', tool = null, meta = {} } = payload;
  
  // Debug log to console to verify tracking is triggering
  console.log(`[ActivityLog] Triggering: ${action} | Tool: ${tool} | Status: ${status}`);

  try {
    const docRef = await addDoc(collection(db, 'logs'), {
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
    console.log('[ActivityLog] Success: Document ID:', docRef.id);
    return true;
  } catch (err) {
    console.error('[ActivityLog] Critical Error:', err);
    // If it's a permission error, it will show up here
    return false;
  }
}
