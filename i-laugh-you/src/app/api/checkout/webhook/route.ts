import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import {
  getOrderByStripeSession,
  fulfillOrderTransaction,
} from "@/lib/sqlite";
import { formatPrice, type Currency } from "@/lib/pricing";
import { sendPurchaseConfirmation } from "@/lib/resend";
import { createPrintfulOrder } from "@/lib/printful";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("[Webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      const order = getOrderByStripeSession(session.id);
      if (!order) {
        console.error("[Webhook] No order found for session:", session.id);
        return NextResponse.json({ received: true });
      }

      // Parse metadata
      const imageIds: number[] = JSON.parse(session.metadata?.imageIds || "[]");
      const frameColors: string[] = JSON.parse(session.metadata?.frameColors || "[]");
      const currency = (session.metadata?.currency || "USD") as Currency;
      const unitPrice = Number(session.metadata?.unitPrice || "0");

      // Extract customer info
      const customerEmail = session.customer_details?.email || "";
      const customerName = session.customer_details?.name || "";

      // Retrieve full session to get shipping details
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["shipping_details"],
      }) as unknown as {
        shipping_details?: {
          name?: string | null;
          address?: {
            line1?: string | null;
            line2?: string | null;
            city?: string | null;
            state?: string | null;
            postal_code?: string | null;
            country?: string | null;
          } | null;
        } | null;
      };
      const shipping = fullSession.shipping_details;

      // Build order items
      const items = imageIds.map((imageId, index) => ({
        orderId: order.id,
        imageId,
        frameColor: frameColors[index] || "black",
        unitPrice,
      }));

      // Atomically fulfill — marks pieces sold + creates order items
      const result = fulfillOrderTransaction({
        orderId: order.id,
        buyerEmail: customerEmail,
        buyerName: customerName,
        items,
        shippingName: shipping?.name ?? null,
        shippingAddress1: shipping?.address?.line1 ?? null,
        shippingAddress2: shipping?.address?.line2 ?? null,
        shippingCity: shipping?.address?.city ?? null,
        shippingState: shipping?.address?.state ?? null,
        shippingPostalCode: shipping?.address?.postal_code ?? null,
        shippingCountry: shipping?.address?.country ?? null,
        stripePaymentIntentId: typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
      });

      // Refund for conflicted items
      if (result.conflictedImageIds.length > 0 && typeof session.payment_intent === "string") {
        const refundAmount = result.conflictedImageIds.length * unitPrice * 100;
        try {
          await stripe.refunds.create({
            payment_intent: session.payment_intent,
            amount: Math.round(refundAmount),
          });
          console.log(
            `[Webhook] Refunded ${result.conflictedImageIds.length} conflicted items for order ${order.id}`
          );
        } catch (refundErr) {
          console.error("[Webhook] Refund failed:", refundErr);
        }
      }

      // Send purchase confirmation email via Resend
      if (customerEmail && result.fulfilledImageIds.length > 0) {
        const totalStr = formatPrice(result.fulfilledImageIds.length * unitPrice, currency);
        try {
          await sendPurchaseConfirmation({
            buyerEmail: customerEmail,
            buyerName: customerName || "Collector",
            imageIds: result.fulfilledImageIds,
            totalAmount: totalStr,
            currency,
            orderId: order.id,
          });
        } catch (emailErr) {
          console.error("[Webhook] Email send failed:", emailErr);
        }
      }

      // Trigger Printful orders for fulfilled items
      if (shipping && result.fulfilledImageIds.length > 0) {
        for (const imageId of result.fulfilledImageIds) {
          const frameColor = frameColors[imageIds.indexOf(imageId)] || "black";
          try {
            await createPrintfulOrder({
              imageId,
              frameColor,
              recipientName: shipping.name || customerName,
              recipientEmail: customerEmail,
              address1: shipping.address?.line1 || "",
              address2: shipping.address?.line2 || null,
              city: shipping.address?.city || "",
              stateCode: shipping.address?.state || "",
              postalCode: shipping.address?.postal_code || "",
              countryCode: shipping.address?.country || "",
              orderId: order.id,
            });
          } catch (printfulErr) {
            console.error(
              `[Webhook] Printful order failed for image ${imageId}:`,
              printfulErr
            );
          }
        }
      }
    } catch (err) {
      console.error("[Webhook] Fulfillment error:", err);
    }
  }

  return NextResponse.json({ received: true });
}
