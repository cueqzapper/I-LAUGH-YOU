"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import "@/lib/i18n/i18n";
import { useTranslation } from "react-i18next";

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
    <Suspense fallback={<div style={{ minHeight: "100vh", color: "white", padding: "100px 20px", textAlign: "center" }}>Loading...</div>}>
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
        localStorage.removeItem("ily-cart");
      } catch {
        // ignore
      }
    }
  }, [orderData]);

  return (
    <div
      style={{
        minHeight: "100vh",
        color: "white",
        padding: "100px 20px 40px",
        fontFamily: "var(--font-oswald)",
        maxWidth: "700px",
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <div id="background-image" />

      {loading && (
        <p style={{ fontSize: "1.2rem", opacity: 0.7 }}>{t("success.loading")}</p>
      )}

      {error && (
        <div>
          <h1 style={{ fontSize: "2rem", marginBottom: "16px" }}>Oops</h1>
          <p style={{ opacity: 0.7 }}>{error}</p>
          <a
            href="/"
            style={{
              color: "rgba(255, 0, 105, 1)",
              textDecoration: "none",
              display: "inline-block",
              marginTop: "20px",
            }}
          >
            {t("cart.continueShopping")}
          </a>
        </div>
      )}

      {orderData && (
        <div>
          <h1 style={{ fontSize: "2.5rem", color: "rgba(255, 0, 105, 1)", marginBottom: "16px" }}>
            {t("success.title")}
          </h1>
          <p style={{ fontSize: "1.2rem", marginBottom: "30px", opacity: 0.8 }}>
            {t("success.subtitle")}
          </p>

          <div
            style={{
              background: "rgba(255,255,255,0.05)",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "24px",
              textAlign: "left",
              marginBottom: "30px",
            }}
          >
            <h2 style={{ fontSize: "1.1rem", marginBottom: "16px", opacity: 0.6 }}>
              {t("success.orderNumber", { id: orderData.order.id })}
            </h2>

            <div style={{ marginBottom: "16px" }}>
              <strong>{t("success.pieces")}:</strong>
              <ul style={{ listStyle: "none", padding: 0, margin: "8px 0" }}>
                {orderData.items.map((item) => (
                  <li
                    key={item.image_id}
                    style={{
                      padding: "8px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>Piece #{item.image_id}</span>
                    <span style={{ opacity: 0.6, textTransform: "capitalize" }}>
                      {item.frame_color} {t("success.frame")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.2)",
                paddingTop: "12px",
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 700,
                fontSize: "1.2rem",
              }}
            >
              <span>{t("cart.subtotal")}:</span>
              <span>
                {orderData.order.total_amount} {orderData.order.currency}
              </span>
            </div>
          </div>

          <p style={{ opacity: 0.6, marginBottom: "20px", fontSize: "0.95rem" }}>
            {t("success.emailSent")}
          </p>

          <a
            href="/"
            style={{
              display: "inline-block",
              padding: "14px 32px",
              borderRadius: "6px",
              background: "rgba(255, 0, 105, 1)",
              color: "white",
              textDecoration: "none",
              fontSize: "1.1rem",
              fontWeight: 600,
            }}
          >
            {t("success.backToGallery")}
          </a>
        </div>
      )}
    </div>
  );
}
