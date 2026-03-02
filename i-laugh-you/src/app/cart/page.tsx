"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import "@/lib/i18n/i18n";
import { useCart, type FrameColor } from "@/hooks/useCart";
import { useFavorites } from "@/hooks/useFavorites";
import { useCurrency } from "@/hooks/useCurrency";
import { priceAt, formatPrice } from "@/lib/pricing";
import FrameColorPicker from "@/components/FrameColorPicker";
import CartPieceImage from "@/components/CartPieceImage";
import HeaderNav from "@/components/sections/HeaderNav";

const FRAME_BORDER_COLORS: Record<FrameColor, string> = {
  black: "#1a1a1a",
  white: "#f0f0f0",
  natural: "#C4A777",
};

export default function CartPage() {
  const { t, i18n } = useTranslation(["shop", "common"]);
  const { items, removeItem, updateFrameColor, setAllFrameColors, itemCount } = useCart();
  const { likedIds, basketIds } = useFavorites();
  const { currency } = useCurrency();
  const [soldPieceCount, setSoldPieceCount] = useState<number>(0);
  const [soldImageIds, setSoldImageIds] = useState<Set<number>>(new Set());
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [applyAllColor, setApplyAllColor] = useState<FrameColor>("black");
  const currentYear = new Date().getFullYear();

  const handleLangChange = (code: string) => {
    i18n.changeLanguage(code);
  };

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

  // ---------- EMPTY CART ----------
  if (itemCount === 0) {
    return (
      <>
        <style>{`#header-nav { opacity: 1 !important; }`}</style>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)",
          backgroundSize: "400% 400%",
          animation: "Gradient 15s ease infinite",
        }}>
          <HeaderNav
            lang={i18n.language}
            onLangChange={handleLangChange}
            likedCount={likedIds.size}
            basketCount={basketIds.size}
          />

          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            padding: "100px 20px 60px",
            fontFamily: "var(--font-oswald)",
          }}>
            <div style={{ textAlign: "center", maxWidth: "480px" }}>
              <div style={{ fontSize: "4rem", marginBottom: "16px", opacity: 0.25 }}>&#9675;</div>
              <h1 style={{
                fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
                marginBottom: "12px",
                fontWeight: 600,
                letterSpacing: "0.02em",
              }}>
                {t("shop:cart.empty")}
              </h1>
              <p style={{
                fontSize: "clamp(0.95rem, 2vw, 1.1rem)",
                opacity: 0.6,
                marginBottom: "36px",
                lineHeight: 1.5,
              }}>
                {t("shop:cart.emptySubtitle")}
              </p>
              <a
                href="/"
                style={{
                  display: "inline-block",
                  color: "white",
                  textDecoration: "none",
                  fontSize: "1.05rem",
                  fontWeight: 600,
                  fontFamily: "var(--font-oswald)",
                  background: "rgba(255, 0, 105, 1)",
                  padding: "14px 36px",
                  borderRadius: "6px",
                  letterSpacing: "0.03em",
                }}
              >
                {t("shop:cart.continueShopping")}
              </a>
            </div>
          </div>

          {/* Footer */}
          <div id="black-footer" style={{ position: "relative", zIndex: 1 }}>
            <a href="/about">{t("common:footer.about")}</a>
            <a href="/blog">{t("common:footer.blog")}</a>
          </div>
        </div>
      </>
    );
  }

  // ---------- CART WITH ITEMS ----------
  return (
    <>
      <style>{`#header-nav { opacity: 1 !important; }`}</style>
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        color: "white",
        fontFamily: "var(--font-oswald)",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)",
        backgroundSize: "400% 400%",
        animation: "Gradient 15s ease infinite",
      }}>
        <HeaderNav
          lang={i18n.language}
          onLangChange={handleLangChange}
          likedCount={likedIds.size}
          basketCount={basketIds.size}
        />

        <div style={{
          flex: 1,
          maxWidth: "960px",
          width: "100%",
          margin: "0 auto",
          padding: "90px 20px 40px",
        }}>
          {/* Header */}
          <h1 style={{
            fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
            fontWeight: 700,
            letterSpacing: "0.02em",
            marginBottom: "28px",
          }}>
            {t("shop:cart.title")}
          </h1>

          {/* Sold items warning */}
          {soldItems.length > 0 && (
            <div style={{
              padding: "14px 20px",
              background: "rgba(255, 60, 60, 0.15)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 60, 60, 0.3)",
              borderRadius: "12px",
              marginBottom: "20px",
              fontSize: "0.9rem",
              lineHeight: 1.5,
            }}>
              {t("shop:cart.soldWarning", { count: soldItems.length })}
            </div>
          )}

          {/* Cart items */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "32px" }}>
            {items.map((item) => {
              const isSold = soldImageIds.has(item.imageId);
              const frameBorder = FRAME_BORDER_COLORS[item.frameColor];
              return (
                <div
                  key={item.imageId}
                  style={{
                    display: "flex",
                    gap: "clamp(12px, 3vw, 24px)",
                    padding: "clamp(12px, 3vw, 20px)",
                    background: isSold
                      ? "rgba(255, 40, 40, 0.08)"
                      : "rgba(255, 255, 255, 0.06)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    borderRadius: "16px",
                    border: isSold
                      ? "1px solid rgba(255, 60, 60, 0.3)"
                      : "1px solid rgba(255, 255, 255, 0.1)",
                    opacity: isSold ? 0.5 : 1,
                    transition: "all 0.3s ease",
                    alignItems: "center",
                  }}
                >
                  {/* Artwork with frame preview */}
                  <div style={{
                    flexShrink: 0,
                    padding: "10px",
                    backgroundColor: frameBorder,
                    borderRadius: "3px",
                    boxShadow: "0 8px 30px rgba(0, 0, 0, 0.35)",
                    transition: "background-color 0.3s ease",
                  }}>
                    <CartPieceImage imageId={item.imageId} displayWidth={200} zoom={9} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 700,
                      fontSize: "clamp(1.1rem, 2.5vw, 1.3rem)",
                      marginBottom: "2px",
                    }}>
                      {t("shop:cart.pieceLabel", { id: item.imageId })}
                      {isSold && (
                        <span style={{
                          marginLeft: "10px",
                          fontSize: "0.7rem",
                          color: "rgba(255, 80, 80, 1)",
                          fontWeight: 500,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          background: "rgba(255, 60, 60, 0.2)",
                          padding: "2px 8px",
                          borderRadius: "3px",
                        }}>
                          {t("shop:cart.soldBadge")}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: "0.8rem", opacity: 0.5, marginBottom: "4px" }}>
                      {t("shop:cart.framedPoster")}
                    </div>

                    <div style={{
                      fontSize: "0.75rem",
                      opacity: 0.35,
                      marginBottom: "10px",
                      fontStyle: "italic",
                    }}>
                      {t("shop:cart.uniqueNote")}
                    </div>

                    {/* Frame color picker */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "0.8rem", opacity: 0.5 }}>
                        {t("shop:cart.frame")}:
                      </span>
                      <FrameColorPicker
                        selected={item.frameColor}
                        onChange={(color) => updateFrameColor(item.imageId, color)}
                        size={20}
                      />
                    </div>
                  </div>

                  {/* Price + remove */}
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: "12px",
                    flexShrink: 0,
                  }}>
                    {!isSold && (
                      <div style={{
                        fontWeight: 700,
                        fontSize: "clamp(1.2rem, 3vw, 1.5rem)",
                      }}>
                        {formatPrice(unitPrice, currency)}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeItem(item.imageId)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "rgba(255, 255, 255, 0.3)",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        padding: "4px 0",
                        textDecoration: "underline",
                        textUnderlineOffset: "3px",
                        fontFamily: "var(--font-oswald)",
                        transition: "color 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "rgba(255, 80, 80, 0.8)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "rgba(255, 255, 255, 0.3)";
                      }}
                    >
                      {t("shop:cart.remove")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Apply frame to all (only if multiple items) */}
          {items.length > 1 && (
            <div style={{
              display: "flex",
              gap: "10px",
              marginBottom: "24px",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px 20px",
              background: "rgba(255, 255, 255, 0.04)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderRadius: "10px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}>
              <span style={{ opacity: 0.5, fontSize: "0.85rem" }}>
                {t("shop:cart.applyAllFrames")}:
              </span>
              <FrameColorPicker selected={applyAllColor} onChange={setApplyAllColor} size={22} />
              <button
                type="button"
                onClick={handleApplyAllColors}
                style={{
                  padding: "4px 12px",
                  borderRadius: "4px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  background: "transparent",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontFamily: "var(--font-oswald)",
                }}
              >
                {t("shop:cart.applyAll")}
              </button>
            </div>
          )}

          {/* Order Summary + Checkout */}
          <div style={{
            padding: "24px",
            background: "rgba(255, 255, 255, 0.06)",
            backdropFilter: "blur(32px)",
            WebkitBackdropFilter: "blur(32px)",
            borderRadius: "16px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            marginBottom: "32px",
            boxSizing: "border-box",
            maxWidth: "100%",
            overflow: "hidden",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
                <span style={{ opacity: 0.6 }}>{t("shop:cart.unitPrice")}</span>
                <span>{formatPrice(unitPrice, currency)}</span>
              </div>
              {availableItems.length > 1 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
                  <span style={{ opacity: 0.6 }}>{t("shop:cart.quantity")}</span>
                  <span>&times; {availableItems.length}</span>
                </div>
              )}
              <div style={{
                height: "1px",
                background: "rgba(255, 255, 255, 0.1)",
                margin: "2px 0",
              }} />
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 700,
                fontSize: "clamp(1.2rem, 3vw, 1.5rem)",
              }}>
                <span>{t("shop:cart.subtotal")}</span>
                <span>{formatPrice(subtotal, currency)}</span>
              </div>
            </div>

            <div style={{
              fontSize: "0.8rem",
              opacity: 0.4,
              marginBottom: "16px",
              textAlign: "center",
            }}>
              {t("shop:cart.shippingNote")}
            </div>

            {checkoutError && (
              <div style={{
                padding: "10px 14px",
                background: "rgba(255, 40, 40, 0.12)",
                border: "1px solid rgba(255, 60, 60, 0.3)",
                borderRadius: "8px",
                marginBottom: "16px",
                fontSize: "0.85rem",
                textAlign: "center",
              }}>
                {checkoutError}
              </div>
            )}

            <button
              type="button"
              onClick={handleCheckout}
              disabled={checkoutLoading || availableItems.length === 0}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "16px 0",
                borderRadius: "8px",
                border: "none",
                background: checkoutLoading ? "rgba(255, 0, 105, 0.5)" : "rgba(255, 0, 105, 1)",
                color: "white",
                fontSize: "1.1rem",
                fontWeight: 700,
                cursor: checkoutLoading ? "wait" : "pointer",
                opacity: availableItems.length === 0 ? 0.4 : 1,
                fontFamily: "var(--font-oswald)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                transition: "all 0.25s ease",
                boxShadow: "0 4px 20px rgba(255, 0, 105, 0.3)",
              }}
              onMouseEnter={(e) => {
                if (!checkoutLoading) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 30px rgba(255, 0, 105, 0.5)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(255, 0, 105, 0.3)";
              }}
            >
              {checkoutLoading ? t("shop:checkout.processing") : t("shop:checkout.proceed")}
            </button>

            <a
              href="/"
              style={{
                display: "block",
                textAlign: "center",
                color: "rgba(255, 255, 255, 0.45)",
                textDecoration: "none",
                fontSize: "0.85rem",
                marginTop: "14px",
              }}
            >
              {t("shop:cart.continueShopping")}
            </a>
          </div>
        </div>

        {/* Footer */}
        <div id="social-bar" style={{ margin: 0, position: "relative", zIndex: 1 }}>
          <a href="https://www.facebook.com/ilaughyouofficial" target="_blank" rel="noopener noreferrer">
            <Image src="/img/512facebook.png" alt="Facebook" width={90} height={90} style={{ width: "auto", height: "auto" }} />
          </a>
          <a href="https://www.instagram.com/ilaughyouofficial" target="_blank" rel="noopener noreferrer">
            <Image src="/img/512insta.png" alt="Instagram" width={90} height={90} style={{ width: "auto", height: "auto" }} />
          </a>
          <a href="https://twitter.com/ily6059" target="_blank" rel="noopener noreferrer">
            <Image src="/img/512twitter.png" alt="Twitter" width={90} height={90} style={{ width: "auto", height: "auto" }} />
          </a>
          <a href="https://www.pinterest.ch/ily6059/pins/" target="_blank" rel="noopener noreferrer">
            <Image src="/img/512pinterest.png" alt="Pinterest" width={90} height={90} style={{ width: "auto", height: "auto" }} />
          </a>
        </div>
        <div id="footer-wrapper" style={{ margin: 0, position: "relative", zIndex: 1 }}>
          <div id="where-is-me-from" className="big-title" style={{ margin: 0 }}>
            <p>
              &copy; {currentYear}
              <br />
              {t("common:footer.madeWith")}
            </p>
          </div>
          <div id="black-footer">
            <a href="/about">{t("common:footer.about")}</a>
            <a href="/blog">{t("common:footer.blog")}</a>
          </div>
        </div>
      </div>
    </>
  );
}
