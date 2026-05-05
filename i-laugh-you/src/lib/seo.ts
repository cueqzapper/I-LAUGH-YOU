/**
 * SEO helpers: site constants, hreflang builder, and JSON-LD structured data.
 * Used by layout, sitemap, robots, and per-page metadata.
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://i-laugh-you.com").replace(/\/$/, "");

// TODO (asset): add a 1200x630 PNG/JPEG at public/og-image.png (under 1 MB).
// Should visually represent: the full self-portrait grid, the word "I LAUGH YOU",
// plus tagline "24,236 unique pieces". Needed for Open Graph + Twitter cards.
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

// Favicon + apple-touch-icon are auto-wired by Next.js from
// src/app/icon.png and src/app/apple-icon.png (generated from public/img/smily.png).
export const DEFAULT_TWITTER_HANDLE = "@ily6059"; // ily6059 is the project's X/Twitter handle

export const SUPPORTED_LOCALES = ["de", "en", "es", "fr"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

type HreflangLanguages = Record<string, string>;

/**
 * Build an `alternates` object for Next.js metadata with hreflang entries
 * for all supported locales plus x-default. The project uses query-param
 * locale switching (?lang=xx); German is the default with no param.
 */
export function buildHreflangAlternates(pathWithLeadingSlash: string): {
  canonical: string;
  languages: HreflangLanguages;
} {
  const path = pathWithLeadingSlash.startsWith("/") ? pathWithLeadingSlash : `/${pathWithLeadingSlash}`;
  const base = `${SITE_URL}${path}`;
  const separator = path.includes("?") ? "&" : "?";

  return {
    canonical: base,
    languages: {
      "x-default": base,
      de: base,
      en: `${base}${separator}lang=en`,
      es: `${base}${separator}lang=es`,
      fr: `${base}${separator}lang=fr`,
    },
  };
}

/**
 * Organization schema — emitted site-wide in the root layout.
 * Establishes brand entity for Knowledge Graph eligibility.
 */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "I LAUGH YOU",
    alternateName: "I-LAUGH-YOU",
    url: SITE_URL,
    logo: `${SITE_URL}/img/logo.png`,
    description:
      "An art project selling 24,236 unique numbered pieces of the largest hand-painted self-portrait in art history, with a scarcity-driven dynamic pricing curve.",
    founder: {
      "@type": "Person",
      name: "Simon",
    },
    sameAs: [
      "https://www.facebook.com/ilaughyouofficial",
      "https://www.instagram.com/ilaughyouofficial",
      "https://twitter.com/ily6059",
      "https://www.pinterest.ch/ily6059/pins/",
    ],
  };
}

/**
 * WebSite schema — emitted site-wide. The SearchAction points at the
 * homepage piece-lookup URL (?piece=<id>) since that is the site's search-like affordance.
 */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "I LAUGH YOU",
    url: SITE_URL,
    inLanguage: ["de", "en", "es", "fr"],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/?piece={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export interface ArticleSchemaInput {
  title: string;
  excerpt: string;
  slug: string;
  heroImage: string | null;
  publishedAt: string;
  updatedAt?: string;
  tags?: string[];
  locale?: SupportedLocale;
}

/**
 * Article schema — emitted on individual blog posts.
 * Eligible for Google rich results (Article carousel, Top Stories).
 */
export function articleJsonLd(input: ArticleSchemaInput) {
  const locale = input.locale ?? "de";
  const localeSuffix = locale === "de" ? "" : `?lang=${locale}`;
  const articleUrl = `${SITE_URL}/blog/${input.slug}${localeSuffix}`;
  const imageUrl = input.heroImage
    ? input.heroImage.startsWith("http")
      ? input.heroImage
      : `${SITE_URL}${input.heroImage.startsWith("/") ? "" : "/"}${input.heroImage}`
    : DEFAULT_OG_IMAGE;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.excerpt,
    image: [imageUrl],
    datePublished: input.publishedAt,
    dateModified: input.updatedAt ?? input.publishedAt,
    author: {
      "@type": "Person",
      name: "Simon",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "I LAUGH YOU",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/img/logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    inLanguage: locale,
    keywords: (input.tags ?? []).join(", "),
  };
}

/**
 * BreadcrumbList schema — emitted on nested pages (blog list, blog post).
 */
export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url.startsWith("/") ? "" : "/"}${item.url}`,
    })),
  };
}

/**
 * Serialize a schema object for <script type="application/ld+json">.
 * We escape `</` to avoid premature closing tags inside HTML.
 */
export function jsonLdString(schema: unknown): string {
  return JSON.stringify(schema).replace(/</g, "\\u003c");
}
