import { useState, useEffect } from 'react';

const FAVORITES_KEY = 'ompdf_favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load favorites', e);
    }
  }, []);

  const toggleFavorite = (toolKey) => {
    setFavorites((prev) => {
      let newFavs;
      if (prev.includes(toolKey)) {
        newFavs = prev.filter(k => k !== toolKey);
      } else {
        newFavs = [toolKey, ...prev]; // Push to front
      }
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavs));
      } catch (e) {}
      return newFavs;
    });
  };

  return { favorites, toggleFavorite };
}
