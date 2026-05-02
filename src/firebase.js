// firebase.js — initialised from environment variables (never hard-coded)
import { initializeApp }   from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, where, getDocs, orderBy, deleteDoc, doc
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

const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const storage  = getStorage(app);
const db       = getFirestore(app);
const provider = new GoogleAuthProvider();

export {
  auth, provider,
  signInWithPopup, signOut, onAuthStateChanged,
  storage, ref, uploadBytes, getDownloadURL, deleteObject,
  db, collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, deleteDoc, doc
};
