import { NextResponse } from "next/server";
import {
  getPieceSiteByImageId,
  InvalidPieceIdError,
  PieceAlreadySoldError,
  purchasePiece,
} from "@/lib/sqlite";

export const runtime = "nodejs";

interface PurchasePayload {
  imageId?: number | string;
  buyerName?: string;
  buyerEmail?: string;
  buyerAddress?: string;
  buyerCity?: string;
  buyerPostalCode?: string;
  buyerCountry?: string;
}

function toTrimmedString(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function parseImageId(value: number | string | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number.parseInt(value, 10);
  }

  return Number.NaN;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  let payload: PurchasePayload;

  try {
    payload = (await request.json()) as PurchasePayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const imageId = parseImageId(payload.imageId);
  const buyerName = toTrimmedString(payload.buyerName);
  const buyerEmail = toTrimmedString(payload.buyerEmail).toLowerCase();

  if (!Number.isFinite(imageId)) {
    return NextResponse.json(
      { error: "imageId must be a valid number." },
      { status: 400 }
    );
  }

  if (!buyerName) {
    return NextResponse.json(
      { error: "buyerName is required." },
      { status: 400 }
    );
  }

  if (!buyerEmail || !isValidEmail(buyerEmail)) {
    return NextResponse.json(
      { error: "buyerEmail must be a valid email address." },
      { status: 400 }
    );
  }

  try {
    const sale = purchasePiece({
      imageId,
      buyerName,
      buyerEmail,
      buyerAddress: toTrimmedString(payload.buyerAddress) || null,
      buyerCity: toTrimmedString(payload.buyerCity) || null,
      buyerPostalCode: toTrimmedString(payload.buyerPostalCode) || null,
      buyerCountry: toTrimmedString(payload.buyerCountry) || null,
    });
    const pieceSite = getPieceSiteByImageId(imageId);

    return NextResponse.json(
      {
        ok: true,
        sale,
        piece: {
          url: pieceSite ? `/piece/${pieceSite.slug}` : null,
        },
        printify: {
          mode: "dummy",
          status: sale.printify_status,
          jobId: sale.printify_job_id,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof PieceAlreadySoldError) {
      return NextResponse.json(
        {
          error: "This image is already sold.",
          imageId: error.imageId,
        },
        { status: 409 }
      );
    }

    if (error instanceof InvalidPieceIdError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Unable to complete purchase." },
      { status: 500 }
    );
  }
}
