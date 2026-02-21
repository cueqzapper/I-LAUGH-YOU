import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getBlogArticleBySlug,
  getBlogImagesByArticle,
  getBlogArticleTranslation,
} from "@/lib/sqlite";
import { CATEGORY_LABELS, type BlogCategory } from "@/lib/blog-topics";
import type { Metadata } from "next";
import "../blog.css";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SUPPORTED_LANGS = ["de", "en", "es", "fr"] as const;
type SupportedLang = (typeof SUPPORTED_LANGS)[number];

const LABEL_WORDS: Record<SupportedLang, string> = {
  de: "Wörter",
  en: "words",
  es: "palabras",
  fr: "mots",
};

const LABEL_BACK: Record<SupportedLang, string> = {
  de: "Alle Artikel",
  en: "All Articles",
  es: "Todos los artículos",
  fr: "Tous les articles",
};

const LABEL_FOOTER: Record<SupportedLang, string> = {
  de: "Das größte Selbstporträt der Kunstgeschichte",
  en: "The largest self-portrait in art history",
  es: "El autorretrato más grande de la historia del arte",
  fr: "Le plus grand autoportrait de l'histoire de l'art",
};

const DATE_LOCALES: Record<SupportedLang, string> = {
  de: "de-DE",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
};

function parseLang(raw: string | undefined): SupportedLang {
  if (raw && SUPPORTED_LANGS.includes(raw as SupportedLang)) {
    return raw as SupportedLang;
  }
  return "de";
}

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const lang = parseLang(sp.lang);
  const article = getBlogArticleBySlug(slug);

  if (!article) {
    return { title: "Article not found — I LAUGH YOU" };
  }

  let title = article.title;
  let description = article.excerpt;

  if (lang !== "de") {
    const translation = getBlogArticleTranslation(article.id, lang);
    if (translation) {
      title = translation.title;
      description = translation.excerpt;
    }
  }

  return {
    title: `${title} — I LAUGH YOU Blog`,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: article.published_at,
      ...(article.hero_image
        ? {
            images: [
              {
                url: article.hero_image,
                width: 1024,
                height: 680,
              },
            ],
          }
        : {}),
    },
  };
}

export default async function BlogArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const lang = parseLang(sp.lang);
  const dateLocale = DATE_LOCALES[lang];

  const article = getBlogArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const images = getBlogImagesByArticle(article.id);
  const tags: string[] = (() => {
    try {
      return JSON.parse(article.tags);
    } catch {
      return [];
    }
  })();
  const categoryLabel =
    CATEGORY_LABELS[article.category as BlogCategory] ?? article.category;

  // Load translation if needed
  let displayTitle = article.title;
  let displayExcerpt = article.excerpt;
  let displayContent = article.content;

  if (lang !== "de") {
    const translation = getBlogArticleTranslation(article.id, lang);
    if (translation) {
      displayTitle = translation.title;
      displayExcerpt = translation.excerpt;
      displayContent = translation.content;
    }
  }

  const backHref = lang === "de" ? "/blog" : `/blog?lang=${lang}`;

  return (
    <div id="blog-page">
      <header className="blog-header">
        <Link href="/" className="blog-home-link">
          &larr; I LAUGH YOU
        </Link>
        <h1>Blog</h1>
        {/* Language Switcher */}
        <nav style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
          {SUPPORTED_LANGS.map((l) => (
            <Link
              key={l}
              href={l === "de" ? `/blog/${slug}` : `/blog/${slug}?lang=${l}`}
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

      <main className="blog-article-container">
        <Link href={backHref} className="blog-back-link">
          &larr; {LABEL_BACK[lang]}
        </Link>

        {article.hero_image && (
          <img
            src={article.hero_image}
            alt={displayTitle}
            className="blog-article-hero"
          />
        )}

        <div className="blog-article-meta">
          <span className="blog-article-category-tag">{categoryLabel}</span>
          <span>{formatDate(article.published_at, dateLocale)}</span>
          <span>{article.word_count} {LABEL_WORDS[lang]}</span>
        </div>

        <h1 className="blog-article-title">{displayTitle}</h1>

        <div
          className="blog-article-content"
          dangerouslySetInnerHTML={{ __html: displayContent }}
        />

        {tags.length > 0 && (
          <div className="blog-article-tags">
            {tags.map((tag) => (
              <span key={tag} className="blog-article-tag">
                {tag}
              </span>
            ))}
          </div>
        )}
      </main>

      <footer className="blog-footer">
        <p>
          <a href="/">I LAUGH YOU</a> &mdash; {LABEL_FOOTER[lang]}
        </p>
      </footer>
    </div>
  );
}
