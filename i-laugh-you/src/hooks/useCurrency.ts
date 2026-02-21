"use client";

import { useState, useCallback, useEffect } from "react";
import { type Currency, detectCurrency } from "@/lib/pricing";

const STORAGE_KEY = "ily-currency";

function loadCurrency(): Currency | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "CHF" || raw === "EUR" || raw === "USD") return raw;
    return null;
  } catch {
    return null;
  }
}

export function useCurrency() {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const stored = loadCurrency();
    if (stored) return stored;
    if (typeof navigator !== "undefined") {
      return detectCurrency(navigator.language);
    }
    return "USD";
  });

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
