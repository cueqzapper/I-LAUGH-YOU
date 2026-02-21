import { NextResponse } from "next/server";
import {
  createPieceSessionToken,
  getPieceSessionCookieOptions,
} from "@/lib/piece-auth";
import { getPieceSiteBySlug, verifyPieceSitePassword } from "@/lib/sqlite";

export const runtime = "nodejs";

function buildPieceRedirectUrl(requestUrl: string, slug: string, query?: string) {
  const url = new URL(`/piece/${encodeURIComponent(slug)}`, requestUrl);
  if (query) {
    url.search = query;
  }
  return url;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  const { slug } = await params;
  const pieceSite = getPieceSiteBySlug(slug);

  if (!pieceSite) {
    return NextResponse.redirect(new URL("/", request.url), 303);
  }

  const formData = await request.formData();
  const password = String(formData.get("password") ?? "").trim();

  const isValidPassword = verifyPieceSitePassword(pieceSite.image_id, password);
  if (!isValidPassword) {
    return NextResponse.redirect(
      buildPieceRedirectUrl(
        request.url,
        pieceSite.slug,
        "error=invalid_credentials"
      ),
      303
    );
  }

  const cookieOptions = getPieceSessionCookieOptions(pieceSite.image_id);
  const response = NextResponse.redirect(
    buildPieceRedirectUrl(request.url, pieceSite.slug),
    303
  );
  response.cookies.set(cookieOptions.name, createPieceSessionToken(pieceSite.image_id), {
    httpOnly: cookieOptions.httpOnly,
    sameSite: cookieOptions.sameSite,
    secure: cookieOptions.secure,
    path: cookieOptions.path,
    maxAge: cookieOptions.maxAge,
  });

  return response;
}
