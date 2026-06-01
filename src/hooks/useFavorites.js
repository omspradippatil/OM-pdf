import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, firebaseReady } from '../firebase';

const FAVORITES_KEY = 'ompdf_favorites';

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Load from local storage initially
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load local favorites', e);
    }
  }, []);

  // Sync with Firestore if logged in
  useEffect(() => {
    if (!user || !firebaseReady || !db) return;
    const fetchFavs = async () => {
      try {
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);
        if (snap.exists() && snap.data().favorites) {
          const remoteFavs = snap.data().favorites;
          setFavorites((prev) => {
            // Merge remote and local (remote takes precedence)
            const merged = [...new Set([...remoteFavs, ...prev])];
            try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(merged)); } catch (e) {}
            return merged;
          });
        }
      } catch (err) {
        console.warn('Failed to load favorites from Firestore', err);
      }
    };
    fetchFavs();
  }, [user]);

  const toggleFavorite = async (toolKey) => {
    const newFavs = favorites.includes(toolKey)
      ? favorites.filter(k => k !== toolKey)
      : [toolKey, ...favorites];

    setFavorites(newFavs);

    // Save locally
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavs));
    } catch (e) {}

    // Save to Firestore if logged in
    if (user && firebaseReady && db) {
      try {
        const ref = doc(db, 'users', user.uid);
        await setDoc(ref, { favorites: newFavs }, { merge: true });
      } catch (err) {
        console.warn('Failed to save favorites to Firestore', err);
      }
    }
  };

  return { favorites, toggleFavorite };
}
