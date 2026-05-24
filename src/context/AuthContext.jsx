import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  auth,
  firebaseReady,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
} from '../firebase';
import {
  clearDriveAccessToken,
  hasDriveAccess,
  isTokenExpiringSoon,
  loadStoredDriveToken,
  setDriveAccessToken,
} from '../services/googleDrive';
import { ensureUserProfile } from '../services/userProfile';
import { syncStatsWithCloud } from '../services/privacyStats';
import { logUserAction } from '../services/activityLog';
import {
  cfDriveStatus,
  cfRefreshToken,
  cfRevokeToken,
  workerAvailable,
} from '../services/cfTokenService';

const AuthContext = createContext(null);

const AUTH_INTENT_KEY = 'om_pdf_auth_intent';
const SUCCESS_TIMEOUT_MS = 5000;
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_REFRESH_INTERVAL_MS = 50 * 60 * 1000;

function setAuthIntent(intent) {
  try {
    sessionStorage.setItem(AUTH_INTENT_KEY, intent);
  } catch {
    /* storage can be blocked in private mode */
  }
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

function isMobileBrowser() {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isPopupRecoverable(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return [
    'auth/popup-blocked',
    'auth/popup-closed-by-user',
    'auth/cancelled-popup-request',
    'auth/internal-error',
    'auth/operation-not-supported-in-this-environment',
  ].some((item) => code.includes(item))
    || message.includes('Cross-Origin-Opener-Policy')
    || message.includes('window.closed')
    || message.includes('popup')
    || message.includes('cancelled-by-user')
    || message.includes('Domains, protocols and ports must match');
}

function getAuthErrorMessage(error) {
  const code = String(error?.code || '');
  if (code.includes('auth/popup-closed-by-user') || code.includes('auth/cancelled-popup-request')) {
    return 'Google sign-in was cancelled.';
  }
  if (code.includes('auth/popup-blocked')) {
    return 'The browser blocked the Google sign-in popup. Redirect sign-in will be used instead.';
  }
  if (code.includes('auth/unauthorized-domain')) {
    return 'This domain is not authorized in Firebase Authentication settings.';
  }
  if (code.includes('auth/network-request-failed')) {
    return 'Network error during Google sign-in. Check your connection and try again.';
  }
  if (code.includes('auth/account-exists-with-different-credential')) {
    return 'An account already exists with a different sign-in method.';
  }
  if (code.includes('auth/invalid-api-key') || code.includes('auth/invalid-credential')) {
    return 'Firebase authentication is misconfigured. Check the Firebase API key and Google provider settings.';
  }
  return error?.message || 'Google sign-in failed. Please try again.';
}

function shouldUseRedirect() {
  if (typeof window === 'undefined') return false;
  if (isMobileBrowser()) return true;
  try {
    if (window.crossOriginIsolated) return true;
  } catch {
    /* ignore */
  }
  return false;
}

function createGoogleProvider({ prompt, loginHint, drive } = {}) {
  const googleProvider = new GoogleAuthProvider();
  googleProvider.addScope('profile');
  googleProvider.addScope('email');
  if (drive) {
    googleProvider.addScope(DRIVE_SCOPE);
  }

  const params = {};
  if (prompt) params.prompt = prompt;
  if (loginHint) params.login_hint = loginHint;
  if (Object.keys(params).length) googleProvider.setCustomParameters(params);
  return googleProvider;
}

async function finishSignedInUser(user) {
  if (!user) return;
  try {
    await ensureUserProfile(user);
    await syncStatsWithCloud(user);
  } catch (err) {
    console.warn('[Auth] Ignored user profile/stats sync error (possibly blocked by client):', err);
  }
}

function saveTokenFromResult(result, drive) {
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (credential?.accessToken && drive) {
    setDriveAccessToken(credential.accessToken, undefined, result.user.uid);
    return true;
  }
  return false;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);
  const authActionRef = useRef(false);
  const successTimerRef = useRef(null);
  const driveRefreshPromiseRef = useRef(null);

  const showSuccess = useCallback((message) => {
    setAuthSuccess(message);
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => setAuthSuccess(''), SUCCESS_TIMEOUT_MS);
  }, []);

  useEffect(() => () => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
  }, []);

  const refreshDriveFromWorker = useCallback(async (currentUser, { force = false } = {}) => {
    if (!currentUser || !workerAvailable()) return false;
    if (!force) {
      loadStoredDriveToken(currentUser.uid);
      if (hasDriveAccess() && !isTokenExpiringSoon()) {
        setDriveConnected(true);
        return true;
      }
    }

    if (driveRefreshPromiseRef.current) return driveRefreshPromiseRef.current;

    driveRefreshPromiseRef.current = (async () => {
      try {
        const idToken = await currentUser.getIdToken();
        const result = await cfRefreshToken(idToken);
        if (result?.access_token) {
          setDriveAccessToken(result.access_token, result.expires_in * 1000, currentUser.uid);
          setDriveConnected(true);
          return true;
        }
        if (result?.needs_reauth) {
          setDriveConnected(false);
          return false;
        }

        const status = await cfDriveStatus(idToken);
        if (status?.connected) {
          setDriveConnected(true);
          return false;
        }
        setDriveConnected(false);
        return false;
      } catch (error) {
        console.warn('[Auth] Silent Drive refresh failed:', error);
        return false;
      } finally {
        driveRefreshPromiseRef.current = null;
      }
    })();

    return driveRefreshPromiseRef.current;
  }, []);

  useEffect(() => {
    if (!firebaseReady || !auth) {
      setLoading(false);
      return undefined;
    }

    let unsubscribe = null;
    let cancelled = false;

    async function bootAuth() {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          const intent = consumeAuthIntent() || 'login';
          const drive = intent === 'drive';

          await finishSignedInUser(result.user);
          saveTokenFromResult(result, drive);

          if (!drive) showSuccess('Signed in with Google.');
          await logUserAction(result.user, 'sign_in', {
            status: 'success',
            meta: { provider: 'google', flow: 'redirect', intent },
          }).catch(() => {});
        }
      } catch (error) {
        console.warn('[Auth] Redirect result failed:', error);
        setAuthError(getAuthErrorMessage(error));
      } finally {
        if (cancelled) return;
        unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
          setUser(nextUser);
          setLoading(false);
          if (nextUser) {
            const hasCachedToken = loadStoredDriveToken(nextUser.uid);
            setDriveConnected(hasCachedToken);
            void refreshDriveFromWorker(nextUser, { force: !hasCachedToken || isTokenExpiringSoon() });
            void finishSignedInUser(nextUser);
          } else {
            clearDriveAccessToken();
            setDriveConnected(false);
          }
        });
      }
    }

    void bootAuth();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [showSuccess, refreshDriveFromWorker]);

  useEffect(() => {
    const currentUser = auth?.currentUser || user;
    if (!currentUser) return undefined;

    const refreshIfNeeded = () => {
      loadStoredDriveToken(currentUser.uid);
      if (isTokenExpiringSoon()) {
        void refreshDriveFromWorker(currentUser, { force: true });
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshIfNeeded();
    };

    refreshIfNeeded();
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', refreshIfNeeded);
    const timer = window.setInterval(refreshIfNeeded, DRIVE_REFRESH_INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', refreshIfNeeded);
      window.clearInterval(timer);
    };
  }, [user, refreshDriveFromWorker]);

  const login = useCallback(async ({ drive = true } = {}) => {
    if (!firebaseReady || !auth) {
      const configErr = window.__FIREBASE_ERROR__ || 'Firebase environment variables are missing.';
      setAuthError(`Configuration error: ${configErr}`);
      return false;
    }
    if (authActionRef.current) return false;

    authActionRef.current = true;
    setAuthBusy(true);
    setAuthError('');

    const intent = drive ? 'drive' : 'login';
    const provider = createGoogleProvider({
      prompt: 'select_account',
      loginHint: auth.currentUser?.email || undefined,
      drive,
    });

    try {
      if (shouldUseRedirect()) {
        setAuthIntent(intent);
        await signInWithRedirect(auth, provider);
        return false;
      }

      const result = await signInWithPopup(auth, provider);
      await finishSignedInUser(result.user);
      saveTokenFromResult(result, drive);

      if (!drive) showSuccess('Signed in with Google.');
      await logUserAction(result.user, 'sign_in', {
        status: 'success',
        meta: { provider: 'google', flow: 'popup', intent },
      }).catch(() => {});
      return true;
    } catch (error) {
      if (isPopupRecoverable(error) && !shouldUseRedirect()) {
        try {
          setAuthIntent(intent);
          await signInWithRedirect(auth, provider);
          return false;
        } catch (redirectError) {
          console.error('[Auth] Redirect fallback failed:', redirectError);
          setAuthError(getAuthErrorMessage(redirectError));
        }
      } else {
        console.error('[Auth] Login failed:', error);
        setAuthError(getAuthErrorMessage(error));
      }

      await logUserAction(auth.currentUser, 'sign_in', {
        status: 'error',
        meta: { code: error?.code || null, error: error?.message || 'Login failed', intent },
      }).catch(() => {});
      return false;
    } finally {
      authActionRef.current = false;
      setAuthBusy(false);
    }
  }, [showSuccess]);

  const logout = useCallback(async () => {
    if (!firebaseReady || !auth || authActionRef.current) return;
    const currentUser = auth.currentUser;
    authActionRef.current = true;
    setAuthBusy(true);
    setAuthError('');

    try {
      if (workerAvailable()) {
        const idToken = await currentUser?.getIdToken().catch(() => null);
        if (idToken) {
          // Revoke token on the Worker (non-blocking)
          cfRevokeToken(idToken).catch(() => {});
        }
      }
      clearDriveAccessToken();
      setDriveConnected(false);
      await logUserAction(currentUser, 'sign_out', { status: 'success' }).catch(() => {});
      await signOut(auth);
      showSuccess('Signed out.');
    } catch (error) {
      console.error('[Auth] Logout failed:', error);
      setAuthError(getAuthErrorMessage(error));
      await logUserAction(currentUser, 'sign_out', {
        status: 'error',
        meta: { error: error?.message || 'Logout failed' },
      }).catch(() => {});
    } finally {
      authActionRef.current = false;
      setAuthBusy(false);
    }
  }, [showSuccess]);

  const ensureDriveToken = useCallback(async (force = false, { interactive = true } = {}) => {
    if (!firebaseReady || !auth) throw new Error('Firebase is not configured.');
    const currentUser = auth.currentUser || user;
    if (!currentUser) throw new Error('Sign in with Google first.');

    if (!force) {
      loadStoredDriveToken(currentUser.uid);
      if (hasDriveAccess() && !isTokenExpiringSoon()) {
        setDriveConnected(true);
        return true;
      }
    }

    try {
      // Try the Cloudflare Worker refresh path first.
      const refreshed = await refreshDriveFromWorker(currentUser, { force: true });
      if (refreshed) return true;

      if (!interactive) {
        return false;
      }

      // If the Worker cannot refresh, fall back to an explicit user-facing reauth.
      const success = await login({ drive: true, silent: false });
      if (!success) throw new Error('Could not refresh Google Drive token.');
      return true;
    } catch (error) {
      console.error('[Auth] Drive re-auth failed:', error);
      throw new Error(getAuthErrorMessage(error));
    }
  }, [user, login, refreshDriveFromWorker]);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      authBusy,
      authError,
      setAuthError,
      authSuccess,
      setAuthSuccess,
      login,
      logout,
      ensureDriveToken,
      driveConnected,
      setDriveConnected,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
