/**
 * Server-side email translation helper.
 *
 * Loads the shop.json files for each supported locale and exposes a tiny
 * `tEmail` helper that navigates the `email.*` tree by dot path and replaces
 * `{{var}}` placeholders. No i18next runtime needed.
 *
 * If a key is missing in the requested locale, we fall back to EN.
 */
import deShop from "@/lib/i18n/locales/de/shop.json";
import enShop from "@/lib/i18n/locales/en/shop.json";
import esShop from "@/lib/i18n/locales/es/shop.json";
import frShop from "@/lib/i18n/locales/fr/shop.json";

type ShopBundle = {
  email?: Record<string, unknown>;
  [k: string]: unknown;
};

const BUNDLES: Record<string, ShopBundle> = {
  de: deShop as ShopBundle,
  en: enShop as ShopBundle,
  es: esShop as ShopBundle,
  fr: frShop as ShopBundle,
};

export const SUPPORTED_EMAIL_LOCALES = ["de", "en", "es", "fr"] as const;
export type EmailLocale = (typeof SUPPORTED_EMAIL_LOCALES)[number];

export function normalizeEmailLocale(input: string | undefined | null): EmailLocale {
  if (!input) return "en";
  const short = input.toLowerCase().split("-")[0];
  return (SUPPORTED_EMAIL_LOCALES as readonly string[]).includes(short)
    ? (short as EmailLocale)
    : "en";
}

function getAtPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur && typeof cur === "object" && part in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return cur;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const v = params[key];
    return v === undefined || v === null ? "" : String(v);
  });
}

/**
 * Translate an email key. `key` is relative to the `email` section.
 * Example: tEmail("de", "heroTitle", { name: "Anna" })
 */
export function tEmail(
  locale: string,
  key: string,
  params?: Record<string, string | number>
): string {
  const loc = normalizeEmailLocale(locale);
  const primary = getAtPath(BUNDLES[loc]?.email, key);
  if (typeof primary === "string") return interpolate(primary, params);
  const fallback = getAtPath(BUNDLES.en?.email, key);
  if (typeof fallback === "string") return interpolate(fallback, params);
  return key;
}
