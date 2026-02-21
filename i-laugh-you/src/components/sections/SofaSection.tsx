"use client";

import { useState, useCallback, useRef, useLayoutEffect } from "react";
import { useTranslation, Trans } from "react-i18next";
import PieceThumbnail from "@/components/PieceThumbnail";
import type { Rgb } from "@/lib/tile-utils";
import type { SofaPlacements } from "@/hooks/useFavorites";
import "./SofaSection.css";

const THUMB_ZOOM = 9;
const THUMB_WIDTH = 60;
const THUMB_HEIGHT = 80;
const SOFA_THUMB_WIDTH = 180;
const SOFA_THUMB_HEIGHT = 240;

const SOFA_COLORS = [
  "#f9f827",
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#9b59b6",
  "#e67e22",
  "#34495e",
] as const;

/* ── Layout engine ─────────────────────────────────── */

const SOFA_ASPECT = 1800 / 684;

interface SofaLayout {
  horizonY: number;
  sofaW: number;
  sofaH: number;
  sofaTop: number;
  sofaLeft: number;
  imgW: number;
  imgH: number;
  gap: number;
  paintingsLeft: number;
  paintingsTop: number;
  swatchesTop: number;
  frameW: number;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function computeLayout(W: number, H: number, barH: number): SofaLayout {
  /* Horizon — wall/floor junction (higher on mobile so floor is larger) */
  const ar = W / H;
  const horizonY = H * (ar < 0.8 ? 0.70 : 0.77);

  /* Sofa width — fills more on narrow/portrait, less on ultra-wide */
  let pct =
    ar < 0.8
      ? 1.3
      : ar < 1.2
        ? lerp(0.92, 0.72, (ar - 0.8) / 0.4)
        : ar < 2.0
          ? lerp(0.72, 0.52, (ar - 1.2) / 0.8)
          : lerp(0.52, 0.40, (ar - 2.0) / 1.5);
  pct = Math.max(0.38, Math.min(1.3, pct));

  const sofaW = W * pct;
  const sofaH = sofaW / SOFA_ASPECT;
  /* Sofa sits on floor — feet land at the horizon line.
     Overlay image: solid content ends at ~83% of height (row 315/380),
     anti-aliased edge fades to ~85%. Using 0.83 places the solid foot
     bottom exactly on the horizon with AA pixels slightly below. */
  const sofaTop = horizonY - sofaH * 0.70;
  const sofaLeft = (W - sofaW) / 2;

  /* Paintings — fill wall space between love-bar and sofa */
  const wallTop = barH + 8;
  const gapFromSofa = Math.max(6, H * 0.012);
  const availH = Math.max(40, sofaTop - wallTop - gapFromSofa);

  const gap = Math.max(4, sofaW * 0.022);
  const span = sofaW * 0.8;
  let imgW = (span - 2 * gap) / 3;
  let imgH = imgW * (4 / 3);

  /* Constrain if paintings would be taller than available wall space
     or taller than 55% of sofa height (keep proportional to sofa) */
  const paintingCap = ar < 0.8 ? 0.75 : 0.55;
  const maxH = Math.min(availH * 0.92, sofaH * paintingCap);
  if (imgH > maxH) {
    imgH = maxH;
    imgW = imgH * 0.75;
  }
  imgW = Math.max(40, imgW);
  imgH = Math.max(53, imgH);

  const totalW = imgW * 3 + gap * 2;
  const paintingsLeft = (W - totalW) / 2;
  const paintingsTop = sofaTop - gapFromSofa - imgH;

  /* Frame border scales with image size */
  const frameW = Math.max(3, Math.min(9, imgW * 0.045));

  /* Color swatches sit in the floor area */
  const swatchesTop = horizonY + (H - horizonY) * 0.6;

  return {
    horizonY,
    sofaW,
    sofaH,
    sofaTop,
    sofaLeft,
    imgW,
    imgH,
    gap,
    paintingsLeft,
    paintingsTop,
    swatchesTop,
    frameW,
  };
}

/* ── Component ─────────────────────────────────────── */

interface SofaSectionProps {
  likedIds: Set<number>;
  sofaPlacements: SofaPlacements;
  onSofaPlacement: (slot: number, imageId: number | null) => void;
  palettesByImageId: Map<number, Rgb[]>;
}

export default function SofaSection({
  likedIds,
  sofaPlacements,
  onSofaPlacement,
  palettesByImageId,
}: SofaSectionProps) {
  const { t } = useTranslation("home");
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [sofaColor, setSofaColor] = useState<string>(SOFA_COLORS[0]);
  const [layout, setLayout] = useState<SofaLayout | null>(null);

  const sceneRef = useRef<HTMLDivElement>(null);
  const loveBarRef = useRef<HTMLDivElement>(null);

  /* Responsive layout — recomputes on every resize */
  useLayoutEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const update = () => {
      const W = scene.clientWidth;
      const H = scene.clientHeight;
      if (W === 0 || H === 0) return;
      const barH = loveBarRef.current?.offsetHeight ?? 80;
      const l = computeLayout(W, H, barH);
      setLayout(l);
      scene.style.setProperty("--horizon", `${l.horizonY}px`);
      scene.style.setProperty("--frame-w", `${l.frameW}px`);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(scene);
    return () => ro.disconnect();
  }, []);

  const placedIds = new Set(
    sofaPlacements.filter((id): id is number => id !== null)
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, imageId: number) => {
      e.dataTransfer.setData("text/plain", String(imageId));
      e.dataTransfer.effectAllowed = "move";
      setDraggingId(imageId);
    },
    []
  );

  const handleDragEnd = useCallback(() => setDraggingId(null), []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDragEnter = useCallback((_e: React.DragEvent, slot: number) => {
    setDragOverSlot(slot);
  }, []);

  const handleDragLeave = useCallback(
    (e: React.DragEvent, slot: number) => {
      const related = e.relatedTarget as Node | null;
      const current = e.currentTarget as Node;
      if (related && current.contains(related)) return;
      if (dragOverSlot === slot) setDragOverSlot(null);
    },
    [dragOverSlot]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, slot: number) => {
      e.preventDefault();
      setDragOverSlot(null);
      const imageId = Number(e.dataTransfer.getData("text/plain"));
      if (!Number.isFinite(imageId) || imageId < 1) return;
      onSofaPlacement(slot, imageId);
    },
    [onSofaPlacement]
  );

  const handleSlotClick = useCallback(
    (slot: number) => {
      if (sofaPlacements[slot] !== null) onSofaPlacement(slot, null);
    },
    [sofaPlacements, onSofaPlacement]
  );

  const likedArray = Array.from(likedIds);

  return (
    <div className="section" id="sofa-wrapper">
      <div id="sofa-scene" ref={sceneRef}>
        {/* Wall background */}
        <div id="sofa-wall" />

        {/* Floor */}
        <div id="sofa-floor">
          <img src="/img/sofa/floor.webp" alt="" />
        </div>

        {/* Edge contour shadow */}
        <div id="sofa-edge-contour" />

        {/* Gradient overlay */}
        <div id="sofa-gradient-overlay" />

        <div id="loveBarWrapper" ref={loveBarRef}>
          <div id="loveBar">
            {likedArray.length === 0 ? (
              <p>
                <Trans
                  i18nKey="sofa.text"
                  ns="home"
                  components={{
                    heartIcon: <span className="icon icon-heart-love" />,
                  }}
                />
              </p>
            ) : (
              <div id="loveBar-thumbnails">
                {likedArray.map((imageId) => (
                  <div
                    key={imageId}
                    className={`lovebar-thumb${
                      placedIds.has(imageId) ? " placed" : ""
                    }${draggingId === imageId ? " dragging" : ""}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, imageId)}
                    onDragEnd={handleDragEnd}
                  >
                    <PieceThumbnail
                      imageId={imageId}
                      zoom={THUMB_ZOOM}
                      width={THUMB_WIDTH}
                      height={THUMB_HEIGHT}
                      palettesByImageId={palettesByImageId}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Paintings — JS-positioned */}
        {layout && (
          <div
            id="sofaImages"
            style={{
              left: layout.paintingsLeft,
              top: layout.paintingsTop,
              gap: layout.gap,
            }}
          >
            {sofaPlacements.map((placedId, slot) => (
              <div
                key={slot}
                className={`sofaImage${
                  placedId !== null ? " imagePlaced" : ""
                }${dragOverSlot === slot ? " ui-state-hover" : ""}`}
                style={{ width: layout.imgW, height: layout.imgH }}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, slot)}
                onDragLeave={(e) => handleDragLeave(e, slot)}
                onDrop={(e) => handleDrop(e, slot)}
                onClick={() => handleSlotClick(slot)}
              >
                {placedId !== null && (
                  <PieceThumbnail
                    imageId={placedId}
                    zoom={THUMB_ZOOM}
                    width={SOFA_THUMB_WIDTH}
                    height={SOFA_THUMB_HEIGHT}
                    palettesByImageId={palettesByImageId}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Sofa — JS-positioned */}
        {layout && (
          <div
            id="sofaWrapper"
            style={{
              left: layout.sofaLeft,
              top: layout.sofaTop,
              width: layout.sofaW,
              height: layout.sofaH,
            }}
          >
            <svg className="sofa-svg" version="1.0" viewBox="0 0 2400 912">
              <g>
                <path
                  id="sofaBackground"
                  style={{ fill: sofaColor, transition: "fill 0.3s ease" }}
                  d="M483.68,262c3.51,0.35,4.02-1.17,4.14-3.81c1.48-34.24,3.8-68.43,6.08-102.62c0.66-9.42,1.98-18.82,3.4-28.16
                  c0.94-6.2,4.91-9.61,11.34-9.89c169.92-6.81,340.2-2,510.26-3.91c50.78,0.21,101.74-0.65,152.41,2.36
                  c15.74,1.16,31.06-1.38,46.6-1.34c32.15-0.33,64.3-1.19,96.46-0.96c178.15,0.24,356.31-0.88,534.45,2.13
                  c10.07,0.15,20.12,2.36,30.14,3.91c5.58,0.86,8.12,5.18,8.91,10.2c6.92,42.56,6.99,85.88,10.3,128.81
                  c0.21,3.43,1.38,4.76,4.99,4.13c47-7.7,94.49,2.75,140.69,10.92c12.91,2.73,25.39,7.84,37.76,12.64
                  c8.76,3.4,11.81,11.19,10.78,20.02c-3.51,28.87-8.14,57.62-12.46,86.38c-7.5,49.61-14.21,99.51-24.95,148.52
                  c-8.3,37.21-36.35,65.84-75.65,67.96c-518.01,3.54-1036.19,0.16-1554.26,1.11c-15.81-0.01-31.81-0.62-46.94-7.21
                  c-22.49-9.78-38.9-25.29-46.01-48.92c-9.73-34.91-13.84-71.23-19.48-106.99c-6.47-45.79-14.08-91.45-19.3-137.4
                  c-1.89-16.06,2.53-23.82,18.34-29.06c42.82-14.15,88.09-20.77,133.15-21C444.84,259.5,470.77,260.71,483.68,262z"
                />
              </g>
            </svg>

            {/* Sofa overlays */}
            <img
              src="/img/sofa/transparencySmall4.webp"
              className="sofa-overlay sofa-overlay-multiply"
              alt=""
            />
            <img
              src="/img/sofa/transparencySmall4.webp"
              className="sofa-overlay sofa-overlay-hardlight"
              alt=""
            />
            <img
              src="/img/sofa/cat.webp"
              className="sofa-cat"
              alt={t("sofa.catAlt")}
            />
          </div>
        )}

        {/* Color swatches — JS-positioned */}
        {layout && (
          <div
            id="sofaColorSwatches"
            style={{ top: layout.swatchesTop, left: "50%" }}
          >
            {SOFA_COLORS.map((color) => (
              <button
                key={color}
                className={`sofa-swatch${sofaColor === color ? " active" : ""}`}
                style={{ backgroundColor: color }}
                onClick={() => setSofaColor(color)}
                aria-label={`Change sofa color to ${color}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
