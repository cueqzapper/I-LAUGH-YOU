"use client";

import { useState, useCallback, useEffect } from "react";

export type FrameColor = "white" | "black" | "natural";

export interface CartItem {
  imageId: number;
  frameColor: FrameColor;
}

const FAVORITES_KEY = "ily-favorites";
const COLORS_KEY = "ily-cart-colors";
const MAX_CART_ITEMS = 20;

/** Read basket imageIds from the favorites store */
function loadBasketIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.basket) ? parsed.basket.slice(0, MAX_CART_ITEMS) : [];
  } catch {
    return [];
  }
}

/** Read per-item frame colors */
function loadColors(): Record<number, FrameColor> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(COLORS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<number, FrameColor>;
  } catch {
    return {};
  }
}

function saveColors(colors: Record<number, FrameColor>) {
  try {
    localStorage.setItem(COLORS_KEY, JSON.stringify(colors));
  } catch {
    // localStorage full or unavailable
  }
}

function removeFromFavoritesBasket(imageId: number) {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.basket)) return;
    parsed.basket = parsed.basket.filter((id: number) => id !== imageId);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

function clearFavoritesBasket() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.basket = [];
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

export function useCart() {
  const [basketIds, setBasketIds] = useState<number[]>([]);
  const [colors, setColors] = useState<Record<number, FrameColor>>({});
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    setBasketIds(loadBasketIds());
    setColors(loadColors());
    setHydrated(true);
  }, []);

  // Listen for storage changes (when home page modifies favorites)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === FAVORITES_KEY) {
        setBasketIds(loadBasketIds());
      }
    };
    window.addEventListener("storage", onStorage);

    // Also poll for same-tab changes (storage event only fires cross-tab)
    const interval = setInterval(() => {
      const current = loadBasketIds();
      setBasketIds((prev) => {
        if (prev.length !== current.length || prev.some((id, i) => id !== current[i])) {
          return current;
        }
        return prev;
      });
    }, 500);

    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(interval);
    };
  }, []);

  // Build CartItem[] from basketIds + colors
  const items: CartItem[] = basketIds.map((imageId) => ({
    imageId,
    frameColor: colors[imageId] || "black",
  }));

  const removeItem = useCallback((imageId: number) => {
    removeFromFavoritesBasket(imageId);
    setBasketIds((prev) => prev.filter((id) => id !== imageId));
    setColors((prev) => {
      const next = { ...prev };
      delete next[imageId];
      saveColors(next);
      return next;
    });
  }, []);

  const updateFrameColor = useCallback((imageId: number, frameColor: FrameColor) => {
    setColors((prev) => {
      const next = { ...prev, [imageId]: frameColor };
      saveColors(next);
      return next;
    });
  }, []);

  const setAllFrameColors = useCallback((frameColor: FrameColor) => {
    setColors((prev) => {
      const next: Record<number, FrameColor> = {};
      for (const id of loadBasketIds()) {
        next[id] = frameColor;
      }
      saveColors(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    clearFavoritesBasket();
    setBasketIds([]);
    setColors({});
    saveColors({});
  }, []);

  const isInCart = useCallback(
    (imageId: number) => basketIds.includes(imageId),
    [basketIds]
  );

  return {
    items,
    itemCount: hydrated ? basketIds.length : 0,
    addItem: useCallback(() => {}, []), // items are added via useFavorites on home page
    removeItem,
    updateFrameColor,
    setAllFrameColors,
    clearCart,
    isInCart,
    isFull: basketIds.length >= MAX_CART_ITEMS,
  };
}
