import { NextRequest, NextResponse } from "next/server";
import { getOrderItems, getOrderById, updateOrderItemPrintful } from "@/lib/sqlite";
import { sendShippingNotification } from "@/lib/resend";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Validate webhook secret (Printful v1 has no built-in signing)
  const secret = request.nextUrl.searchParams.get("secret");
  if (
    process.env.PRINTFUL_WEBHOOK_SECRET &&
    secret !== process.env.PRINTFUL_WEBHOOK_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();

    const { type, data } = body as {
      type: string;
      data: {
        order: {
          id: number;
          external_id: string;
          status: string;
          shipments?: Array<{
            tracking_number: string;
            tracking_url: string;
          }>;
        };
      };
    };

    // Parse our external_id format: "ily-{orderId}-{imageId}"
    const externalId = data?.order?.external_id;
    if (!externalId || !externalId.startsWith("ily-")) {
      return NextResponse.json({ received: true });
    }

    const parts = externalId.split("-");
    const orderId = Number(parts[1]);
    const imageId = Number(parts[2]);

    if (!Number.isFinite(orderId) || !Number.isFinite(imageId)) {
      return NextResponse.json({ received: true });
    }

    const orderItems = getOrderItems(orderId);
    const matchingItem = orderItems.find((item) => item.image_id === imageId);

    if (!matchingItem) {
      console.warn(`[Printful Webhook] No matching order item for ${externalId}`);
      return NextResponse.json({ received: true });
    }

    const shipment = data.order.shipments?.[0];

    updateOrderItemPrintful({
      id: matchingItem.id,
      printfulOrderId: String(data.order.id),
      printfulStatus: data.order.status,
      printfulTrackingUrl: shipment?.tracking_url ?? null,
      printfulTrackingNumber: shipment?.tracking_number ?? null,
    });

    console.log(
      `[Printful Webhook] Updated item ${matchingItem.id}: status=${data.order.status}`
    );

    // Send shipping notification email when order ships
    if (
      (data.order.status === "shipped" || type === "package_shipped") &&
      shipment
    ) {
      const order = getOrderById(orderId);
      if (order?.buyer_email) {
        try {
          // TODO: The `orders` table has no `locale` column yet — a future
          // migration should add one so we can send shipping emails in the
          // buyer's language. Until then, default to English.
          await sendShippingNotification({
            buyerEmail: order.buyer_email,
            buyerName: order.buyer_name || "Collector",
            orderId,
            imageId,
            trackingUrl: shipment.tracking_url ?? null,
            trackingNumber: shipment.tracking_number ?? null,
            locale: "en",
          });
        } catch (emailErr) {
          console.error("[Printful Webhook] Shipping email failed:", emailErr);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Printful Webhook] Error:", err);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
