import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE_NAME,
  verifyAdminSessionToken,
} from "@/lib/admin-auth";
import { listBids, getBidCount } from "@/lib/sqlite";

export const runtime = "nodejs";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

    if (!verifyAdminSessionToken(adminToken)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bids = listBids();
    const bidCount = getBidCount();

    return NextResponse.json({
      bids,
      bidCount,
    });
  } catch (error) {
    console.error("Failed to fetch bids:", error);
    return NextResponse.json(
      { error: "Failed to fetch bids" },
      { status: 500 }
    );
  }
}
