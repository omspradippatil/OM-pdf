import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, provider, signInWithPopup, signOut, onAuthStateChanged } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error('Login error:', e);
    }
  };

  const logout = async () => {
    try { await signOut(auth); } catch (e) { console.error(e); }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
