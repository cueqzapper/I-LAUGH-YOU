"use client";

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "ily-favorites";

export type SofaPlacements = [number | null, number | null, number | null];

interface StoredFavorites {
  liked: number[];
  basket: number[];
  sofaPlacements?: [number | null, number | null, number | null];
}

function loadFromStorage(): StoredFavorites {
  if (typeof window === "undefined") return { liked: [], basket: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { liked: [], basket: [] };
    const parsed = JSON.parse(raw) as StoredFavorites;
    return {
      liked: Array.isArray(parsed.liked) ? parsed.liked : [],
      basket: Array.isArray(parsed.basket) ? parsed.basket : [],
      sofaPlacements: Array.isArray(parsed.sofaPlacements)
        ? [
            parsed.sofaPlacements[0] ?? null,
            parsed.sofaPlacements[1] ?? null,
            parsed.sofaPlacements[2] ?? null,
          ]
        : undefined,
    };
  } catch {
    return { liked: [], basket: [] };
  }
}

function saveToStorage(
  liked: Set<number>,
  basket: Set<number>,
  sofaPlacements: SofaPlacements
) {
  try {
    const data: StoredFavorites = {
      liked: [...liked],
      basket: [...basket],
      sofaPlacements,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable
  }
}

export function useFavorites() {
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [basketIds, setBasketIds] = useState<Set<number>>(new Set());
  const [sofaPlacements, setSofaPlacements] = useState<SofaPlacements>([null, null, null]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    const stored = loadFromStorage();
    setLikedIds(new Set(stored.liked));
    setBasketIds(new Set(stored.basket));
    setSofaPlacements(stored.sofaPlacements ?? [null, null, null]);
    setHydrated(true);
  }, []);

  // Persist on change (only after hydration to avoid overwriting with empty state)
  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(likedIds, basketIds, sofaPlacements);
  }, [likedIds, basketIds, sofaPlacements, hydrated]);

  const toggleLike = useCallback((id: number) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // Also clear any sofa slot that has this id
        setSofaPlacements((prevPlacements) => {
          const updated: SofaPlacements = [...prevPlacements];
          let changed = false;
          for (let i = 0; i < 3; i++) {
            if (updated[i] === id) {
              updated[i] = null;
              changed = true;
            }
          }
          return changed ? updated : prevPlacements;
        });
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleBasket = useCallback((id: number) => {
    setBasketIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const setSofaPlacement = useCallback(
    (slot: number, imageId: number | null) => {
      setSofaPlacements((prev) => {
        const next: SofaPlacements = [...prev];
        next[slot as 0 | 1 | 2] = imageId;
        return next;
      });
    },
    []
  );

  return {
    likedIds,
    basketIds,
    toggleLike,
    toggleBasket,
    sofaPlacements,
    setSofaPlacement,
  };
}
