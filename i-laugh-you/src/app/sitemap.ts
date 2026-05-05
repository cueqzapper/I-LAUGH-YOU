import type { MetadataRoute } from "next";
import fs from "node:fs";
import path from "node:path";
import { SITE_URL, SUPPORTED_LOCALES } from "@/lib/seo";
import { listBlogArticles } from "@/lib/sqlite";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function languageAlternates(pathWithLeadingSlash: string): Record<string, string> {
  const base = `${SITE_URL}${pathWithLeadingSlash}`;
  const sep = pathWithLeadingSlash.includes("?") ? "&" : "?";
  const out: Record<string, string> = {
    "x-default": base,
    de: base,
  };
  for (const loc of SUPPORTED_LOCALES) {
    if (loc === "de") continue;
    out[loc] = `${base}${sep}lang=${loc}`;
  }
  return out;
}

function listLegalRoutes(): string[] {
  const legalDir = path.join(process.cwd(), "src", "app", "legal");
  if (!fs.existsSync(legalDir)) return [];
  try {
    const entries = fs.readdirSync(legalDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => `/legal/${entry.name}`);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
      alternates: { languages: languageAlternates("/") },
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: { languages: languageAlternates("/about") },
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
      alternates: { languages: languageAlternates("/blog") },
    },
  ];

  const legalRoutes: MetadataRoute.Sitemap = listLegalRoutes().map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  let blogRoutes: MetadataRoute.Sitemap = [];
  try {
    // Pull ALL articles. listBlogArticles paginates; for sitemap purposes we
    // walk pages until exhausted, but practically blog volume is small.
    const { articles, pages } = listBlogArticles(1, 500);
    const collected = [...articles];
    for (let p = 2; p <= pages; p++) {
      collected.push(...listBlogArticles(p, 500).articles);
    }
    blogRoutes = collected.map((article) => ({
      url: `${SITE_URL}/blog/${article.slug}`,
      lastModified: new Date(article.published_at),
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: { languages: languageAlternates(`/blog/${article.slug}`) },
    }));
  } catch {
    // Swallow DB errors at build time so sitemap still emits core routes.
  }

  return [...staticRoutes, ...blogRoutes, ...legalRoutes];
}
