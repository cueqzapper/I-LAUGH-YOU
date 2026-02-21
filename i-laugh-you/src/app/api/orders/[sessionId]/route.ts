import { NextRequest, NextResponse } from "next/server";
import { getOrderByStripeSession, getOrderItems } from "@/lib/sqlite";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session ID." }, { status: 400 });
  }

  const order = getOrderByStripeSession(sessionId);
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const items = getOrderItems(order.id);

  return NextResponse.json({
    order: {
      id: order.id,
      buyer_email: order.buyer_email,
      buyer_name: order.buyer_name,
      currency: order.currency,
      unit_price: order.unit_price,
      total_amount: order.total_amount,
      item_count: order.item_count,
      status: order.status,
      created_at: order.created_at,
    },
    items: items.map((item) => ({
      image_id: item.image_id,
      frame_color: item.frame_color,
      unit_price: item.unit_price,
    })),
  });
}
