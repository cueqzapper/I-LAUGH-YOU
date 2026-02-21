import { NextResponse } from "next/server";
import { getSoldPieceCount, listSoldImageIds } from "@/lib/sqlite";
import { TOTAL_PIECES } from "@/lib/piece-config";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(
      {
        soldCount: getSoldPieceCount(),
        totalPieces: TOTAL_PIECES,
        soldImageIds: listSoldImageIds(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to load sold pieces." },
      { status: 500 }
    );
  }
}
