import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE_NAME,
  verifyAdminSessionToken,
} from "@/lib/admin-auth";
import { generateBlogArticle } from "@/lib/blog-generator";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!verifyAdminSessionToken(adminToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await generateBlogArticle();

    return NextResponse.json({
      success: true,
      article: {
        id: result.article.id,
        slug: result.article.slug,
        title: result.article.title,
        wordCount: result.article.word_count,
      },
      imageCount: result.imageCount,
    });
  } catch (error) {
    console.error("[api/blog/generate] Generation failed:", error);
    return NextResponse.json(
      {
        error: "Article generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
