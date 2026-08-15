"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import Image from "next/image";

interface ProductionSectionProps {
  firstPriceFormatted: string;
  lastPriceFormatted: string;
  totalPiecesCopy: string;
}

export default function ProductionSection({
  firstPriceFormatted,
  lastPriceFormatted,
  totalPiecesCopy,
}: ProductionSectionProps) {
  const { t } = useTranslation(["home"]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 640);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const steps = [
    {
      image: "/img/production/step-1-painted-v6.webp",
      title: t("home:production.step1Title"),
      text: t("home:production.step1Text"),
    },
    {
      image: "/img/production/step-2-divided-v6.webp",
      title: t("home:production.step2Title"),
      text: t("home:production.step2Text", { total: totalPiecesCopy }),
    },
    {
      image: "/img/production/step-3-yours-v6.webp",
      title: t("home:production.step3Title"),
      text: t("home:production.step3Text"),
    },
  ];

  const specs = [
    t("home:production.spec1"),
    t("home:production.spec2"),
    t("home:production.spec3"),
    t("home:production.spec4"),
  ];

  return (
    <div
      className="section"
      id="production-slide"
      style={{
        backgroundColor: "#fafafa",
        color: "#111",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1320,
          margin: "0 auto",
          padding: "clamp(28px, 4.5vh, 56px) clamp(20px, 4vw, 56px)",
          fontFamily: "var(--font-oswald), sans-serif",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(22px, 3vh, 40px)",
        }}
      >
        {/* Header — three-beat title + subline */}
        <motion.div
          style={{ textAlign: "center" }}
          initial={{ opacity: 0, y: -16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2
            style={{
              fontSize: "clamp(2rem, 5.2vw, 4.4rem)",
              fontWeight: 800,
              lineHeight: 0.98,
              letterSpacing: "-0.02em",
              margin: "0 0 14px",
              color: "#111",
              textTransform: "uppercase",
            }}
          >
            {t("home:production.title")}
          </h2>
          <p
            style={{
              fontSize: "clamp(0.95rem, 1.25vw, 1.1rem)",
              color: "#555",
              maxWidth: 760,
              margin: "0 auto",
              lineHeight: 1.45,
              fontWeight: 500,
            }}
          >
            {t("home:production.subline", {
              firstPrice: firstPriceFormatted,
              lastPrice: lastPriceFormatted,
              total: totalPiecesCopy,
            })}
          </p>
        </motion.div>

        {/* 3-step editorial row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: "clamp(18px, 2.5vw, 36px)",
            alignItems: "start",
          }}
        >
          {steps.map((step, i) => (
            <motion.div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "clamp(10px, 1.2vh, 14px)",
                minWidth: 0,
              }}
              initial={{ opacity: 0, y: 32, scale: 0.985 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{
                duration: 0.7,
                delay: 0.1 + i * 0.14,
                ease: [0.16, 1.2, 0.3, 1],
              }}
            >
              {/* Serial + title row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 14,
                  lineHeight: 0.9,
                }}
              >
                <span
                  style={{
                    fontSize: "clamp(2.4rem, 4.8vw, 4rem)",
                    fontWeight: 800,
                    color: "#ff0069",
                    letterSpacing: "-0.04em",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  style={{
                    flex: 1,
                    height: 1,
                    background: "#e0e0e0",
                    alignSelf: "center",
                  }}
                />
                <span
                  style={{
                    fontSize: "clamp(1rem, 1.3vw, 1.2rem)",
                    fontWeight: 800,
                    color: "#111",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {step.title}
                </span>
              </div>

              {/* Image */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "1/1",
                  borderRadius: 14,
                  overflow: "hidden",
                  backgroundColor: "#ececec",
                  boxShadow:
                    "0 20px 40px -18px rgba(0,0,0,0.22), 0 4px 12px -4px rgba(0,0,0,0.06)",
                }}
              >
                <Image
                  src={step.image}
                  alt={step.title}
                  fill
                  sizes={isMobile ? "100vw" : "(max-width: 1320px) 33vw, 420px"}
                  style={{
                    objectFit: "cover",
                  }}
                />
              </div>

              {/* Copy */}
              <p
                style={{
                  fontSize: "clamp(0.92rem, 1.1vw, 1.05rem)",
                  color: "#444",
                  lineHeight: 1.45,
                  margin: 0,
                  fontWeight: 500,
                  letterSpacing: "0.005em",
                }}
              >
                {step.text}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Specs strip + CTA */}
        <motion.div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "clamp(14px, 2vw, 28px)",
            alignItems: "center",
            justifyContent: isMobile ? "center" : "space-between",
            borderTop: "1px solid #ececec",
            paddingTop: "clamp(16px, 2.2vh, 24px)",
          }}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px 10px",
              flex: "1 1 auto",
              minWidth: 0,
              justifyContent: isMobile ? "center" : "flex-start",
            }}
          >
            {specs.map((spec, i) => (
              <span
                key={i}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 13px",
                  borderRadius: 999,
                  background: "#fff",
                  border: "1px solid #e6e6e6",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "#333",
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                  letterSpacing: "0.01em",
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ff0069"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                {spec}
              </span>
            ))}
          </div>

          <motion.a
            href="#fullpage"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            style={{
              display: "inline-block",
              padding: "13px 30px",
              borderRadius: 10,
              background: "#ff0069",
              color: "white",
              textDecoration: "none",
              fontWeight: 800,
              fontSize: "0.98rem",
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              boxShadow: "0 10px 22px rgba(255, 0, 105, 0.32)",
              flex: "0 0 auto",
              whiteSpace: "nowrap",
            }}
            whileHover={{
              y: -2,
              boxShadow: "0 14px 28px rgba(255, 0, 105, 0.42)",
            }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 24 }}
          >
            {t("home:production.cta")}
          </motion.a>
        </motion.div>
      </div>
    </div>
  );
}
