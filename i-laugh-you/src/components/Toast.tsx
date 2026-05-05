"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import CartPieceImage from "./CartPieceImage";

interface ToastProps {
  imageId: number | null;
  action: "added" | "removed";
  onDismiss: () => void;
}

export default function Toast({ imageId, action, onDismiss }: ToastProps) {
  const { t } = useTranslation("shop");

  useEffect(() => {
    if (imageId === null) return;
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [imageId, onDismiss]);

  return (
    <AnimatePresence>
      {imageId !== null && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 20000,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderRadius: 12,
            border: "1px solid rgba(255, 255, 255, 0.1)",
            padding: 14,
            display: "flex",
            alignItems: "center",
            gap: 14,
            boxShadow: "0 8px 40px rgba(0, 0, 0, 0.4)",
            fontFamily: "var(--font-oswald)",
            color: "white",
            maxWidth: 320,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 6,
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <CartPieceImage imageId={imageId} displayWidth={56} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {action === "added" ? t("toast.added") : t("toast.removed")}
            </span>
            <span style={{ fontSize: 12, opacity: 0.5 }}>
              {t("cart.pieceLabel", { id: imageId })}
            </span>
            {action === "added" && (
              <a
                href="/cart"
                style={{
                  fontSize: 12,
                  color: "rgba(255, 0, 105, 1)",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                {t("toast.viewCart")} &rarr;
              </a>
            )}
          </div>

          <button
            onClick={onDismiss}
            type="button"
            style={{
              position: "absolute",
              top: 6,
              right: 8,
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.4)",
              fontSize: 16,
              cursor: "pointer",
              lineHeight: 1,
              padding: 0,
            }}
          >
            &times;
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
