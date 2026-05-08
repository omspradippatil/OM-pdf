import React, { createContext, useContext, useEffect, useState } from 'react';
import { reauthenticateWithPopup } from 'firebase/auth';
import {
  auth, provider, GoogleAuthProvider,
  signInWithPopup, signOut, onAuthStateChanged
} from '../firebase';
import {
  setDriveAccessToken, clearDriveAccessToken,
  hasDriveAccess, loadStoredDriveToken
} from '../services/googleDrive';
import { ensureUserProfile } from '../services/userProfile';
import { logUserAction } from '../services/activityLog';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    try {
      const result = await signInWithPopup(auth, provider);
      const cred = GoogleAuthProvider.credentialFromResult(result);
      if (cred?.accessToken) {
        setDriveAccessToken(cred.accessToken, undefined, result.user.uid);
      }
      await ensureUserProfile(result.user);
      await logUserAction(result.user, 'sign_in', {
        status: 'success',
        meta: { provider: 'google', driveScope: true }
      });
    } catch (e) {
      console.error('Login error:', e);
      await logUserAction(auth.currentUser, 'sign_in', {
        status: 'error',
        meta: { error: e?.message || 'Login failed' }
      });
    }
  };

  const logout = async () => {
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
    if (user && !hasDriveAccess()) {
      loadStoredDriveToken(user.uid);
    }
    if (!force && hasDriveAccess()) return true;
    if (!auth.currentUser) throw new Error('Not signed in.');
    const result = await reauthenticateWithPopup(auth.currentUser, provider);
    const cred = GoogleAuthProvider.credentialFromResult(result);
    if (!cred?.accessToken) throw new Error('Drive access not granted.');
    setDriveAccessToken(cred.accessToken, undefined, auth.currentUser.uid);
    return true;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, ensureDriveToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
