import type { Metadata } from "next";
import { Oswald, Ultra } from "next/font/google";
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

export const metadata: Metadata = {
  title: "I LAUGH YOU! — Art Project",
  description:
    "The biggest self-portrait in art history. 24,236 unique pieces. Pick yours.",
  keywords: ["art", "self-portrait", "unique", "artwork", "i laugh you"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Gochi+Hand&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${oswald.variable} ${ultra.variable}`}>
        {children}
      </body>
    </html>
  );
}
