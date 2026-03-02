"use client";

import { useState, useCallback, useEffect } from "react";
import { type Currency, detectCurrency } from "@/lib/pricing";

const STORAGE_KEY = "ily-currency";
const DEFAULT_CURRENCY: Currency = "USD";

export function useCurrency() {
  const [currency, setCurrencyState] = useState<Currency>(DEFAULT_CURRENCY);

  // Hydrate from localStorage / browser locale after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "CHF" || stored === "EUR" || stored === "USD") {
        setCurrencyState(stored);
        return;
      }
    } catch {
      // ignore
    }
    setCurrencyState(detectCurrency(navigator.language));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, currency);
    } catch {
      // localStorage full or unavailable
    }
  }, [currency]);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
  }, []);

  return { currency, setCurrency };
}
