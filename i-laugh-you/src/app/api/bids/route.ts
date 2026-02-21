import { NextRequest, NextResponse } from "next/server";
import { createBid, getHighestBid } from "@/lib/sqlite";

export const runtime = "nodejs";

export async function GET() {
  try {
    const highestBid = getHighestBid();

    return NextResponse.json({
      highestBid: highestBid
        ? {
            amount: highestBid.bid_amount,
            createdAt: highestBid.created_at,
          }
        : null,
    });
  } catch (error) {
    console.error("Failed to fetch highest bid:", error);
    return NextResponse.json(
      { error: "Failed to fetch bid data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const bidderName = typeof body.name === "string" ? body.name.trim() : "";
    const bidderEmail = typeof body.email === "string" ? body.email.trim() : "";
    const bidAmount =
      typeof body.amount === "number" ? body.amount : Number(body.amount);
    const message =
      typeof body.message === "string" ? body.message.trim() : null;

    if (!bidderName || bidderName.length < 2) {
      return NextResponse.json(
        { error: "Name is required (min 2 characters)" },
        { status: 400 }
      );
    }

    if (!bidderEmail || !bidderEmail.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(bidAmount) || bidAmount < 1) {
      return NextResponse.json(
        { error: "Bid amount must be at least $1" },
        { status: 400 }
      );
    }

    const bid = createBid({
      bidderName,
      bidderEmail,
      bidAmount: Math.floor(bidAmount),
      message: message || null,
    });

    return NextResponse.json({
      success: true,
      bid: {
        id: bid.id,
        amount: bid.bid_amount,
        createdAt: bid.created_at,
      },
    });
  } catch (error) {
    console.error("Failed to create bid:", error);
    return NextResponse.json(
      { error: "Failed to submit bid" },
      { status: 500 }
    );
  }
}
