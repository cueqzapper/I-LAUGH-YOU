import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE_NAME,
  verifyAdminSessionToken,
} from "@/lib/admin-auth";
import { translateBlogArticle } from "@/lib/blog-translator";

export const runtime = "nodejs";
export const maxDuration = 300;

const SUPPORTED_LANGUAGES = new Set(["en", "es", "fr"]);

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!verifyAdminSessionToken(adminToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      articleId?: number;
      language?: string;
    };

    if (!body.articleId || typeof body.articleId !== "number") {
      return NextResponse.json(
        { error: "articleId is required and must be a number" },
        { status: 400 }
      );
    }

    if (!body.language || !SUPPORTED_LANGUAGES.has(body.language)) {
      return NextResponse.json(
        { error: `language must be one of: ${[...SUPPORTED_LANGUAGES].join(", ")}` },
        { status: 400 }
      );
    }

    const translation = await translateBlogArticle(body.articleId, body.language);

    return NextResponse.json({
      success: true,
      translation: {
        language: translation.language,
        title: translation.title,
        slug: translation.slug,
      },
    });
  } catch (error) {
    console.error("[api/blog/translate] Translation failed:", error);
    return NextResponse.json(
      {
        error: "Translation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
