import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import deCommon from "./locales/de/common.json";
import deHome from "./locales/de/home.json";
import deShop from "./locales/de/shop.json";
import enCommon from "./locales/en/common.json";
import enHome from "./locales/en/home.json";
import enShop from "./locales/en/shop.json";
import esCommon from "./locales/es/common.json";
import esHome from "./locales/es/home.json";
import esShop from "./locales/es/shop.json";
import frCommon from "./locales/fr/common.json";
import frHome from "./locales/fr/home.json";
import frShop from "./locales/fr/shop.json";

const LANG_STORAGE_KEY = "ily-language";
const SUPPORTED_LANGS = ["de", "en", "es", "fr"];

/** Detect preferred language from localStorage or browser. Client-only. */
export function detectLanguage(): string {
  if (typeof window === "undefined") return "de";

  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored && SUPPORTED_LANGS.includes(stored)) return stored;
  } catch { /* ignore */ }

  const browserLang = navigator.language?.toLowerCase() || "";
  for (const lang of SUPPORTED_LANGS) {
    if (browserLang.startsWith(lang)) return lang;
  }

  return "en";
}

export function persistLanguageChoice(code: string) {
  try { localStorage.setItem(LANG_STORAGE_KEY, code); } catch { /* ignore */ }
}

// Init with fixed "de" for SSR/hydration consistency. Language is
// switched to the detected value after hydration via applyDetectedLanguage().
i18n.use(initReactI18next).init({
  resources: {
    de: { common: deCommon, home: deHome, shop: deShop },
    en: { common: enCommon, home: enHome, shop: enShop },
    es: { common: esCommon, home: esHome, shop: esShop },
    fr: { common: frCommon, home: frHome, shop: frShop },
  },
  lng: "de",
  fallbackLng: "de",
  ns: ["common", "home", "shop"],
  defaultNS: "home",
  interpolation: { escapeValue: false },
});

/** Call once after hydration to switch to the user's preferred language. */
export function applyDetectedLanguage() {
  const detected = detectLanguage();
  if (i18n.language !== detected) {
    i18n.changeLanguage(detected);
  }
}

export default i18n;
