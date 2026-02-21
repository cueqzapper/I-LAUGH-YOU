import { updateOrderItemPrintful, getOrderItems } from "@/lib/sqlite";

const PRINTFUL_API_BASE = "https://api.printful.com";
const PRINTFUL_API_TOKEN = process.env.PRINTFUL_API_TOKEN;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://127.0.0.1:4321";

/**
 * Printful variant IDs for Premium Luster Photo Paper Framed Poster 12"x16"
 * Product ID: 172 — variants by frame color.
 * Catalog ref: https://api.printful.com/products/172
 */
const FRAME_VARIANT_MAP: Record<string, number> = {
  black: 6886,
  white: 10764,
  natural: 15010, // "Red Oak" in Printful's catalog
};

interface CreatePrintfulOrderInput {
  imageId: number;
  frameColor: string;
  recipientName: string;
  recipientEmail: string;
  address1: string;
  address2: string | null;
  city: string;
  stateCode: string;
  postalCode: string;
  countryCode: string;
  orderId: number;
}

export async function createPrintfulOrder(input: CreatePrintfulOrderInput) {
  if (!PRINTFUL_API_TOKEN) {
    console.warn("[Printful] No API token configured — skipping order creation.");
    return null;
  }

  const variantId = FRAME_VARIANT_MAP[input.frameColor] ?? FRAME_VARIANT_MAP.black;
  const artworkUrl = `${BASE_URL}/api/pieces/${input.imageId}/artwork`;

  const orderPayload = {
    external_id: `ily-${input.orderId}-${input.imageId}`,
    recipient: {
      name: input.recipientName,
      email: input.recipientEmail,
      address1: input.address1,
      address2: input.address2 || undefined,
      city: input.city,
      state_code: input.stateCode,
      country_code: input.countryCode,
      zip: input.postalCode,
    },
    items: [
      {
        variant_id: variantId,
        quantity: 1,
        name: `I LAUGH YOU — Piece #${input.imageId}`,
        files: [
          {
            type: "default",
            url: artworkUrl,
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(`${PRINTFUL_API_BASE}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PRINTFUL_API_TOKEN}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Printful] Order creation failed:", data);
      return null;
    }

    // Update the order item with Printful info
    const orderItems = getOrderItems(input.orderId);
    const matchingItem = orderItems.find((item) => item.image_id === input.imageId);

    if (matchingItem) {
      updateOrderItemPrintful({
        id: matchingItem.id,
        printfulOrderId: String(data.result?.id ?? ""),
        printfulStatus: data.result?.status ?? "pending",
      });
    }

    return data.result;
  } catch (err) {
    console.error("[Printful] API request failed:", err);
    return null;
  }
}
