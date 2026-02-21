import { TOTAL_PIECES } from "@/lib/piece-config";

const MAX_SOLD_INDEX = TOTAL_PIECES - 1; // 24235

/**
 * Exponential price curve: piece #1 = 77, piece #24,236 = 777.
 * Formula: 77 + 700 * (soldCount / 24235)^3
 */
export function priceAt(soldCount: number): number {
  const clamped = Math.max(0, Math.min(MAX_SOLD_INDEX, soldCount));
  return 77 + 700 * Math.pow(clamped / MAX_SOLD_INDEX, 3);
}

export type Currency = "CHF" | "EUR" | "USD";

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  CHF: "CHF",
  EUR: "\u20AC",
  USD: "$",
};

/** Map IANA timezone to currency (more reliable than language alone) */
export function detectCurrencyFromTimezone(): Currency | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; // e.g. "Europe/Zurich"
    if (!tz) return null;

    // Switzerland / Liechtenstein
    if (tz === "Europe/Zurich" || tz === "Europe/Vaduz") return "CHF";

    // Eurozone timezones
    if (tz.startsWith("Europe/")) return "EUR";

    return "USD";
  } catch {
    return null;
  }
}

export function detectCurrency(navigatorLanguage: string): Currency {
  // 1) Timezone is the strongest geo signal (reflects OS region, not browser pref)
  const fromTz = detectCurrencyFromTimezone();
  if (fromTz) return fromTz;

  // 2) Fallback: browser language
  const lang = navigatorLanguage.toLowerCase();

  if (lang.startsWith("de-ch") || lang === "gsw" || lang.startsWith("fr-ch") || lang.startsWith("it-ch")) {
    return "CHF";
  }

  if (
    lang.startsWith("de") ||
    lang.startsWith("fr") ||
    lang.startsWith("es") ||
    lang.startsWith("it") ||
    lang.startsWith("nl") ||
    lang.startsWith("pt")
  ) {
    return "EUR";
  }

  return "USD";
}

export function formatPrice(amount: number, currency: Currency): string {
  const rounded = Math.floor(amount);
  const symbol = CURRENCY_SYMBOLS[currency];

  if (currency === "USD") {
    return `$${rounded}`;
  }

  if (currency === "EUR") {
    return `\u20AC${rounded}`;
  }

  return `CHF ${rounded}`;
}

/** Stripe uses lowercase 3-letter currency codes */
export function toStripeCurrency(currency: Currency): string {
  return currency.toLowerCase();
}

/** Convert price to Stripe's smallest currency unit (cents/rappen) */
export function toStripeAmount(price: number, currency: Currency): number {
  return Math.round(price * 100);
}
