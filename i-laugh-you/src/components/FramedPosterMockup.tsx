"use client";

import CartPieceImage from "./CartPieceImage";
import type { FrameColor } from "@/hooks/useCart";

const FRAME_STYLES: Record<FrameColor, { base: string; highlight: string; shadow: string }> = {
  black: { base: "#1a1a1a", highlight: "#2e2e2e", shadow: "#000" },
  white: { base: "#f0f0f0", highlight: "#ffffff", shadow: "#b8b8b8" },
};

interface FramedPosterMockupProps {
  imageId: number;
  frameColor: FrameColor;
  pieceWidth?: number;
  showBadge?: boolean;
  priceLabel?: string | null;
  hangOnWall?: boolean;
}

export default function FramedPosterMockup({
  imageId,
  frameColor,
  pieceWidth = 240,
  showBadge = true,
  priceLabel = null,
  hangOnWall = false,
}: FramedPosterMockupProps) {
  const frame = FRAME_STYLES[frameColor];
  const matPadding = Math.max(22, Math.round(pieceWidth * 0.1));
  const framePadding = Math.max(14, Math.round(pieceWidth * 0.055));
  const scale = Math.min(1, pieceWidth / 220);
  const badgeSize = Math.round(62 * Math.max(0.6, scale));
  const badgeOffset = Math.round(14 * Math.max(0.5, scale));
  const badgeMainFont = `${(1.2 * Math.max(0.65, scale)).toFixed(2)}rem`;
  const badgeSubFont = `${(0.55 * Math.max(0.7, scale)).toFixed(2)}rem`;

  const frameEl = (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        filter:
          "drop-shadow(0 32px 40px rgba(0,0,0,0.45)) drop-shadow(0 10px 14px rgba(0,0,0,0.3))",
      }}
    >
      {/* Outer wooden frame with highlight + shadow gradient */}
      <div
        style={{
          padding: framePadding,
          background: `linear-gradient(135deg, ${frame.highlight} 0%, ${frame.base} 40%, ${frame.base} 60%, ${frame.shadow} 100%)`,
          borderRadius: 2,
          position: "relative",
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.4)`,
        }}
      >
        {/* Inner shadow lip between frame and mat */}
        <div
          style={{
            padding: 3,
            background: frame.shadow,
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)",
          }}
        >
          {/* White mat (passepartout) */}
          <div
            style={{
              padding: matPadding,
              background:
                "linear-gradient(180deg, #fafafa 0%, #ececec 100%)",
              boxShadow: "inset 0 0 14px rgba(0,0,0,0.12)",
              position: "relative",
            }}
          >
            <div
              style={{
                boxShadow:
                  "0 2px 8px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(0,0,0,0.05)",
                lineHeight: 0,
              }}
            >
              <CartPieceImage imageId={imageId} displayWidth={pieceWidth} zoom={10} />
            </div>
          </div>
        </div>

        {/* Glass reflection overlay */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: framePadding + 3,
            pointerEvents: "none",
            background:
              "linear-gradient(105deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 28%, rgba(255,255,255,0) 72%, rgba(255,255,255,0.08) 100%)",
          }}
        />
      </div>

      {/* 1/1 Badge */}
      {showBadge && (
        <div
          style={{
            position: "absolute",
            top: -badgeOffset,
            right: -badgeOffset,
            background: "rgba(255, 0, 105, 1)",
            color: "white",
            borderRadius: "50%",
            width: badgeSize,
            height: badgeSize,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-oswald)",
            boxShadow:
              "0 8px 18px rgba(255, 0, 105, 0.55), 0 0 0 4px rgba(255, 0, 105, 0.18)",
            transform: "rotate(8deg)",
            letterSpacing: "0.05em",
            zIndex: 2,
          }}
        >
          <span style={{ fontSize: badgeMainFont, fontWeight: 800, lineHeight: 1 }}>1/1</span>
          <span style={{ fontSize: badgeSubFont, opacity: 0.9, marginTop: 2, textTransform: "uppercase" }}>
            unique
          </span>
        </div>
      )}

      {/* Price label */}
      {priceLabel && (
        <div
          style={{
            position: "absolute",
            bottom: -16,
            right: -8,
            background: "white",
            color: "#111",
            borderRadius: 4,
            padding: "7px 14px",
            fontSize: "0.9rem",
            fontWeight: 700,
            fontFamily: "var(--font-oswald)",
            boxShadow: "0 6px 14px rgba(0,0,0,0.35)",
            letterSpacing: "0.03em",
            zIndex: 2,
          }}
        >
          {priceLabel}
        </div>
      )}
    </div>
  );

  if (!hangOnWall) return frameEl;

  return (
    <div
      style={{
        position: "relative",
        padding: "50px 40px 60px",
        background:
          "linear-gradient(180deg, #e8ddd0 0%, #d4c4b0 45%, #b8a48a 100%)",
        borderRadius: 14,
        display: "flex",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Faint wall texture */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.25), transparent 55%), radial-gradient(circle at 70% 80%, rgba(0,0,0,0.08), transparent 60%)",
          pointerEvents: "none",
        }}
      />
      {/* Nail / hanging hook */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 22,
          left: "50%",
          transform: "translateX(-50%)",
          width: 6,
          height: 6,
          background: "#3a2e20",
          borderRadius: "50%",
          boxShadow: "0 1px 2px rgba(0,0,0,0.5)",
        }}
      />
      {/* Hanging wire */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 26,
          left: "50%",
          width: 1,
          height: 26,
          background: "linear-gradient(180deg, #3a2e20 0%, rgba(58,46,32,0.3) 100%)",
          transform: "translateX(-50%)",
        }}
      />
      <div style={{ marginTop: 14, position: "relative" }}>{frameEl}</div>
    </div>
  );
}
