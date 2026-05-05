"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import CartPieceImage from "@/components/CartPieceImage";
import "@/lib/i18n/i18n";
import { useTranslation } from "react-i18next";

type FrameColor = "black" | "white";

const FRAME_BORDER_COLORS: Record<FrameColor, string> = {
  black: "#1a1a1a",
  white: "#f0f0f0",
};

interface OrderData {
  order: {
    id: number;
    buyer_email: string;
    buyer_name: string;
    currency: string;
    unit_price: number;
    total_amount: number;
    item_count: number;
    status: string;
    created_at: string;
  };
  items: {
    image_id: number;
    frame_color: string;
    unit_price: number;
  }[];
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            background: "linear-gradient(180deg, #fafafa 0%, #f4f4f6 100%)",
            color: "#6b7080",
            padding: "100px 20px",
            textAlign: "center",
            fontFamily: "var(--font-oswald)",
            fontSize: "1.2rem",
          }}
        >
          Loading...
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}

function CheckoutSuccessContent() {
  const { t } = useTranslation("shop");
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      setError("No session ID provided.");
      return;
    }

    const loadOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(sessionId)}`);
        if (!res.ok) {
          setError("Order not found.");
          return;
        }
        const data = await res.json();
        setOrderData(data);
      } catch {
        setError("Failed to load order details.");
      } finally {
        setLoading(false);
      }
    };

    void loadOrder();
  }, [sessionId]);

  // Clear cart on successful checkout
  useEffect(() => {
    if (orderData && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("ily-favorites");
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.basket = [];
          localStorage.setItem("ily-favorites", JSON.stringify(parsed));
        }
        localStorage.removeItem("ily-cart-colors");
      } catch {
        // ignore
      }
    }
  }, [orderData]);

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: `
      radial-gradient(ellipse 80% 40% at 50% -5%, rgba(255, 0, 105, 0.10) 0%, transparent 70%),
      linear-gradient(180deg, #fafafa 0%, #f4f4f6 100%)
    `,
    color: "#0f1423",
    padding: "120px 20px 60px",
    fontFamily: "var(--font-oswald)",
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ maxWidth: "700px", margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: "1.2rem", color: "#6b7080" }}>{t("success.loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={{ maxWidth: "700px", margin: "0 auto", textAlign: "center" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 style={{ fontSize: "2rem", marginBottom: "16px", color: "#0f1423" }}>{t("success.errorTitle")}</h1>
            <p style={{ color: "#6b7080" }}>{error}</p>
            <a
              href="/"
              style={{
                color: "#ff0069",
                textDecoration: "none",
                display: "inline-block",
                marginTop: "20px",
                fontSize: "1.1rem",
                fontWeight: 600,
              }}
            >
              {t("cart.continueShopping")}
            </a>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!orderData) return null;

  const { order, items } = orderData;

  return (
    <div style={pageStyle}>
      <style>{`
        #background-image { display: none !important; }
        header { opacity: 1 !important; }
      `}</style>

      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
        {/* Hero section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ textAlign: "center", marginBottom: "48px" }}
        >
          {/* Checkmark circle */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: "spring", stiffness: 200 }}
            style={{
              width: "96px",
              height: "96px",
              borderRadius: "50%",
              background: "radial-gradient(circle, #ff0069 0%, #ff0069 55%, transparent 75%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 28px",
              boxShadow: "0 0 60px rgba(255, 0, 105, 0.45), 0 0 120px rgba(255, 0, 105, 0.18)",
            }}
          >
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </motion.div>

          <h1
            style={{
              fontSize: "clamp(2.5rem, 6vw, 4rem)",
              color: "#ff0069",
              marginBottom: "12px",
              fontWeight: 800,
              letterSpacing: "-0.01em",
              lineHeight: 1.05,
            }}
          >
            {t("success.title")}
          </h1>
          <p style={{ fontSize: "clamp(1rem, 2.5vw, 1.3rem)", color: "#6b7080", marginBottom: "20px" }}>
            {t("success.subtitle")}
          </p>

          {/* Order number badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            style={{
              display: "inline-block",
              background: "rgba(255, 0, 105, 0.08)",
              border: "1px solid rgba(255, 0, 105, 0.25)",
              color: "#ff0069",
              borderRadius: "24px",
              padding: "8px 20px",
              fontSize: "0.95rem",
              fontWeight: 600,
              letterSpacing: "0.05em",
            }}
          >
            {t("success.orderNumber", { id: order.id })}
          </motion.div>
        </motion.div>

        {/* Purchased pieces gallery */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={{ marginBottom: "40px" }}
        >
          <h2
            style={{
              fontSize: "clamp(1.2rem, 3vw, 1.6rem)",
              textAlign: "center",
              marginBottom: "0",
              fontWeight: 700,
              color: "#0f1423",
              letterSpacing: "0.03em",
              textTransform: "uppercase",
            }}
          >
            {t("success.pieces")}
          </h2>
          <div style={{ width: 48, height: 3, background: "#ff0069", borderRadius: 2, margin: "8px auto 28px" }} />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: items.length === 1 ? "1fr" : "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "24px",
              justifyItems: "center",
            }}
          >
            {items.map((item, index) => {
              const frameColor = (item.frame_color as FrameColor) || "black";
              const borderColor = FRAME_BORDER_COLORS[frameColor] || FRAME_BORDER_COLORS.black;

              return (
                <motion.div
                  key={item.image_id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.15, duration: 0.5, ease: "easeOut" }}
                  style={{
                    background: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid rgba(15, 20, 35, 0.06)",
                    boxShadow: "0 2px 8px rgba(15, 20, 35, 0.04), 0 8px 32px rgba(15, 20, 35, 0.06)",
                    padding: "20px",
                    width: "100%",
                    maxWidth: "340px",
                  }}
                >
                  {/* Frame border around image */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: borderColor,
                        padding: "12px",
                        borderRadius: "8px",
                        boxShadow: "0 8px 30px rgba(15, 20, 35, 0.18)",
                        display: "inline-block",
                        lineHeight: 0,
                      }}
                    >
                      <CartPieceImage imageId={item.image_id} displayWidth={280} />
                    </div>
                  </div>

                  {/* Piece info */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f1423" }}>
                      {t("cart.pieceLabel", { id: item.image_id })}
                    </span>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "5px 12px",
                        borderRadius: "999px",
                        background: "rgba(255, 0, 105, 0.08)",
                        border: "1px solid rgba(255, 0, 105, 0.18)",
                      }}
                    >
                      <div
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: borderColor,
                          border: "1px solid rgba(15, 20, 35, 0.15)",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "#ff0069",
                        }}
                      >
                        {frameColor === "white" ? t("success.framedInWhite") : t("success.framedInBlack")}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Order summary card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid rgba(15, 20, 35, 0.06)",
            boxShadow: "0 2px 8px rgba(15, 20, 35, 0.04), 0 8px 32px rgba(15, 20, 35, 0.06)",
            padding: "28px",
            maxWidth: "500px",
            margin: "0 auto 40px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "12px",
              fontSize: "0.95rem",
              color: "#6b7080",
            }}
          >
            <span>
              {t("success.itemBreakdown", {
                count: order.item_count,
                price: order.unit_price,
                currency: order.currency,
              })}
            </span>
          </div>

          <div
            style={{
              height: "1px",
              background: "rgba(15, 20, 35, 0.08)",
              margin: "14px 0",
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: "1.15rem", color: "#0f1423", letterSpacing: "0.02em" }}>
              {t("cart.subtotal")}
            </span>
            <span style={{ fontWeight: 800, fontSize: "1.6rem", color: "#ff0069", letterSpacing: "-0.01em" }}>
              {order.total_amount} {order.currency}
            </span>
          </div>

          <div
            style={{
              height: "1px",
              background: "rgba(15, 20, 35, 0.08)",
              margin: "18px 0 14px",
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "#6b7080",
              fontSize: "0.9rem",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff0069" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <span>
              {order.buyer_email
                ? t("success.emailSentTo", { email: order.buyer_email })
                : t("success.emailSent")}
            </span>
          </div>
        </motion.div>

        {/* CTA button */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          style={{ textAlign: "center" }}
        >
          <a
            href="/"
            style={{
              display: "inline-block",
              padding: "16px 40px",
              borderRadius: "8px",
              background: "rgba(255, 0, 105, 1)",
              color: "white",
              textDecoration: "none",
              fontSize: "1.15rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              boxShadow: "0 4px 20px rgba(255, 0, 105, 0.3)",
              transition: "transform 0.25s ease, box-shadow 0.25s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 30px rgba(255, 0, 105, 0.5), 0 0 60px rgba(255, 0, 105, 0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 20px rgba(255, 0, 105, 0.3)";
            }}
          >
            {t("success.backToGallery")}
          </a>
          <p
            style={{
              marginTop: "18px",
              fontSize: "0.95rem",
              color: "#6b7080",
              fontStyle: "italic",
              letterSpacing: "0.01em",
            }}
          >
            {t("success.artHistoryTagline")}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
