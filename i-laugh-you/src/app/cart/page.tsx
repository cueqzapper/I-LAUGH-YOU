"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/i18n";
import { useCart, type FrameColor } from "@/hooks/useCart";
import { useCurrency } from "@/hooks/useCurrency";
import { priceAt, formatPrice, type Currency } from "@/lib/pricing";
import FrameColorPicker from "@/components/FrameColorPicker";

const TILE_SERVER_BASE_URL = "http://ily.seez.ch/";
const CURRENCIES: Currency[] = ["CHF", "EUR", "USD"];

function getThumbnailUrl(imageId: number): string {
  // Use zoom level 8 tile for a small thumbnail
  // This is a simplified approach — gets the central tile at low zoom
  const PIECE_COLUMNS = 166;
  const PIECE_ROWS = 146;
  const SOURCE_IMAGE_WIDTH = 337920;
  const SOURCE_IMAGE_HEIGHT = 396288;
  const SOURCE_OFFSETS = { top: 3873, right: 3083, bottom: 1573, left: 1509 };
  const FINAL_IMAGE_WIDTH = (SOURCE_IMAGE_WIDTH - SOURCE_OFFSETS.right - SOURCE_OFFSETS.left) / PIECE_COLUMNS;
  const FINAL_IMAGE_HEIGHT = (SOURCE_IMAGE_HEIGHT - SOURCE_OFFSETS.top - SOURCE_OFFSETS.bottom) / PIECE_ROWS;
  const TILE_DIMENSION = 256;
  const MAX_ZOOM_LEVEL = 11;
  const zoom = 8;

  const normalizedId = imageId - 1;
  let yCoord = Math.floor(normalizedId / PIECE_COLUMNS) * FINAL_IMAGE_HEIGHT + SOURCE_OFFSETS.top;
  let xCoord = (normalizedId % PIECE_COLUMNS) * FINAL_IMAGE_WIDTH + SOURCE_OFFSETS.left;

  for (let t = 0; t < MAX_ZOOM_LEVEL - zoom; t++) {
    xCoord /= 2;
    yCoord /= 2;
  }

  const tileX = Math.floor(xCoord / TILE_DIMENSION);
  const tileY = Math.floor(yCoord / TILE_DIMENSION);

  let quadKey = "q";
  for (let i = zoom; i > 0; i--) {
    let digit = 0;
    const mask = 1 << (i - 1);
    if ((tileX & mask) !== 0) digit += 1;
    if ((tileY & mask) !== 0) digit += 2;
    quadKey += `t${digit}`;
  }

  let dirname = TILE_SERVER_BASE_URL;
  if (zoom % 2 === 0) {
    for (let i = 1; i < zoom + 1; i++) {
      if (i % 2 === 0) {
        dirname += `${quadKey.substring(0, quadKey.length - (zoom - i) * 2 - 1)}\\`;
      }
    }
  } else {
    for (let i = 1; i < zoom; i++) {
      if (i % 2 !== 0) {
        dirname += `${quadKey.substring(0, quadKey.length - (zoom - i) * 2 + 1)}\\`;
      }
    }
  }

  return `${dirname}${quadKey}.jpg`;
}

export default function CartPage() {
  const { t } = useTranslation(["shop", "common"]);
  const { items, removeItem, updateFrameColor, setAllFrameColors, clearCart, itemCount } = useCart();
  const { currency, setCurrency } = useCurrency();
  const [soldPieceCount, setSoldPieceCount] = useState<number>(0);
  const [soldImageIds, setSoldImageIds] = useState<Set<number>>(new Set());
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [applyAllColor, setApplyAllColor] = useState<FrameColor>("black");

  useEffect(() => {
    const loadSold = async () => {
      try {
        const res = await fetch("/api/pieces/sold", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.soldCount === "number") setSoldPieceCount(data.soldCount);
        if (Array.isArray(data.soldImageIds)) setSoldImageIds(new Set(data.soldImageIds));
      } catch {
        // ignore
      }
    };
    void loadSold();
  }, []);

  const unitPrice = priceAt(soldPieceCount);
  const availableItems = items.filter((item) => !soldImageIds.has(item.imageId));
  const soldItems = items.filter((item) => soldImageIds.has(item.imageId));
  const subtotal = availableItems.length * unitPrice;

  const handleCheckout = useCallback(async () => {
    if (availableItems.length === 0) return;

    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: availableItems.map((item) => ({
            imageId: item.imageId,
            frameColor: item.frameColor,
          })),
          currency,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCheckoutError(data.error || t("shop:checkout.error"));
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setCheckoutError(t("shop:checkout.error"));
    } finally {
      setCheckoutLoading(false);
    }
  }, [availableItems, currency, t]);

  const handleApplyAllColors = () => {
    setAllFrameColors(applyAllColor);
  };

  if (itemCount === 0) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        padding: "40px 20px",
        fontFamily: "var(--font-oswald)",
      }}>
        <div id="background-image" />
        <h1 style={{ fontSize: "2rem", marginBottom: "20px" }}>{t("shop:cart.title")}</h1>
        <p style={{ fontSize: "1.2rem", opacity: 0.7, marginBottom: "30px" }}>{t("shop:cart.empty")}</p>
        <a
          href="/"
          style={{
            color: "rgba(255, 0, 105, 1)",
            textDecoration: "none",
            fontSize: "1.1rem",
            border: "1px solid rgba(255, 0, 105, 0.5)",
            padding: "10px 24px",
            borderRadius: "4px",
          }}
        >
          {t("shop:cart.continueShopping")}
        </a>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      color: "white",
      padding: "100px 20px 40px",
      fontFamily: "var(--font-oswald)",
      maxWidth: "900px",
      margin: "0 auto",
    }}>
      <div id="background-image" />

      <h1 style={{ fontSize: "2rem", marginBottom: "8px" }}>{t("shop:cart.title")}</h1>
      <p style={{ opacity: 0.6, marginBottom: "30px" }}>
        {t("shop:cart.itemCount", { count: availableItems.length })}
      </p>

      {/* Currency selector */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", alignItems: "center" }}>
        <span style={{ opacity: 0.7, marginRight: "8px" }}>{t("shop:cart.currency")}:</span>
        {CURRENCIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCurrency(c)}
            style={{
              padding: "6px 16px",
              borderRadius: "4px",
              border: currency === c ? "2px solid rgba(255, 0, 105, 1)" : "1px solid rgba(255,255,255,0.3)",
              background: currency === c ? "rgba(255, 0, 105, 0.15)" : "transparent",
              color: "white",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Apply frame color to all */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ opacity: 0.7 }}>{t("shop:cart.applyAllFrames")}:</span>
        <FrameColorPicker selected={applyAllColor} onChange={setApplyAllColor} size={24} />
        <button
          type="button"
          onClick={handleApplyAllColors}
          style={{
            padding: "4px 14px",
            borderRadius: "4px",
            border: "1px solid rgba(255,255,255,0.3)",
            background: "transparent",
            color: "white",
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          {t("shop:cart.applyAll")}
        </button>
      </div>

      {/* Cart items */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "30px" }}>
        {items.map((item) => {
          const isSold = soldImageIds.has(item.imageId);
          return (
            <div
              key={item.imageId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "12px 16px",
                background: isSold ? "rgba(255, 0, 0, 0.1)" : "rgba(255,255,255,0.05)",
                borderRadius: "8px",
                border: isSold ? "1px solid rgba(255, 0, 0, 0.4)" : "1px solid rgba(255,255,255,0.1)",
                opacity: isSold ? 0.6 : 1,
              }}
            >
              {/* Thumbnail */}
              <img
                src={getThumbnailUrl(item.imageId)}
                alt={`Piece #${item.imageId}`}
                style={{
                  width: "60px",
                  height: "80px",
                  objectFit: "cover",
                  borderRadius: "4px",
                }}
              />

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "1rem" }}>
                  Piece #{item.imageId}
                  {isSold && (
                    <span style={{
                      marginLeft: "8px",
                      fontSize: "0.75rem",
                      color: "rgba(255, 80, 80, 1)",
                      fontWeight: 400,
                    }}>
                      {t("shop:cart.soldBadge")}
                    </span>
                  )}
                </div>
                <div style={{ marginTop: "6px" }}>
                  <FrameColorPicker
                    selected={item.frameColor}
                    onChange={(color) => updateFrameColor(item.imageId, color)}
                    size={22}
                  />
                </div>
              </div>

              {/* Price */}
              <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                {!isSold && (
                  <div style={{ fontWeight: 600 }}>{formatPrice(unitPrice, currency)}</div>
                )}
              </div>

              {/* Remove */}
              <button
                type="button"
                onClick={() => removeItem(item.imageId)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                  fontSize: "1.4rem",
                  padding: "4px 8px",
                  lineHeight: 1,
                }}
                title={t("shop:cart.remove")}
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>

      {/* Sold items warning */}
      {soldItems.length > 0 && (
        <div style={{
          padding: "12px 16px",
          background: "rgba(255, 0, 0, 0.08)",
          border: "1px solid rgba(255, 0, 0, 0.3)",
          borderRadius: "8px",
          marginBottom: "20px",
          fontSize: "0.9rem",
        }}>
          {t("shop:cart.soldWarning", { count: soldItems.length })}
        </div>
      )}

      {/* Subtotal + checkout */}
      <div style={{
        padding: "20px",
        background: "rgba(255,255,255,0.05)",
        borderRadius: "8px",
        border: "1px solid rgba(255,255,255,0.1)",
        marginBottom: "20px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span>{t("shop:cart.unitPrice")}:</span>
          <span>{formatPrice(unitPrice, currency)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span>{t("shop:cart.quantity")}:</span>
          <span>&times; {availableItems.length}</span>
        </div>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: 700,
          fontSize: "1.2rem",
          borderTop: "1px solid rgba(255,255,255,0.2)",
          paddingTop: "12px",
          marginTop: "8px",
        }}>
          <span>{t("shop:cart.subtotal")}:</span>
          <span>{formatPrice(subtotal, currency)}</span>
        </div>
      </div>

      {checkoutError && (
        <div style={{
          padding: "10px 16px",
          background: "rgba(255, 0, 0, 0.1)",
          border: "1px solid rgba(255, 0, 0, 0.4)",
          borderRadius: "6px",
          marginBottom: "16px",
          fontSize: "0.9rem",
        }}>
          {checkoutError}
        </div>
      )}

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handleCheckout}
          disabled={checkoutLoading || availableItems.length === 0}
          style={{
            padding: "14px 32px",
            borderRadius: "6px",
            border: "none",
            background: "rgba(255, 0, 105, 1)",
            color: "white",
            fontSize: "1.1rem",
            fontWeight: 600,
            cursor: checkoutLoading ? "wait" : "pointer",
            opacity: checkoutLoading || availableItems.length === 0 ? 0.5 : 1,
            fontFamily: "var(--font-oswald)",
          }}
        >
          {checkoutLoading ? t("shop:checkout.processing") : t("shop:checkout.proceed")}
        </button>

        <a
          href="/"
          style={{
            padding: "14px 24px",
            borderRadius: "6px",
            border: "1px solid rgba(255,255,255,0.3)",
            color: "white",
            textDecoration: "none",
            fontSize: "1rem",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          {t("shop:cart.continueShopping")}
        </a>
      </div>
    </div>
  );
}
