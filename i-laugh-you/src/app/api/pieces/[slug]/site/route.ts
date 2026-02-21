import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getPieceSessionCookieName,
  verifyPieceSessionToken,
} from "@/lib/piece-auth";
import {
  InvalidPieceSiteInputError,
  getPieceSiteBySlug,
  updatePieceSite,
} from "@/lib/sqlite";

export const runtime = "nodejs";

function buildPieceRedirectUrl(requestUrl: string, slug: string, query?: string) {
  const url = new URL(`/piece/${encodeURIComponent(slug)}`, requestUrl);
  if (query) {
    url.search = query;
  }
  return url;
}

function isValidPieceLinkUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
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

  const cookieStore = await cookies();
  const ownerToken = cookieStore.get(getPieceSessionCookieName(pieceSite.image_id))?.value;

  if (!verifyPieceSessionToken(ownerToken, pieceSite.image_id)) {
    return NextResponse.redirect(
      buildPieceRedirectUrl(request.url, pieceSite.slug, "error=unauthorized"),
      303
    );
  }

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const linkUrl = String(formData.get("linkUrl") ?? "").trim();
  const linkLabel = String(formData.get("linkLabel") ?? "").trim();

  if (!title || !description || !isValidPieceLinkUrl(linkUrl)) {
    return NextResponse.redirect(
      buildPieceRedirectUrl(request.url, pieceSite.slug, "error=invalid_input"),
      303
    );
  }

  try {
    const updatedSite = updatePieceSite({
      imageId: pieceSite.image_id,
      title,
      description,
      linkUrl,
      linkLabel: linkLabel || null,
    });

    return NextResponse.redirect(
      buildPieceRedirectUrl(request.url, updatedSite.slug, "status=updated"),
      303
    );
  } catch (error) {
    if (error instanceof InvalidPieceSiteInputError) {
      return NextResponse.redirect(
        buildPieceRedirectUrl(request.url, pieceSite.slug, "error=invalid_input"),
        303
      );
    }

    return NextResponse.redirect(
      buildPieceRedirectUrl(request.url, pieceSite.slug, "error=invalid_input"),
      303
    );
  }
}
