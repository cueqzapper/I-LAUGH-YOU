"use client";

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "ily-favorites";

interface StoredFavorites {
  basket: number[];
}

function loadFromStorage(): StoredFavorites {
  if (typeof window === "undefined") return { basket: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { basket: [] };
    const parsed = JSON.parse(raw) as { basket?: unknown };
    return {
      basket: Array.isArray(parsed.basket)
        ? parsed.basket.filter((x): x is number => typeof x === "number")
        : [],
    };
  } catch {
    return { basket: [] };
  }
}

function saveToStorage(basket: Set<number>) {
  try {
    // Preserve any unrelated fields the storage might already contain
    // (e.g. legacy `liked` / `sofaPlacements`) by reading then merging,
    // but only write the `basket` field as our authoritative output.
    let existing: Record<string, unknown> = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) existing = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      existing = {};
    }
    const data: Record<string, unknown> = { ...existing, basket: [...basket] };
    // Drop legacy fields so they don't keep growing.
    delete data.liked;
    delete data.sofaPlacements;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable
  }
}

export function useFavorites() {
  const [basketIds, setBasketIds] = useState<Set<number>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    const stored = loadFromStorage();
    setBasketIds(new Set(stored.basket));
    setHydrated(true);
  }, []);

  // Persist on change (only after hydration to avoid overwriting with empty state)
  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(basketIds);
  }, [basketIds, hydrated]);

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

  return {
    basketIds,
    toggleBasket,
  };
}
