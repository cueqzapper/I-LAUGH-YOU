import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE_NAME,
  verifyAdminSessionToken,
} from "@/lib/admin-auth";
import { regeneratePieceCredential } from "@/lib/sqlite";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!verifyAdminSessionToken(adminToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const imageId = body?.imageId;

    if (typeof imageId !== "number" || !Number.isInteger(imageId) || imageId < 1) {
      return NextResponse.json(
        { error: "Missing or invalid imageId" },
        { status: 400 }
      );
    }

    const result = regeneratePieceCredential(imageId);

    if (!result) {
      return NextResponse.json(
        { error: "No credential found for this piece" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        newPassword: result.newPassword,
        lastRotatedAt: result.lastRotatedAt,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to regenerate credential" },
      { status: 500 }
    );
  }
}
