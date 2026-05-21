import type { Metadata } from "next";
import Script from "next/script";
import HomeClient from "./HomeClient";
import {
  SITE_URL,
  DEFAULT_OG_IMAGE,
  buildHreflangAlternates,
  jsonLdString,
} from "@/lib/seo";

const HOME_TITLE = "I LAUGH YOU — Own one of 6,059 numbered pieces of the largest self-portrait";
const HOME_DESCRIPTION =
  "Buy your numbered piece of the largest hand-painted self-portrait in art history. 6,059 unique collectible prints, priced by scarcity from 77 to 777 CHF. Find art by color, own a fragment of one painting.";

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  alternates: buildHreflangAlternates("/"),
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    type: "website",
    url: `${SITE_URL}/`,
    siteName: "I LAUGH YOU",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "I LAUGH YOU — 6,059 unique pieces of one hand-painted self-portrait",
      },
    ],
    locale: "en_US",
    alternateLocale: ["de_DE", "es_ES", "fr_FR"],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function HomePage() {
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "I LAUGH YOU — numbered art piece",
    description:
      "One of 6,059 unique numbered prints, each a distinct fragment of a single hand-painted oil self-portrait. Priced dynamically by scarcity (77–777 CHF).",
    brand: {
      "@type": "Brand",
      name: "I LAUGH YOU",
    },
    image: [DEFAULT_OG_IMAGE],
    offers: {
      "@type": "AggregateOffer",
      url: `${SITE_URL}/`,
      priceCurrency: "CHF",
      lowPrice: "77",
      highPrice: "777",
      offerCount: "6059",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <>
      <Script
        id="home-product-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: jsonLdString(productJsonLd) }}
      />
      <HomeClient />
    </>
  );
}
