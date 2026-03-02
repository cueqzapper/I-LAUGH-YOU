"use client";

import { useState } from "react";
import ImageCheckGallery from "./ImageCheckGallery";

interface BlogArticleSummary {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  hero_image: string | null;
  word_count: number;
  published_at: string;
}

interface AdminBlogSectionProps {
  articles: BlogArticleSummary[];
  totalArticles: number;
  translationsMap: Record<number, string[]>;
}

const TARGET_LANGS = ["en", "es", "fr"] as const;
type TargetLang = (typeof TARGET_LANGS)[number];

const LANG_LABELS: Record<TargetLang, string> = {
  en: "EN",
  es: "ES",
  fr: "FR",
};

export default function AdminBlogSection({
  articles,
  totalArticles,
  translationsMap,
}: AdminBlogSectionProps) {
  const [generating, setGenerating] = useState(false);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchDone, setBatchDone] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{
    title: string;
    slug: string;
    wordCount: number;
    imageCount: number;
  } | null>(null);
  const [batchResults, setBatchResults] = useState<
    { title: string; slug: string; wordCount: number; imageCount: number }[]
  >([]);

  // Track translation state per article+lang
  const [translating, setTranslating] = useState<Record<string, boolean>>({});
  const [translateError, setTranslateError] = useState<Record<string, string>>({});
  const [completedTranslations, setCompletedTranslations] = useState<Record<number, string[]>>(
    () => ({ ...translationsMap })
  );

  async function generateOne(label?: string): Promise<{
    title: string;
    slug: string;
    wordCount: number;
    imageCount: number;
  }> {
    setStatus(label ? `${label} — Generating...` : "Generating...");
    const res = await fetch("/api/blog/generate", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.details || data.error || "Generation failed");
    }
    return {
      title: data.article.title,
      slug: data.article.slug,
      wordCount: data.article.wordCount,
      imageCount: data.imageCount,
    };
  }

  async function handleGenerate() {
    setGenerating(true);
    setBatchTotal(1);
    setBatchDone(0);
    setError(null);
    setLastResult(null);
    setBatchResults([]);

    try {
      const result = await generateOne();
      setLastResult(result);
      setBatchDone(1);
      setStatus(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus(null);
    } finally {
      setGenerating(false);
      setBatchTotal(0);
    }
  }

  async function handleBatchGenerate(count: number) {
    setGenerating(true);
    setBatchTotal(count);
    setBatchDone(0);
    setError(null);
    setLastResult(null);
    setBatchResults([]);

    for (let i = 0; i < count; i++) {
      try {
        const result = await generateOne(`[${i + 1}/${count}]`);
        setBatchDone((prev) => prev + 1);
        setBatchResults((prev) => [...prev, result]);
        setLastResult(result);
      } catch (err) {
        setError(`Failed on article ${i + 1}/${count}: ${err instanceof Error ? err.message : "Unknown error"}`);
        break;
      }
    }

    setStatus(null);
    setGenerating(false);
    setBatchTotal(0);
  }

  async function handleTranslate(articleId: number, lang: TargetLang) {
    const key = `${articleId}-${lang}`;
    setTranslating((prev) => ({ ...prev, [key]: true }));
    setTranslateError((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    try {
      const res = await fetch("/api/blog/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, language: lang }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.details || data.error || "Translation failed");
      }

      setCompletedTranslations((prev) => {
        const existing = prev[articleId] ?? [];
        if (!existing.includes(lang)) {
          return { ...prev, [articleId]: [...existing, lang] };
        }
        return prev;
      });
    } catch (err) {
      setTranslateError((prev) => ({
        ...prev,
        [key]: err instanceof Error ? err.message : "Failed",
      }));
    } finally {
      setTranslating((prev) => ({ ...prev, [key]: false }));
    }
  }

  return (
    <>
      {/* Image Check Gallery */}
      <div style={{ marginBottom: 16 }}>
        <ImageCheckGallery />
      </div>

      {/* Stats */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Articles</div>
          <div className="admin-stat-value highlight">{totalArticles}</div>
          <div className="admin-stat-meta">published</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Pipeline</div>
          <div className="admin-stat-value" style={{ fontSize: "1rem" }}>
            Perplexity + Kimi K2.5
          </div>
          <div className="admin-stat-meta">research + write</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Images</div>
          <div className="admin-stat-value" style={{ fontSize: "1rem" }}>
            ComfyUI Z-Turbo
          </div>
          <div className="admin-stat-meta">watercolor style</div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">Generate New Article</h3>
        </div>

        <p style={{ color: "#71717a", fontSize: "0.85rem", margin: "0 0 16px" }}>
          Generates a full article: research via Perplexity Sonar, writing via Kimi K2.5,
          2 watercolor images via ComfyUI Z-Image Turbo. Takes 2-5 minutes.
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={handleGenerate}
            disabled={generating}
            style={{ opacity: generating ? 0.6 : 1, cursor: generating ? "wait" : "pointer" }}
          >
            {generating && batchTotal <= 1 ? "Generating..." : "Generate 1"}
          </button>
          {[5, 10, 20].map((n) => (
            <button
              key={n}
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => handleBatchGenerate(n)}
              disabled={generating}
              style={{
                opacity: generating ? 0.6 : 1,
                cursor: generating ? "wait" : "pointer",
                background: "rgba(168,85,247,0.2)",
                borderColor: "rgba(168,85,247,0.4)",
                color: "#c084fc",
              }}
            >
              {generating && batchTotal === n
                ? `${batchDone}/${n}...`
                : `Generate ${n}`}
            </button>
          ))}
        </div>

        {status && (
          <div className="admin-alert admin-alert-info" style={{ marginTop: 16 }}>
            <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>&#9881;</span>
            <span>{status}</span>
          </div>
        )}

        {error && (
          <div className="admin-alert admin-alert-error" style={{ marginTop: 16 }}>
            <span>&#10060;</span>
            <span>{error}</span>
          </div>
        )}

        {batchResults.length > 1 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: "0.8rem", color: "#a1a1aa", marginBottom: 8 }}>
              Batch: {batchResults.length} articles generated
            </div>
            {batchResults.map((r, i) => (
              <div
                key={r.slug}
                className="admin-alert admin-alert-info"
                style={{
                  marginTop: 4,
                  borderColor: "rgba(34,197,94,0.3)",
                  background: "rgba(34,197,94,0.08)",
                  color: "#4ade80",
                  padding: "6px 12px",
                }}
              >
                <span>&#10003;</span>
                <span style={{ fontSize: "0.85rem" }}>
                  {i + 1}. <strong>{r.title}</strong> ({r.wordCount}w, {r.imageCount}img)
                  {" — "}
                  <a
                    href={`/blog/${r.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#86efac", textDecoration: "underline" }}
                  >
                    View
                  </a>
                </span>
              </div>
            ))}
          </div>
        )}

        {batchResults.length <= 1 && lastResult && (
          <div className="admin-alert admin-alert-info" style={{ marginTop: 16, borderColor: "rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.12)", color: "#4ade80" }}>
            <span>&#10003;</span>
            <span>
              Published: <strong>{lastResult.title}</strong>
              {" "}({lastResult.wordCount} words, {lastResult.imageCount} images)
              {" — "}
              <a
                href={`/blog/${lastResult.slug}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#86efac", textDecoration: "underline" }}
              >
                View
              </a>
            </span>
          </div>
        )}
      </div>

      {/* Articles Table */}
      <div className="admin-table-wrapper">
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Category</th>
                <th>Words</th>
                <th>Published</th>
                <th>Translations</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="admin-empty-state">
                      <div className="admin-empty-state-icon">&#128221;</div>
                      <div className="admin-empty-state-text">
                        No articles yet. Click &quot;Generate Article&quot; to create one.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                articles.map((article) => {
                  const existingLangs = completedTranslations[article.id] ?? [];

                  return (
                    <tr key={article.id}>
                      <td>
                        <span className="admin-badge admin-badge-info">#{article.id}</span>
                      </td>
                      <td style={{ maxWidth: 300 }}>
                        <div style={{ fontWeight: 500, color: "#fff", marginBottom: 2 }}>
                          {article.title}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "#52525b" }}>
                          {article.excerpt}
                        </div>
                      </td>
                      <td>
                        <span className="admin-badge admin-badge-muted">{article.category}</span>
                      </td>
                      <td>{article.word_count}</td>
                      <td>{new Date(article.published_at).toLocaleDateString("de-DE")}</td>
                      <td>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                          {TARGET_LANGS.map((lang) => {
                            const key = `${article.id}-${lang}`;
                            const isTranslated = existingLangs.includes(lang);
                            const isLoading = translating[key];
                            const errMsg = translateError[key];

                            if (isTranslated) {
                              return (
                                <span
                                  key={lang}
                                  className="admin-badge"
                                  style={{
                                    background: "rgba(34,197,94,0.2)",
                                    color: "#4ade80",
                                    border: "1px solid rgba(34,197,94,0.3)",
                                    fontSize: "0.7rem",
                                    padding: "2px 6px",
                                    cursor: "pointer",
                                  }}
                                  title={`Re-translate to ${LANG_LABELS[lang]}`}
                                  onClick={() => handleTranslate(article.id, lang)}
                                >
                                  {LANG_LABELS[lang]}
                                </span>
                              );
                            }

                            return (
                              <span key={lang} style={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
                                <button
                                  type="button"
                                  className="admin-btn"
                                  style={{
                                    fontSize: "0.7rem",
                                    padding: "2px 6px",
                                    background: "rgba(113,113,122,0.2)",
                                    color: "#a1a1aa",
                                    border: "1px solid rgba(113,113,122,0.3)",
                                    cursor: isLoading ? "wait" : "pointer",
                                    opacity: isLoading ? 0.6 : 1,
                                    borderRadius: 4,
                                  }}
                                  disabled={isLoading}
                                  onClick={() => handleTranslate(article.id, lang)}
                                >
                                  {isLoading ? "..." : LANG_LABELS[lang]}
                                </button>
                                {errMsg && (
                                  <span style={{ fontSize: "0.6rem", color: "#ef4444", maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis" }} title={errMsg}>
                                    err
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td>
                        <a
                          href={`/blog/${article.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="admin-link-inline"
                        >
                          View
                        </a>
                        {" | "}
                        <a
                          href="/blog/gallery"
                          className="admin-link-inline"
                        >
                          Gallery
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
