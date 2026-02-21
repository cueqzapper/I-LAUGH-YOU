import Link from "next/link";
import { listBlogArticles, getBlogArticleTranslation } from "@/lib/sqlite";
import { CATEGORY_LABELS, type BlogCategory } from "@/lib/blog-topics";
import type { Metadata } from "next";
import "./blog.css";

const SUPPORTED_LANGS = ["de", "en", "es", "fr"] as const;
type SupportedLang = (typeof SUPPORTED_LANGS)[number];

const LANG_META: Record<SupportedLang, { title: string; description: string; sub: string; empty: string; emptyDesc: string; words: string; footer: string }> = {
  de: {
    title: "Blog — I LAUGH YOU",
    description: "Artikel über Kunst, Kapitalismus und das größte Selbstporträt der Kunstgeschichte.",
    sub: "Kunst, Kapitalismus & das größte Selbstporträt der Kunstgeschichte",
    empty: "Noch keine Artikel",
    emptyDesc: "Bald erscheinen hier Artikel über Kunst, Kapitalismus und das I LAUGH YOU Projekt.",
    words: "Wörter",
    footer: "Das größte Selbstporträt der Kunstgeschichte",
  },
  en: {
    title: "Blog — I LAUGH YOU",
    description: "Articles about art, capitalism, and the largest self-portrait in art history.",
    sub: "Art, capitalism & the largest self-portrait in art history",
    empty: "No articles yet",
    emptyDesc: "Articles about art, capitalism, and the I LAUGH YOU project will appear here soon.",
    words: "words",
    footer: "The largest self-portrait in art history",
  },
  es: {
    title: "Blog — I LAUGH YOU",
    description: "Artículos sobre arte, capitalismo y el autorretrato más grande de la historia del arte.",
    sub: "Arte, capitalismo y el autorretrato más grande de la historia del arte",
    empty: "Aún no hay artículos",
    emptyDesc: "Pronto aparecerán aquí artículos sobre arte, capitalismo y el proyecto I LAUGH YOU.",
    words: "palabras",
    footer: "El autorretrato más grande de la historia del arte",
  },
  fr: {
    title: "Blog — I LAUGH YOU",
    description: "Articles sur l'art, le capitalisme et le plus grand autoportrait de l'histoire de l'art.",
    sub: "Art, capitalisme et le plus grand autoportrait de l'histoire de l'art",
    empty: "Pas encore d'articles",
    emptyDesc: "Des articles sur l'art, le capitalisme et le projet I LAUGH YOU apparaîtront bientôt ici.",
    words: "mots",
    footer: "Le plus grand autoportrait de l'histoire de l'art",
  },
};

const DATE_LOCALES: Record<SupportedLang, string> = {
  de: "de-DE",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
};

export const metadata: Metadata = {
  title: "Blog — I LAUGH YOU",
  description:
    "Artikel über Kunst, Kapitalismus und das größte Selbstporträt der Kunstgeschichte.",
  openGraph: {
    title: "Blog — I LAUGH YOU",
    description:
      "Artikel über Kunst, Kapitalismus und das größte Selbstporträt der Kunstgeschichte.",
  },
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function parseLang(raw: string | undefined): SupportedLang {
  if (raw && SUPPORTED_LANGS.includes(raw as SupportedLang)) {
    return raw as SupportedLang;
  }
  return "de";
}

export default async function BlogListingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; lang?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const lang = parseLang(params.lang);
  const labels = LANG_META[lang];
  const dateLocale = DATE_LOCALES[lang];
  const { articles, total, pages } = listBlogArticles(page, 12);

  // Pre-load translations for non-German languages
  const translatedArticles = articles.map((article) => {
    if (lang === "de") {
      return { ...article, displayTitle: article.title, displayExcerpt: article.excerpt };
    }
    const translation = getBlogArticleTranslation(article.id, lang);
    return {
      ...article,
      displayTitle: translation?.title ?? article.title,
      displayExcerpt: translation?.excerpt ?? article.excerpt,
    };
  });

  function langHref(targetLang: SupportedLang, extraParams?: string) {
    const parts: string[] = [];
    if (targetLang !== "de") parts.push(`lang=${targetLang}`);
    if (extraParams) parts.push(extraParams);
    return parts.length > 0 ? `/blog?${parts.join("&")}` : "/blog";
  }

  function articleHref(slug: string) {
    return lang === "de" ? `/blog/${slug}` : `/blog/${slug}?lang=${lang}`;
  }

  return (
    <div id="blog-page">
      <header className="blog-header">
        <Link href="/" className="blog-home-link">
          &larr; I LAUGH YOU
        </Link>
        <h1>Blog</h1>
        <p className="blog-header-sub">
          {labels.sub}
        </p>
        {/* Language Switcher */}
        <nav style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
          {SUPPORTED_LANGS.map((l) => (
            <Link
              key={l}
              href={langHref(l)}
              style={{
                fontSize: "0.8rem",
                padding: "2px 8px",
                borderRadius: 4,
                background: l === lang ? "rgba(255,255,255,0.15)" : "transparent",
                color: l === lang ? "#fff" : "#71717a",
                textDecoration: "none",
                fontWeight: l === lang ? 600 : 400,
              }}
            >
              {l.toUpperCase()}
            </Link>
          ))}
        </nav>
      </header>

      <main className="blog-grid-container">
        {translatedArticles.length === 0 ? (
          <div className="blog-empty">
            <h2>{labels.empty}</h2>
            <p>{labels.emptyDesc}</p>
          </div>
        ) : (
          <>
            <div className="blog-grid">
              {translatedArticles.map((article) => {
                const tags: string[] = (() => {
                  try {
                    return JSON.parse(article.tags);
                  } catch {
                    return [];
                  }
                })();
                const categoryLabel =
                  CATEGORY_LABELS[article.category as BlogCategory] ??
                  article.category;

                return (
                  <article key={article.id} className="blog-card">
                    <Link
                      href={articleHref(article.slug)}
                      className="blog-card-link"
                    >
                      {article.hero_image ? (
                        <img
                          src={article.hero_image}
                          alt={article.displayTitle}
                          className="blog-card-image"
                          loading="lazy"
                        />
                      ) : (
                        <div className="blog-card-placeholder">&#9830;</div>
                      )}
                      <div className="blog-card-body">
                        <span className="blog-card-category">
                          {categoryLabel}
                        </span>
                        <h2 className="blog-card-title">{article.displayTitle}</h2>
                        <p className="blog-card-excerpt">{article.displayExcerpt}</p>
                        <span className="blog-card-meta">
                          {formatDate(article.published_at, dateLocale)} &middot;{" "}
                          {article.word_count} {labels.words}
                        </span>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>

            {pages > 1 && (
              <nav className="blog-pagination">
                {Array.from({ length: pages }, (_, i) => i + 1).map((p) => {
                  const href = langHref(lang, p > 1 ? `page=${p}` : undefined);
                  return p === page ? (
                    <span key={p} className="active">
                      {p}
                    </span>
                  ) : (
                    <Link key={p} href={href}>
                      {p}
                    </Link>
                  );
                })}
              </nav>
            )}
          </>
        )}
      </main>

      <footer className="blog-footer">
        <p>
          <a href="/">I LAUGH YOU</a> &mdash; {labels.footer}
        </p>
      </footer>
    </div>
  );
}
