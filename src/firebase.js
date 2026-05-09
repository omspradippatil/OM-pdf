// firebase.js — initialised from environment variables (never hard-coded)
// Graceful degradation: if Firebase is not configured, the app works in local-only mode.
import { initializeApp }   from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  reauthenticateWithRedirect,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, where, getDocs, orderBy, deleteDoc, doc, setDoc, getDoc
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let app, auth, storage, db, provider;
let firebaseReady = false;

try {
  if (!firebaseConfig.apiKey) throw new Error('Missing VITE_FIREBASE_API_KEY');
  app      = initializeApp(firebaseConfig);
  auth     = getAuth(app);
  storage  = getStorage(app);
  db       = getFirestore(app);
  provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/drive.file');
  provider.setCustomParameters({ prompt: 'select_account' });
  firebaseReady = true;
} catch (err) {
  console.warn('[OM PDF] Firebase init skipped — local-only mode.', err.message);
  // Create safe no-op fallbacks so the rest of the app doesn't crash
  auth     = null;
  storage  = null;
  db       = null;
  provider = null;
}

export {
  firebaseReady,
  auth, provider, GoogleAuthProvider,
  signInWithPopup, signInWithRedirect, getRedirectResult, reauthenticateWithRedirect,
  signOut, onAuthStateChanged,
  storage, ref, uploadBytes, getDownloadURL, deleteObject,
  db, collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, deleteDoc, doc, setDoc, getDoc
};
