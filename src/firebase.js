// firebase.js — initialised from environment variables (never hard-coded)
// Graceful degradation: if Firebase is not configured, the app works in local-only mode.
import { initializeApp }   from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  reauthenticateWithPopup,
  reauthenticateWithRedirect,
  setPersistence,
  browserLocalPersistence,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, where, getDocs, orderBy, deleteDoc, doc, setDoc, getDoc,
  increment
} from 'firebase/firestore';

const isCloudflarePages = typeof window !== 'undefined' && window.location.hostname.includes('pages.dev');

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  // Use the current domain on Cloudflare Pages to bypass third-party cookie restrictions.
  authDomain:        isCloudflarePages ? window.location.hostname : import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
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
  // Ensure auth survives reloads (some browsers can default to session-only).
  setPersistence(auth, browserLocalPersistence).catch(() => {
    // Ignore persistence errors (private mode / blocked storage).
  });
  storage  = getStorage(app);
  db       = getFirestore(app);
  provider = new GoogleAuthProvider();
  firebaseReady = true;
} catch (err) {
  const missingVar = err.message.includes('VITE_FIREBASE_') ? err.message : '';
  console.warn('[OM PDF] Firebase init skipped.', err.message);
  auth = null; storage = null; db = null; provider = null;
  firebaseReady = false;
  window.__FIREBASE_ERROR__ = missingVar || err.message;
}

export {
  firebaseReady,
  auth, provider, GoogleAuthProvider,
  signInWithPopup, signInWithRedirect, getRedirectResult, reauthenticateWithPopup, reauthenticateWithRedirect,
  signOut, onAuthStateChanged,
  storage, ref, uploadBytes, getDownloadURL, deleteObject,
  db, collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, deleteDoc, doc, setDoc, getDoc,
  increment
};
