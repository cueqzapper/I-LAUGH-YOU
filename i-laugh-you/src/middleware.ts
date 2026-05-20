import { NextResponse, type NextRequest } from "next/server";

const BUILD_ID = process.env.NEXT_BUILD_ID || "dev";
const ETAG = `"build-${BUILD_ID}"`;

export function middleware(req: NextRequest) {
  const ifNoneMatch = req.headers.get("if-none-match");
  if (ifNoneMatch === ETAG) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: ETAG,
        "Cache-Control": "public, no-cache, must-revalidate",
      },
    });
  }

  const res = NextResponse.next();
  res.headers.set("ETag", ETAG);
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api|favicon\\.ico|robots\\.txt|sitemap\\.xml|img/|images/|icons/).*)",
  ],
};
