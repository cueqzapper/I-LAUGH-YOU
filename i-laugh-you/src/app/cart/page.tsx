"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import "@/lib/i18n/i18n";
import { persistLanguageChoice, applyDetectedLanguage } from "@/lib/i18n/i18n";
import { useCart, type FrameColor } from "@/hooks/useCart";
import { useFavorites } from "@/hooks/useFavorites";
import { useCurrency } from "@/hooks/useCurrency";
import { priceAt, formatPrice } from "@/lib/pricing";
import FrameColorPicker from "@/components/FrameColorPicker";
import CartPieceImage from "@/components/CartPieceImage";
import FramedPosterMockup from "@/components/FramedPosterMockup";
import HeaderNav from "@/components/sections/HeaderNav";

const FRAME_BORDER_COLORS: Record<FrameColor, string> = {
  black: "#1a1a1a",
  white: "#f0f0f0",
};

export default function CartPage() {
  const { t, i18n } = useTranslation(["shop", "common"]);
  const { items, removeItem, updateFrameColor, setAllFrameColors, itemCount } = useCart();
  const { basketIds } = useFavorites();
  const { currency } = useCurrency();
  const [soldPieceCount, setSoldPieceCount] = useState<number>(0);
  const [soldImageIds, setSoldImageIds] = useState<Set<number>>(new Set());
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [applyAllColor, setApplyAllColor] = useState<FrameColor>("black");
  const [showStickyBar, setShowStickyBar] = useState(false);
  const checkoutSectionRef = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();

  const handleLangChange = (code: string) => {
    i18n.changeLanguage(code);
    persistLanguageChoice(code);
  };

  // Apply detected language after hydration
  useEffect(() => { applyDetectedLanguage(); }, []);

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

  useEffect(() => {
    const el = checkoutSectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
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
          locale: i18n.language,
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
  }, [availableItems, currency, t, i18n.language]);

  const handleApplyAllColors = () => {
    setAllFrameColors(applyAllColor);
  };

  // ---------- EMPTY CART ----------
  if (itemCount === 0) {
    return (
      <>
        <style>{`#header-nav { opacity: 1 !important; pointer-events: auto !important; }`}</style>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(180deg, #fafafa 0%, #f4f4f6 100%)",
        }}>
          <HeaderNav
            lang={i18n.language}
            onLangChange={handleLangChange}
            basketCount={basketIds.size}
          />

          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#0f1423",
            padding: "100px 20px 60px",
            fontFamily: "var(--font-oswald)",
          }}>
            <div style={{ textAlign: "center", maxWidth: "480px" }}>
              <div style={{ fontSize: "4rem", marginBottom: "16px", color: "#9aa0ad" }}>&#9675;</div>
              <h1 style={{
                fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
                marginBottom: "12px",
                fontWeight: 700,
                letterSpacing: "0.02em",
                color: "#0f1423",
              }}>
                {t("shop:cart.empty")}
              </h1>
              <p style={{
                fontSize: "clamp(0.95rem, 2vw, 1.1rem)",
                color: "#6b7080",
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
                  boxShadow: "0 4px 20px rgba(255, 0, 105, 0.3)",
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
            <a href="/legal/impressum">{t("common:footer.impressum")}</a>
            <a href="/legal/privacy">{t("common:footer.privacy")}</a>
            <a href="/legal/terms">{t("common:footer.terms")}</a>
            <a href="/legal/returns">{t("common:footer.returns")}</a>
          </div>
        </div>
      </>
    );
  }

  // ---------- CART WITH ITEMS ----------
  return (
    <>
      <style>{`
        #header-nav { opacity: 1 !important; pointer-events: auto !important; }
        @media (max-width: 600px) {
          .cart-item-card {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 14px !important;
          }
          .cart-item-art-wrap { align-self: center !important; }
          .cart-item-info { text-align: center; }
          .cart-item-frame-row { justify-content: center !important; }
          .cart-item-price-col {
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
            width: 100% !important;
          }
        }
      `}</style>
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        color: "#0f1423",
        fontFamily: "var(--font-oswald)",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(180deg, #fafafa 0%, #f4f4f6 100%)",
      }}>
        <HeaderNav
          lang={i18n.language}
          onLangChange={handleLangChange}
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
            color: "#0f1423",
          }}>
            {t("shop:cart.title")}
          </h1>

          {/* Sold items warning */}
          {soldItems.length > 0 && (
            <div style={{
              padding: "14px 20px",
              background: "rgba(255, 60, 60, 0.08)",
              border: "1px solid rgba(255, 60, 60, 0.25)",
              borderRadius: "12px",
              marginBottom: "20px",
              fontSize: "0.9rem",
              lineHeight: 1.5,
              color: "#8a1a1a",
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
                  className="cart-item-card"
                  style={{
                    display: "flex",
                    gap: "clamp(12px, 3vw, 24px)",
                    padding: "clamp(12px, 3vw, 20px)",
                    background: isSold
                      ? "rgba(255, 40, 40, 0.05)"
                      : "#ffffff",
                    borderRadius: "16px",
                    border: isSold
                      ? "1px solid rgba(255, 60, 60, 0.25)"
                      : "1px solid rgba(15, 20, 35, 0.06)",
                    boxShadow: isSold
                      ? "none"
                      : "0 2px 8px rgba(15, 20, 35, 0.04), 0 8px 32px rgba(15, 20, 35, 0.06)",
                    opacity: isSold ? 0.6 : 1,
                    transition: "all 0.3s ease",
                    alignItems: "center",
                  }}
                >
                  {/* Artwork with frame preview */}
                  <div className="cart-item-art-wrap" style={{
                    flexShrink: 0,
                    padding: "10px",
                    backgroundColor: frameBorder,
                    borderRadius: "3px",
                    boxShadow: "0 8px 30px rgba(15, 20, 35, 0.18)",
                    transition: "background-color 0.3s ease",
                  }}>
                    <CartPieceImage imageId={item.imageId} displayWidth={200} zoom={9} />
                  </div>

                  {/* Info */}
                  <div className="cart-item-info" style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 700,
                      fontSize: "clamp(1.1rem, 2.5vw, 1.3rem)",
                      marginBottom: "2px",
                      color: "#0f1423",
                    }}>
                      {t("shop:cart.pieceLabel", { id: item.imageId })}
                      {isSold && (
                        <span style={{
                          marginLeft: "10px",
                          fontSize: "0.7rem",
                          color: "#a01a1a",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          background: "rgba(255, 60, 60, 0.12)",
                          border: "1px solid rgba(255, 60, 60, 0.25)",
                          padding: "2px 8px",
                          borderRadius: "3px",
                        }}>
                          {t("shop:cart.soldBadge")}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: "0.8rem", color: "#6b7080", marginBottom: "4px" }}>
                      {t("shop:cart.framedPoster")}
                    </div>

                    <div style={{
                      fontSize: "0.75rem",
                      color: "#9aa0ad",
                      marginBottom: "10px",
                      fontStyle: "italic",
                    }}>
                      {t("shop:cart.uniqueNote")}
                    </div>

                    {/* Frame color picker */}
                    <div className="cart-item-frame-row" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "0.8rem", color: "#6b7080" }}>
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
                  <div className="cart-item-price-col" style={{
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
                        color: "#0f1423",
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
                        color: "#9aa0ad",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        padding: "4px 0",
                        textDecoration: "underline",
                        textUnderlineOffset: "3px",
                        fontFamily: "var(--font-oswald)",
                        transition: "color 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#c41a1a";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#9aa0ad";
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
              background: "#ffffff",
              borderRadius: "10px",
              border: "1px solid rgba(15, 20, 35, 0.06)",
              boxShadow: "0 1px 4px rgba(15, 20, 35, 0.04)",
            }}>
              <span style={{ color: "#6b7080", fontSize: "0.85rem" }}>
                {t("shop:cart.applyAllFrames")}:
              </span>
              <FrameColorPicker selected={applyAllColor} onChange={setApplyAllColor} size={22} />
              <button
                type="button"
                onClick={handleApplyAllColors}
                style={{
                  padding: "4px 12px",
                  borderRadius: "4px",
                  border: "1px solid rgba(15, 20, 35, 0.15)",
                  background: "transparent",
                  color: "#0f1423",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontFamily: "var(--font-oswald)",
                }}
              >
                {t("shop:cart.applyAll")}
              </button>
            </div>
          )}

          {/* Product / delivery info — "So kommt es zu dir" */}
          {(() => {
            const showcaseItem = availableItems[0] ?? items[0];
            if (!showcaseItem) return null;
            return (
              <div style={{
                marginBottom: "28px",
                padding: "clamp(20px, 3vw, 32px)",
                background: "#ffffff",
                borderRadius: "16px",
                border: "1px solid rgba(15, 20, 35, 0.06)",
                boxShadow: "0 2px 8px rgba(15, 20, 35, 0.04), 0 8px 32px rgba(15, 20, 35, 0.06)",
                overflow: "hidden",
                position: "relative",
              }}>
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "clamp(24px, 4vw, 44px)",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <div style={{
                    flex: "0 0 auto",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "10px",
                  }}>
                    <FramedPosterMockup
                      imageId={showcaseItem.imageId}
                      frameColor={showcaseItem.frameColor}
                      pieceWidth={220}
                      showBadge
                      priceLabel={`#${showcaseItem.imageId}`}
                    />
                    <div style={{
                      marginTop: 18,
                      fontSize: "0.78rem",
                      color: "#6b7080",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}>
                      {t("shop:delivery.mockupCaption")}
                    </div>
                  </div>

                  <div style={{
                    flex: "1 1 320px",
                    minWidth: 280,
                    maxWidth: 480,
                  }}>
                    <h2 style={{
                      fontSize: "clamp(1.3rem, 2.6vw, 1.8rem)",
                      fontWeight: 700,
                      lineHeight: 1.15,
                      marginBottom: 18,
                      letterSpacing: "0.01em",
                      color: "#0f1423",
                    }}>
                      {t("shop:delivery.title")}
                    </h2>
                    <ul style={{
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                    }}>
                      {[
                        { icon: "✦", title: t("shop:delivery.unique"), sub: t("shop:delivery.uniqueSub") },
                        { icon: "▦", title: t("shop:delivery.frame"), sub: t("shop:delivery.frameSub") },
                        { icon: "➤", title: t("shop:delivery.shipping"), sub: t("shop:delivery.shippingSub") },
                        { icon: "◔", title: t("shop:delivery.time"), sub: t("shop:delivery.timeSub") },
                      ].map((row, i) => (
                        <li key={i} style={{
                          display: "flex",
                          gap: 14,
                          alignItems: "flex-start",
                        }}>
                          <span style={{
                            flexShrink: 0,
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: "rgba(255, 0, 105, 0.08)",
                            border: "1px solid rgba(255, 0, 105, 0.15)",
                            color: "#ff0069",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.95rem",
                            fontWeight: 700,
                          }}>{row.icon}</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "1rem", lineHeight: 1.25, color: "#0f1423" }}>
                              {row.title}
                            </div>
                            <div style={{ fontSize: "0.85rem", color: "#6b7080", lineHeight: 1.35, marginTop: 2 }}>
                              {row.sub}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Price-tension banner */}
                <div style={{
                  marginTop: 28,
                  padding: "16px 20px",
                  borderRadius: 12,
                  background: "rgba(255, 0, 105, 0.06)",
                  border: "1px solid rgba(255, 0, 105, 0.18)",
                  textAlign: "center",
                }}>
                  <div style={{
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    marginBottom: 4,
                    letterSpacing: "0.02em",
                    color: "#0f1423",
                  }}>
                    {t("shop:delivery.priceTensionHead")}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#0f1423", opacity: 0.85, lineHeight: 1.4 }}>
                    {t("shop:delivery.priceTension")}{" "}
                    <strong style={{ color: "#ff0069" }}>
                      {t("shop:delivery.priceTensionStrong")}
                    </strong>
                    <br />
                    <span style={{ color: "#6b7080", fontSize: "0.8rem" }}>
                      {t("shop:delivery.priceTensionSub")}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Order Summary + Checkout */}
          <div ref={checkoutSectionRef} style={{
            padding: "24px",
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid rgba(15, 20, 35, 0.06)",
            boxShadow: "0 2px 8px rgba(15, 20, 35, 0.04), 0 8px 32px rgba(15, 20, 35, 0.06)",
            marginBottom: "32px",
            boxSizing: "border-box",
            maxWidth: "100%",
            overflow: "hidden",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
                <span style={{ color: "#6b7080" }}>{t("shop:cart.unitPrice")}</span>
                <span style={{ color: "#0f1423" }}>{formatPrice(unitPrice, currency)}</span>
              </div>
              {availableItems.length > 1 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
                  <span style={{ color: "#6b7080" }}>{t("shop:cart.quantity")}</span>
                  <span style={{ color: "#0f1423" }}>&times; {availableItems.length}</span>
                </div>
              )}
              <div style={{
                height: "1px",
                background: "rgba(15, 20, 35, 0.08)",
                margin: "2px 0",
              }} />
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 700,
                fontSize: "clamp(1.2rem, 3vw, 1.5rem)",
                color: "#0f1423",
              }}>
                <span>{t("shop:cart.subtotal")}</span>
                <span>{formatPrice(subtotal, currency)}</span>
              </div>
            </div>

            <div style={{
              fontSize: "0.8rem",
              color: "#9aa0ad",
              marginBottom: "16px",
              textAlign: "center",
            }}>
              {t("shop:cart.shippingNote")}
            </div>

            {checkoutError && (
              <div style={{
                padding: "10px 14px",
                background: "rgba(255, 40, 40, 0.08)",
                border: "1px solid rgba(255, 60, 60, 0.25)",
                borderRadius: "8px",
                marginBottom: "16px",
                fontSize: "0.85rem",
                textAlign: "center",
                color: "#8a1a1a",
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
                color: "#6b7080",
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
            <a href="/legal/impressum">{t("common:footer.impressum")}</a>
            <a href="/legal/privacy">{t("common:footer.privacy")}</a>
            <a href="/legal/terms">{t("common:footer.terms")}</a>
            <a href="/legal/returns">{t("common:footer.returns")}</a>
          </div>
        </div>
      </div>

      {/* Sticky checkout bar */}
      <AnimatePresence>
        {showStickyBar && availableItems.length > 0 && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: "rgba(0, 0, 0, 0.9)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              padding: "12px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 20,
              zIndex: 10000,
              borderTop: "1px solid rgba(255,255,255,0.1)",
              fontFamily: "var(--font-oswald)",
              color: "white",
            }}
          >
            <span style={{ opacity: 0.7, fontSize: "0.95rem" }}>
              {t("shop:cart.itemCount", { count: availableItems.length })}
            </span>
            <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>
              {formatPrice(subtotal, currency)}
            </span>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={checkoutLoading}
              style={{
                padding: "10px 28px",
                borderRadius: 8,
                border: "none",
                background: "rgba(255, 0, 105, 1)",
                color: "white",
                fontSize: "0.95rem",
                fontWeight: 700,
                cursor: checkoutLoading ? "wait" : "pointer",
                fontFamily: "var(--font-oswald)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              {checkoutLoading ? t("shop:checkout.processing") : t("shop:checkout.proceed")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
