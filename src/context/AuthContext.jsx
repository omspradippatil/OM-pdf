import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { reauthenticateWithPopup } from 'firebase/auth';
import {
  auth, provider, GoogleAuthProvider, firebaseReady,
  signInWithPopup, signInWithRedirect, getRedirectResult,
  reauthenticateWithRedirect,
  signOut, onAuthStateChanged
} from '../firebase';
import {
  setDriveAccessToken, clearDriveAccessToken,
  hasDriveAccess, loadStoredDriveToken
} from '../services/googleDrive';
import { ensureUserProfile } from '../services/userProfile';
import { logUserAction } from '../services/activityLog';

const AuthContext = createContext(null);

const AUTH_INTENT_KEY = 'om_pdf_auth_intent';

function setAuthIntent(intent) {
  try { sessionStorage.setItem(AUTH_INTENT_KEY, intent); } catch { /* ignore */ }
}

function consumeAuthIntent() {
  try {
    const intent = sessionStorage.getItem(AUTH_INTENT_KEY);
    sessionStorage.removeItem(AUTH_INTENT_KEY);
    return intent;
  } catch {
    return null;
  }
}

function shouldPreferRedirectAuth() {
  // Popup flow breaks when the app is cross-origin isolated (COOP/COEP)
  // OR when the Firebase `authDomain` differs from the app origin (common on Netlify).
  // On localhost/dev, prefer popup (redirect can be impacted by strict privacy settings).
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false;
  if (import.meta.env.DEV) return false;
  try {
    if (window?.crossOriginIsolated) return true;
  } catch {
    // ignore
  }
  const configuredAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  if (!configuredAuthDomain) return false;
  const authHost = String(configuredAuthDomain).replace(/^https?:\/\//, '').replace(/\/$/, '');
  return authHost && authHost !== window.location.hostname;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const redirectHandledRef = useRef(false);

  useEffect(() => {
    if (!firebaseReady || !auth) {
      setLoading(false);
      return;
    }

    // Handle redirect-based sign-in / reauth results (works with COOP/COEP).
    // This must run once on load before/alongside onAuthStateChanged.
    (async () => {
      try {
        if (redirectHandledRef.current) return;
        redirectHandledRef.current = true;
        const result = await getRedirectResult(auth);
        if (!result?.user) return;

        const intent = consumeAuthIntent() || 'login';
        const cred = GoogleAuthProvider.credentialFromResult(result);
        if (cred?.accessToken) {
          setDriveAccessToken(cred.accessToken, undefined, result.user.uid);
        }
        await ensureUserProfile(result.user);

        if (intent === 'login') {
          await logUserAction(result.user, 'sign_in', {
            status: 'success',
            meta: { provider: 'google', flow: 'redirect' }
          });
        }
      } catch (e) {
        // Redirect result isn't always present; ignore unless it's a real auth failure.
        console.warn('[OM PDF] Redirect auth handling error:', e);
      }
    })();

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        loadStoredDriveToken(u.uid);
        void ensureUserProfile(u);
      } else {
        clearDriveAccessToken();
      }
    });
    return unsub;
  }, []);

  const login = async () => {
    if (!firebaseReady || !auth) {
      console.warn('[OM PDF] Firebase not configured — sign-in unavailable.');
      return;
    }
    setAuthError('');
    try {
      if (shouldPreferRedirectAuth()) {
        setAuthIntent('login');
        await signInWithRedirect(auth, provider);
        return; // navigation
      }

      const result = await signInWithPopup(auth, provider);
      const cred = GoogleAuthProvider.credentialFromResult(result);
      if (cred?.accessToken) setDriveAccessToken(cred.accessToken, undefined, result.user.uid);
      await ensureUserProfile(result.user);
      await logUserAction(result.user, 'sign_in', {
        status: 'success',
        meta: { provider: 'google', flow: 'popup', driveScope: true }
      });
    } catch (e) {
      // Popup can hang or throw under COOP/COEP; if it errors, fall back to redirect.
      const msg = String(e?.message || '');
      const isPopupBlockedByCoop = msg.includes('Cross-Origin-Opener-Policy') || msg.includes('window.closed');
      if (isPopupBlockedByCoop) {
        try {
          setAuthIntent('login');
          await signInWithRedirect(auth, provider);
          return;
        } catch (e2) {
          console.error('Redirect fallback error:', e2);
        }
      }

      console.error('Login error:', {
        code: e?.code,
        message: e?.message,
        customData: e?.customData,
        name: e?.name,
      });
      setAuthError(e?.message || 'Login failed');
      await logUserAction(auth?.currentUser, 'sign_in', {
        status: 'error',
        meta: { error: e?.message || 'Login failed' }
      });
    }
  };

  const logout = async () => {
    if (!firebaseReady || !auth) return;
    const u = auth.currentUser;
    try {
      await signOut(auth);
      clearDriveAccessToken();
      await logUserAction(u, 'sign_out', { status: 'success' });
    } catch (e) {
      console.error(e);
      await logUserAction(u, 'sign_out', { status: 'error', meta: { error: e?.message || 'Logout failed' } });
    }
  };

  const ensureDriveToken = async (force = false) => {
    if (!firebaseReady || !auth) throw new Error('Firebase not configured.');
    if (user && !hasDriveAccess()) {
      loadStoredDriveToken(user.uid);
    }
    if (!force && hasDriveAccess()) return true;
    if (!auth.currentUser) throw new Error('Not signed in.');

    if (shouldPreferRedirectAuth()) {
      setAuthIntent('drive');
      await reauthenticateWithRedirect(auth.currentUser, provider);
      return false; // navigation
    }

    try {
      const result = await reauthenticateWithPopup(auth.currentUser, provider);
      const cred = GoogleAuthProvider.credentialFromResult(result);
      if (!cred?.accessToken) throw new Error('Drive access not granted.');
      setDriveAccessToken(cred.accessToken, undefined, auth.currentUser.uid);
      return true;
    } catch (e) {
      const msg = String(e?.message || '');
      const isPopupBlockedByCoop = msg.includes('Cross-Origin-Opener-Policy') || msg.includes('window.closed');
      if (isPopupBlockedByCoop) {
        setAuthIntent('drive');
        await reauthenticateWithRedirect(auth.currentUser, provider);
        return false; // navigation
      }
      console.error('Reauth error:', {
        code: e?.code,
        message: e?.message,
        customData: e?.customData,
        name: e?.name,
      });
      throw e;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, authError, setAuthError, login, logout, ensureDriveToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
