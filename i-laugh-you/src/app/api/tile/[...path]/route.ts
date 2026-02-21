import { NextRequest, NextResponse } from "next/server";

const TILE_SERVER = "https://ily.seez.ch";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const tilePath = path.join("/");
  const tileUrl = `${TILE_SERVER}/${tilePath}`;

  try {
    const response = await fetch(tileUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TileProxy/1.0)",
      },
    });

    if (!response.ok) {
      return new NextResponse(null, { status: response.status });
    }

    const buffer = await response.arrayBuffer();
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Tile proxy error:", error);
    return new NextResponse(null, { status: 500 });
  }
}
