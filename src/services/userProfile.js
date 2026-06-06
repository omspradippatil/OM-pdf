import { db, doc, getDoc, setDoc, serverTimestamp, firebaseReady } from '../firebase';

export async function ensureUserProfile(user) {
  if (!user || !firebaseReady || !db) return false;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    const profile = {
      uid: user.uid,
      email: user.email || null,
      displayName: user.displayName || null,
      photoURL: user.photoURL || null,
      provider: user.providerData?.[0]?.providerId || 'google.com',
      lastLoginAt: serverTimestamp(),
    };
    if (!snap.exists()) {
      await setDoc(ref, { ...profile, createdAt: serverTimestamp() }, { merge: true });
    } else {
      await setDoc(ref, profile, { merge: true });
    }
    return true;
  } catch (err) {
    console.warn('[UserProfile]', err.message);
    return false;
  }
}

export async function deleteUserAccountData(uid) {
  if (!uid || !firebaseReady || !db) return false;
  try {
    const statsRef = doc(db, 'users', uid, 'private', 'stats');
    const userRef = doc(db, 'users', uid);
    
    // We cannot do bulk deletes natively on the client without firing multiple delete calls, 
    // so we delete what we know exists under users/{uid}
    try {
      await import('firebase/firestore').then(m => m.deleteDoc(statsRef));
    } catch(e) { /* ignore if missing */ }
    
    await import('firebase/firestore').then(m => m.deleteDoc(userRef));
    return true;
  } catch (err) {
    console.error('[UserProfile] Failed to delete user data:', err.message);
    return false;
  }
}
