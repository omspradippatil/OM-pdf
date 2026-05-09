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
import { syncStatsWithCloud } from '../services/privacyStats';
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
  const host = window.location.hostname;
  
  // Always use Redirect on mobile/tablets where popups are unreliable.
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) return true;

  // On localhost/dev, we usually try popup first, but redirect is safer for strict browsers.
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    // If the browser is modern Chrome, Brave, or Safari, redirects are often more stable
    // due to strict third-party cookie/iframe policies.
    const isBrave = !!(navigator.brave && navigator.brave.isBrave);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isBrave || isSafari) return true;
    return false;
  }
  
  if (import.meta.env.DEV) return false;
  
  try {
    if (window?.crossOriginIsolated) return true;
  } catch { /* ignore */ }

  const configuredAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  if (!configuredAuthDomain) return false;
  const authHost = String(configuredAuthDomain).replace(/^https?:\/\//, '').replace(/\/$/, '');
  
  // If we are on a custom domain (like netlify) but auth is on firebaseapp.com, 
  // popups often fail due to cross-site cookie restrictions.
  return authHost && authHost !== window.location.hostname;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError]     = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const redirectHandledRef = useRef(false);

  useEffect(() => {
    if (!firebaseReady || !auth) {
      setLoading(false);
      return;
    }

    let unsub = null;

    // We use a self-invoking async function to handle the initialization sequence
    (async () => {
      try {
        // 1. Check if we just returned from a redirect login
        const result = await getRedirectResult(auth);
        
        if (result?.user) {
          console.log('[OM PDF] Redirect login successful:', result.user.email);
          const intent = consumeAuthIntent() || 'login';
          const cred = GoogleAuthProvider.credentialFromResult(result);
          
          if (cred?.accessToken) {
            setDriveAccessToken(cred.accessToken, undefined, result.user.uid);
          }
          
          await ensureUserProfile(result.user);
          await syncStatsWithCloud(result.user);
          
          if (intent === 'login' || intent === 'drive') {
            setAuthSuccess('Sign-in successful!');
            setTimeout(() => setAuthSuccess(''), 5000);
            await logUserAction(result.user, 'sign_in', {
              status: 'success',
              meta: { provider: 'google', flow: 'redirect', intent }
            });
          }
        }
      } catch (e) {
        console.warn('[OM PDF] Redirect handling error:', e.message);
        setAuthError('Redirect sign-in failed. Please try again.');
      } finally {
        // 2. Start the main auth listener once redirect check is done
        unsub = onAuthStateChanged(auth, (u) => {
          setUser(u);
          setLoading(false);
          if (u) {
            loadStoredDriveToken(u.uid);
            void ensureUserProfile(u);
            void syncStatsWithCloud(u);
          } else {
            clearDriveAccessToken();
          }
        });
      }
    })();

    return () => {
      if (unsub) unsub();
    };
  }, []);

  const login = async () => {
    if (!firebaseReady || !auth) {
      const configErr = window.__FIREBASE_ERROR__ || 'Firebase environment variables are missing in Netlify settings.';
      setAuthError(`Configuration Error: ${configErr}`);
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
      setAuthSuccess('Successfully signed in!');
      setTimeout(() => setAuthSuccess(''), 5000);
      await logUserAction(result.user, 'sign_in', {
        status: 'success',
        meta: { provider: 'google', flow: 'popup', driveScope: true }
      });
    } catch (e) {
      // Popup can hang or throw under COOP/COEP or strict cross-site settings.
      const msg = String(e?.message || '');
      const code = String(e?.code || '');
      
      const isPopupBlocked = 
        msg.includes('Cross-Origin-Opener-Policy') || 
        msg.includes('window.closed') ||
        msg.includes('popup_closed_by_user') ||
        msg.includes('cancelled-by-user') ||
        msg.includes('Domains, protocols and ports must match') ||
        code.includes('auth/popup-closed-by-user') ||
        code.includes('auth/cancelled-by-user') ||
        code.includes('auth/internal-error');

      if (isPopupBlocked) {
        console.warn('[OM PDF] Popup blocked or failed. Falling back to Redirect flow...');
        try {
          setAuthIntent('login');
          await signInWithRedirect(auth, provider);
          return;
        } catch (e2) {
          console.error('Redirect fallback error:', e2);
          setAuthError('Sign-in redirect failed. Please check your browser settings.');
        }
      } else if (code === 'auth/invalid-credential' || msg.includes('invalid_client')) {
        setAuthError('Configuration Error: The Google Client Secret in your Firebase Console or .env is incorrect. Please check the setup instructions.');
      } else {
        console.error('Login error:', e);
        setAuthError(e?.message || 'Login failed');
      }
      
      await logUserAction(auth?.currentUser, 'sign_in', {
        status: 'error',
        meta: { error: e?.message || 'Login failed', code: e?.code }
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
    <AuthContext.Provider value={{ 
      user, loading, 
      authError, setAuthError, 
      authSuccess, setAuthSuccess,
      login, logout, ensureDriveToken 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
