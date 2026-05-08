import { db, doc, getDoc, setDoc, serverTimestamp } from '../firebase';

export async function ensureUserProfile(user) {
  if (!user) return false;
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
    console.warn('[UserProfile]', err);
    return false;
  }
}
