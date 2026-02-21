import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { priceAt, toStripeCurrency, toStripeAmount, type Currency } from "@/lib/pricing";
import { TOTAL_PIECES } from "@/lib/piece-config";
import { getSoldPieceCount, checkPiecesAvailable, createOrder } from "@/lib/sqlite";

export const runtime = "nodejs";

const MAX_CART_ITEMS = 20;
const VALID_CURRENCIES: Currency[] = ["CHF", "EUR", "USD"];
const VALID_FRAME_COLORS = ["white", "black", "natural"];

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://127.0.0.1:4321";

interface CheckoutItem {
  imageId: number;
  frameColor: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, currency } = body as {
      items: CheckoutItem[];
      currency: Currency;
    };

    // Validate currency
    if (!VALID_CURRENCIES.includes(currency)) {
      return NextResponse.json(
        { error: "Invalid currency." },
        { status: 400 }
      );
    }

    // Validate items
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Cart is empty." },
        { status: 400 }
      );
    }

    if (items.length > MAX_CART_ITEMS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_CART_ITEMS} items per order.` },
        { status: 400 }
      );
    }

    // Validate each item
    const imageIds: number[] = [];
    const frameColors: string[] = [];

    for (const item of items) {
      if (
        !Number.isInteger(item.imageId) ||
        item.imageId < 1 ||
        item.imageId > TOTAL_PIECES
      ) {
        return NextResponse.json(
          { error: `Invalid image ID: ${item.imageId}` },
          { status: 400 }
        );
      }
      if (!VALID_FRAME_COLORS.includes(item.frameColor)) {
        return NextResponse.json(
          { error: `Invalid frame color: ${item.frameColor}` },
          { status: 400 }
        );
      }
      imageIds.push(item.imageId);
      frameColors.push(item.frameColor);
    }

    // Check for duplicates
    if (new Set(imageIds).size !== imageIds.length) {
      return NextResponse.json(
        { error: "Duplicate items in cart." },
        { status: 400 }
      );
    }

    // Check availability
    const available = checkPiecesAvailable(imageIds);
    const unavailable = imageIds.filter((id) => !available.includes(id));

    if (unavailable.length > 0) {
      return NextResponse.json(
        {
          error: "Some pieces are no longer available.",
          soldPieceIds: unavailable,
        },
        { status: 409 }
      );
    }

    // Calculate price
    const soldCount = getSoldPieceCount();
    const unitPrice = priceAt(soldCount);
    const totalAmount = unitPrice * items.length;
    const stripeAmount = toStripeAmount(unitPrice, currency);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: toStripeCurrency(currency),
            product_data: {
              name: items.length === 1
                ? `I LAUGH YOU — Piece #${imageIds[0]}`
                : `I LAUGH YOU — ${items.length} Pieces`,
              description: `Enhanced Matte Paper Framed Poster (12"×16")`,
            },
            unit_amount: stripeAmount,
          },
          quantity: items.length,
        },
      ],
      shipping_address_collection: {
        allowed_countries: [
          "US", "CA", "GB", "DE", "FR", "ES", "IT", "CH", "AT", "NL",
          "BE", "SE", "NO", "DK", "FI", "IE", "PT", "AU", "NZ", "JP",
        ],
      },
      metadata: {
        imageIds: JSON.stringify(imageIds),
        frameColors: JSON.stringify(frameColors),
        currency,
        unitPrice: String(Math.floor(unitPrice)),
      },
      success_url: `${BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/cart`,
    });

    // Create pending order in DB
    if (session.id) {
      createOrder({
        stripeSessionId: session.id,
        buyerEmail: "", // Will be filled on webhook
        currency,
        unitPrice: Math.floor(unitPrice),
        totalAmount: Math.floor(totalAmount),
        itemCount: items.length,
      });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[Checkout] Error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session." },
      { status: 500 }
    );
  }
}
