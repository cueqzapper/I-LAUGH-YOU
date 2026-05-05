import type { Metadata } from "next";
import Script from "next/script";
import { Oswald, Ultra } from "next/font/google";
import {
  SITE_URL,
  DEFAULT_OG_IMAGE,
  organizationJsonLd,
  websiteJsonLd,
  jsonLdString,
} from "@/lib/seo";
import "./globals.css";

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700"],
});

const ultra = Ultra({
  variable: "--font-ultra",
  subsets: ["latin"],
  weight: "400",
});

const DEFAULT_TITLE = "I LAUGH YOU — 24,236 numbered pieces of the largest self-portrait";
const DEFAULT_DESCRIPTION =
  "An art project selling 24,236 unique numbered pieces of one hand-painted oil self-portrait. Dynamic scarcity pricing, 77–777 CHF. Art × capitalism, live.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: "%s — I LAUGH YOU",
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: "I LAUGH YOU",
  keywords: [
    "numbered art prints",
    "limited edition art",
    "collectible art",
    "self-portrait",
    "art and capitalism",
    "scarcity pricing",
    "fractional art ownership",
    "art by color",
    "I LAUGH YOU",
  ],
  authors: [{ name: "Simon", url: SITE_URL }],
  creator: "Simon",
  publisher: "I LAUGH YOU",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "I LAUGH YOU",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    locale: "en_US",
    alternateLocale: ["de_DE", "es_ES", "fr_FR"],
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "I LAUGH YOU — 24,236 unique pieces of one hand-painted self-portrait",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  // Icons are auto-wired by Next.js from src/app/icon.png + src/app/apple-icon.png
  // (we generated those from public/img/smily.png). No explicit config needed.
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Inline script: before paint, sync <html lang> and <html dir> with the
  // i18next language persisted in localStorage/cookie. Prevents SEO from
  // emitting lang="en" when the visible page is actually rendered in DE/ES/FR.
  const langSyncScript = `
    (function () {
      try {
        var supported = ['de','en','es','fr'];
        function pick(raw) {
          if (!raw) return null;
          var short = String(raw).toLowerCase().split('-')[0];
          return supported.indexOf(short) >= 0 ? short : null;
        }
        var urlLang = null;
        try {
          var params = new URLSearchParams(window.location.search);
          urlLang = pick(params.get('lang'));
        } catch (e) {}
        var stored = null;
        try { stored = pick(localStorage.getItem('i18nextLng') || localStorage.getItem('ily-lang')); } catch (e) {}
        var cookieLang = null;
        try {
          var m = document.cookie.match(/(?:^|;\\s*)ily-lang=([^;]+)/);
          if (m) cookieLang = pick(decodeURIComponent(m[1]));
        } catch (e) {}
        var nav = pick((navigator.language || navigator.userLanguage));
        var lang = urlLang || stored || cookieLang || nav || 'en';
        document.documentElement.lang = lang;
      } catch (e) {}
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Gochi+Hand&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: langSyncScript }} />
      </head>
      <body className={`${oswald.variable} ${ultra.variable}`}>
        <Script
          id="organization-jsonld"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: jsonLdString(organizationJsonLd()) }}
        />
        <Script
          id="website-jsonld"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: jsonLdString(websiteJsonLd()) }}
        />
        {children}
      </body>
    </html>
  );
}
