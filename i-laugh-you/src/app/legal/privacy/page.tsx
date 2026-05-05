import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — I LAUGH YOU",
  description: "Privacy policy for the I LAUGH YOU art project and shop.",
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <main style={{ background: "#0a0a0a", minHeight: "100vh", padding: "3rem 1.5rem" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", fontFamily: "var(--font-oswald)", color: "#fff" }}>
        <h1 style={{ color: "#ff0069", fontSize: "2rem", marginBottom: "1.5rem" }}>
          Privacy Policy / Datenschutz
        </h1>
        <p style={{ lineHeight: 1.7, marginBottom: "2rem" }}>
          This page is currently being prepared. Please check back soon.
        </p>
        <Link href="/" style={{ color: "#ff0069", textDecoration: "underline" }}>
          &larr; Back to homepage
        </Link>
        <footer style={{ marginTop: "4rem", fontSize: "0.85rem", opacity: 0.5 }}>
          I LAUGH YOU &mdash; Made with love and laughter in Switzerland
        </footer>
      </div>
    </main>
  );
}
