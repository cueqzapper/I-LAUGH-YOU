"use client";

import { useState, useCallback, useEffect } from "react";

export type FrameColor = "white" | "black" | "natural";

export interface CartItem {
  imageId: number;
  frameColor: FrameColor;
}

const STORAGE_KEY = "ily-cart";
const MAX_CART_ITEMS = 20;

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_CART_ITEMS) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage full or unavailable
  }
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  useEffect(() => {
    saveCart(items);
  }, [items]);

  const addItem = useCallback((imageId: number, frameColor: FrameColor = "black") => {
    setItems((prev) => {
      if (prev.some((item) => item.imageId === imageId)) return prev;
      if (prev.length >= MAX_CART_ITEMS) return prev;
      return [...prev, { imageId, frameColor }];
    });
  }, []);

  const removeItem = useCallback((imageId: number) => {
    setItems((prev) => prev.filter((item) => item.imageId !== imageId));
  }, []);

  const updateFrameColor = useCallback((imageId: number, frameColor: FrameColor) => {
    setItems((prev) =>
      prev.map((item) =>
        item.imageId === imageId ? { ...item, frameColor } : item
      )
    );
  }, []);

  const setAllFrameColors = useCallback((frameColor: FrameColor) => {
    setItems((prev) => prev.map((item) => ({ ...item, frameColor })));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const isInCart = useCallback(
    (imageId: number) => items.some((item) => item.imageId === imageId),
    [items]
  );

  return {
    items,
    itemCount: items.length,
    addItem,
    removeItem,
    updateFrameColor,
    setAllFrameColors,
    clearCart,
    isInCart,
    isFull: items.length >= MAX_CART_ITEMS,
  };
}
