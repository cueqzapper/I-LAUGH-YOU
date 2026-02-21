import { NextRequest, NextResponse } from "next/server";
import { listBlogArticles } from "@/lib/sqlite";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const perPage = Math.min(50, Math.max(1, parseInt(searchParams.get("per_page") ?? "12", 10) || 12));

    const { articles, total, pages } = listBlogArticles(page, perPage);

    return NextResponse.json({
      articles: articles.map((a) => ({
        id: a.id,
        slug: a.slug,
        title: a.title,
        excerpt: a.excerpt,
        category: a.category,
        tags: (() => {
          try {
            return JSON.parse(a.tags);
          } catch {
            return [];
          }
        })(),
        heroImage: a.hero_image,
        wordCount: a.word_count,
        publishedAt: a.published_at,
      })),
      pagination: { page, perPage, total, pages },
    });
  } catch (error) {
    console.error("[api/blog/articles] Failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}
