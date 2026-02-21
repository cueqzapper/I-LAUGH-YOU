"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import Image from "next/image";
import fitty from "fitty";
import { useTranslation, Trans } from "react-i18next";
import "@/lib/i18n/i18n";
import HeaderNav from "@/components/sections/HeaderNav";
import MobileScrollNav from "@/components/sections/MobileScrollNav";
import SofaSection from "@/components/sections/SofaSection";
import { useFavorites } from "@/hooks/useFavorites";
import {
  LEGACY_TILE_COLUMNS,
  PIECE_COLUMNS,
  PIECE_ROWS,
  TOTAL_PIECES,
} from "@/lib/piece-config";
import { priceAt, formatPrice } from "@/lib/pricing";
import { useCurrency } from "@/hooks/useCurrency";
import {
  type Rgb,
  type PreviewTile,
  TILE_COUNT,
  TILE_DIMENSION,
  DEFAULT_PALETTE,
  clampImageId,
  buildPreviewTile,
} from "@/lib/tile-utils";

const DeepZoomViewer = dynamic(
  () => import("@/components/sections/DeepZoomViewer"),
  { ssr: false }
);

const ParticleScene = dynamic(
  () => import("@/components/three/ParticleScene"),
  { ssr: false }
);

const PriceCurveChart = dynamic(
  () => import("@/components/sections/PriceCurveChart"),
  { ssr: false }
);

type Lab = [number, number, number];
type LegacyColorsMap = Record<string, Rgb[]>;

interface LegacyLabColor {
  L: number;
  A: number;
  B: number;
}

interface ColorReference {
  id: number;
  palette: Rgb[];
  referenceLab: LegacyLabColor;
}

interface SoldPiecesResponse {
  soldCount?: number;
}

const TILE_COLUMNS = PIECE_COLUMNS;
const LEGACY_TILE_COUNT = LEGACY_TILE_COLUMNS * (PIECE_ROWS / 2);
const TOTAL_PIECES_COPY = "24.236";

const MONOCHROME_PREVIEW_ZOOM = 8;
const GET_BY_ID_PREVIEW_ZOOM = 10;

function randomHexColor(): string {
  return Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0");
}

function normalizeRgbChannel(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(255, Math.max(0, Math.round(value)));
}

function hexToRgb(hex: string): Rgb {
  const cleaned = hex.trim().replace("#", "");
  const expanded =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : cleaned.padStart(6, "0").slice(0, 6);

  const value = Number.parseInt(expanded, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function srgbToLinear(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function rgbToLab([r, g, b]: Rgb): Lab {
  const rLinear = srgbToLinear(r);
  const gLinear = srgbToLinear(g);
  const bLinear = srgbToLinear(b);

  const x = (rLinear * 0.4124 + gLinear * 0.3576 + bLinear * 0.1805) * 100;
  const y = (rLinear * 0.2126 + gLinear * 0.7152 + bLinear * 0.0722) * 100;
  const z = (rLinear * 0.0193 + gLinear * 0.1192 + bLinear * 0.9505) * 100;

  const xr = x / 95.047;
  const yr = y / 100;
  const zr = z / 108.883;

  const transform = (value: number): number =>
    value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;

  const fx = transform(xr);
  const fy = transform(yr);
  const fz = transform(zr);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function toLegacyLabColor([l, a, b]: Lab): LegacyLabColor {
  return {
    L: Math.floor(l),
    A: Math.floor(a),
    B: Math.floor(b),
  };
}

function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function getHuePrime(b: number, aPrime: number): number {
  if (b === 0 && aPrime === 0) {
    return 0;
  }

  const hueAngle = radiansToDegrees(Math.atan2(b, aPrime));
  return hueAngle >= 0 ? hueAngle : hueAngle + 360;
}

function getDeltaE00(lab1: LegacyLabColor, lab2: LegacyLabColor): number {
  const c1 = Math.sqrt(lab1.A ** 2 + lab1.B ** 2);
  const c2 = Math.sqrt(lab2.A ** 2 + lab2.B ** 2);
  const cBar = (c1 + c2) / 2;

  const cBarPow7 = cBar ** 7;
  const g = 0.5 *
    (1 - Math.sqrt(cBarPow7 / (cBarPow7 + 25 ** 7 || Number.EPSILON)));

  const aPrime1 = lab1.A * (1 + g);
  const aPrime2 = lab2.A * (1 + g);

  const cPrime1 = Math.sqrt(aPrime1 ** 2 + lab1.B ** 2);
  const cPrime2 = Math.sqrt(aPrime2 ** 2 + lab2.B ** 2);
  const cBarPrime = (cPrime1 + cPrime2) / 2;

  const hPrime1 = getHuePrime(lab1.B, aPrime1);
  const hPrime2 = getHuePrime(lab2.B, aPrime2);

  const deltaLPrime = lab2.L - lab1.L;
  const deltaCPrime = cPrime2 - cPrime1;

  let deltahPrime = 0;
  if (c1 !== 0 && c2 !== 0) {
    const hPrimeDiff = hPrime2 - hPrime1;
    if (Math.abs(hPrimeDiff) <= 180) {
      deltahPrime = hPrimeDiff;
    } else if (hPrime2 <= hPrime1) {
      deltahPrime = hPrimeDiff + 360;
    } else {
      deltahPrime = hPrimeDiff - 360;
    }
  }

  const deltaHPrime =
    2 *
    Math.sqrt(cPrime1 * cPrime2) *
    Math.sin(degreesToRadians(deltahPrime) / 2);

  const lBar = (lab1.L + lab2.L) / 2;

  let hBarPrime = (hPrime1 + hPrime2) / 2;
  if (Math.abs(hPrime1 - hPrime2) > 180) {
    hBarPrime = (hPrime1 + hPrime2 + 360) / 2;
  }

  const t =
    1 -
    0.17 * Math.cos(degreesToRadians(hBarPrime - 30)) +
    0.24 * Math.cos(degreesToRadians(2 * hBarPrime)) +
    0.32 * Math.cos(degreesToRadians(3 * hBarPrime + 6)) -
    0.2 * Math.cos(degreesToRadians(4 * hBarPrime - 63));

  const sL = 1 + (0.015 * (lBar - 50) ** 2) / Math.sqrt(20 + (lBar - 50) ** 2);
  const sC = 1 + 0.045 * cBarPrime;
  const sH = 1 + 0.015 * cBarPrime * t;

  const rC = Math.sqrt(cBarPrime ** 7 / (cBarPrime ** 7 + 25 ** 7 || Number.EPSILON));
  const rT =
    -2 *
    rC *
    Math.sin(
      degreesToRadians(
        60 * Math.exp(-(((hBarPrime - 275) / 25) ** 2))
      )
    );

  const lightness = deltaLPrime / sL;
  const chroma = deltaCPrime / sC;
  const hue = deltaHPrime / sH;

  return Math.sqrt(
    lightness ** 2 +
      chroma ** 2 +
      hue ** 2 +
      rT * chroma * hue
  );
}

function buildColorReferences(colorsMap: LegacyColorsMap): ColorReference[] {
  const sourceIds = Object.keys(colorsMap)
    .map((key) => Number.parseInt(key, 10))
    .filter((id) => Number.isFinite(id) && id >= 1)
    .sort((a, b) => a - b);

  const isLegacyPaletteMap =
    sourceIds.length > 0 && sourceIds.every((id) => id <= LEGACY_TILE_COUNT);

  const references: ColorReference[] = [];

  sourceIds.forEach((sourceId) => {
    const rawPalette = colorsMap[String(sourceId)] ?? [];
    const palette = rawPalette
      .slice(0, 7)
      .map(
        ([r, g, b]): Rgb => [
          normalizeRgbChannel(r),
          normalizeRgbChannel(g),
          normalizeRgbChannel(b),
        ]
      );

    while (palette.length < 7) {
      palette.push(palette[palette.length - 1] ?? DEFAULT_PALETTE[0]);
    }

    const referenceColor = palette[6] ?? palette[0] ?? DEFAULT_PALETTE[0];

    if (isLegacyPaletteMap) {
      const legacyZeroBasedId = sourceId - 1;
      const legacyRow = Math.floor(legacyZeroBasedId / LEGACY_TILE_COLUMNS);
      const legacyColumn = legacyZeroBasedId % LEGACY_TILE_COLUMNS;

      const mappedRow = legacyRow * 2;
      const mappedColumn = legacyColumn * 2;
      const expandedIds = [
        mappedRow * TILE_COLUMNS + mappedColumn + 1,
        mappedRow * TILE_COLUMNS + mappedColumn + 2,
        (mappedRow + 1) * TILE_COLUMNS + mappedColumn + 1,
        (mappedRow + 1) * TILE_COLUMNS + mappedColumn + 2,
      ];

      expandedIds.forEach((expandedId) => {
        if (expandedId >= 1 && expandedId <= TILE_COUNT) {
          references.push({
            id: expandedId,
            palette,
            referenceLab: toLegacyLabColor(rgbToLab(referenceColor)),
          });
        }
      });

      return;
    }

    if (sourceId < 1 || sourceId > TILE_COUNT) {
      return;
    }

    references.push({
      id: sourceId,
      palette,
      referenceLab: toLegacyLabColor(rgbToLab(referenceColor)),
    });
  });

  return references.sort((a, b) => a.id - b.id);
}

function getClosestImagesArr(
  colorReferences: ColorReference[],
  hexColor: string,
  howManyImages: number
): number[] {
  if (colorReferences.length === 0 || howManyImages < 1) {
    return [];
  }

  const targetLab = toLegacyLabColor(rgbToLab(hexToRgb(hexColor)));

  let smallestDistance = 100;
  const smallestDistanceArr = Array.from({ length: howManyImages }, () => 100);
  const bestImageArr = Array.from({ length: howManyImages }, () => 99999);

  colorReferences.forEach((reference) => {
    const distance = getDeltaE00(targetLab, reference.referenceLab);

    const biggestInArr = Math.max(...smallestDistanceArr);
    const indexOfBiggestInArr = smallestDistanceArr.indexOf(biggestInArr);

    if (distance < smallestDistance) {
      smallestDistanceArr[indexOfBiggestInArr] = distance;
      bestImageArr[indexOfBiggestInArr] = reference.id;
      smallestDistance = distance;
    }
  });

  return bestImageArr
    .filter((imageId) => imageId !== 99999)
    .map((imageId) => clampImageId(imageId));
}

export default function Home() {
  const { t, i18n } = useTranslation(["home", "common"]);
  const { likedIds, basketIds, toggleLike, toggleBasket, sofaPlacements, setSofaPlacement } = useFavorites();
  const { currency } = useCurrency();
  const scrollRef = useRef(0);
  const [particlesVisible, setParticlesVisible] = useState(true);
  const [osdVisible, setOsdVisible] = useState(false);
  const [titleAnimated, setTitleAnimated] = useState(false);
  const uspAnimatedRef = useRef<Record<number, boolean>>({});
  const [currentYear] = useState(new Date().getFullYear());
  const [pickerHex, setPickerHex] = useState("f9f827");
  const [helpTextFaded, setHelpTextFaded] = useState(false);
  const [legacyColors, setLegacyColors] = useState<LegacyColorsMap | null>(null);
  const [monochromeImageIds, setMonochromeImageIds] = useState<number[]>([]);
  const [getByIdInput, setGetByIdInput] = useState("567");
  const [previewImageId, setPreviewImageId] = useState<number | null>(null);
  const [soldPieceCount, setSoldPieceCount] = useState<number | null>(null);
  const [appReady, setAppReady] = useState(false);
  const [highestBidAmount, setHighestBidAmount] = useState<number | null>(null);
  const [bidFormState, setBidFormState] = useState<{
    name: string;
    email: string;
    amount: string;
    message: string;
    submitting: boolean;
    success: boolean;
    error: string | null;
  }>({
    name: "",
    email: "",
    amount: "",
    message: "",
    submitting: false,
    success: false,
    error: null,
  });

  const fullpageRef = useRef<HTMLDivElement>(null);
  const currentSectionRef = useRef(0);
  const isSnapping = useRef(false);
  const osdViewerRef = useRef<import("openseadragon").Viewer | null>(null);
  const osdZoneRef = useRef(false);
  const nativeColorInputRef = useRef<HTMLInputElement>(null);

  const currentPricePlot = formatPrice(priceAt(soldPieceCount ?? 0), currency);
  const firstPriceFormatted = formatPrice(77, currency);
  const lastPriceFormatted = formatPrice(777, currency);

  const colorReferences = useMemo(() => {
    if (!legacyColors) {
      return [];
    }

    return buildColorReferences(legacyColors);
  }, [legacyColors]);

  const palettesByImageId = useMemo(() => {
    const palettes = new Map<number, Rgb[]>();
    colorReferences.forEach((reference) => {
      palettes.set(reference.id, reference.palette);
    });
    return palettes;
  }, [colorReferences]);

  const monochromePreviewTiles = useMemo(() => {
    if (monochromeImageIds.length === 0) {
      return [];
    }

    return monochromeImageIds.map((imageId) =>
      buildPreviewTile(imageId, palettesByImageId, MONOCHROME_PREVIEW_ZOOM)
    );
  }, [monochromeImageIds, palettesByImageId]);

  const getByIdImageNumber = useMemo(() => {
    const parsed = Number.parseInt(getByIdInput, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      return null;
    }

    return clampImageId(parsed);
  }, [getByIdInput]);

  const overlayPreviewTile = useMemo(() => {
    if (previewImageId === null) {
      return null;
    }

    return buildPreviewTile(
      previewImageId,
      palettesByImageId,
      GET_BY_ID_PREVIEW_ZOOM
    );
  }, [previewImageId, palettesByImageId]);

  const overlayScale = useMemo(() => {
    if (!overlayPreviewTile || typeof window === "undefined") {
      return 1;
    }

    const tileWidth = overlayPreviewTile.width;
    const tileHeight = overlayPreviewTile.height;
    const viewportWidth = window.innerWidth * 0.9;
    const viewportHeight = window.innerHeight * 0.75;

    const widthRatio = viewportWidth / tileWidth;
    const heightRatio = viewportHeight / tileHeight;

    return Math.min(widthRatio, heightRatio, 1);
  }, [overlayPreviewTile]);

  const openPreviewOverlay = useCallback((imageId: number) => {
    setPreviewImageId(imageId);
    document.body.style.overflow = "hidden";
  }, []);

  const closePreviewOverlay = useCallback(() => {
    setPreviewImageId(null);
    document.body.style.overflow = "";
  }, []);

  const handleTileClick = useCallback((imageId: number) => {
    setGetByIdInput(String(imageId));
    openPreviewOverlay(imageId);
  }, [openPreviewOverlay]);

  const navigatePreview = useCallback((direction: "left" | "right" | "up" | "down") => {
    if (previewImageId === null) return;
    
    let newId = previewImageId;
    switch (direction) {
      case "right":
        newId = previewImageId + 1;
        break;
      case "left":
        newId = previewImageId - 1;
        break;
      case "down":
        newId = previewImageId + TILE_COLUMNS;
        break;
      case "up":
        newId = previewImageId - TILE_COLUMNS;
        break;
    }
    
    if (newId > 0 && newId <= TILE_COUNT) {
      setPreviewImageId(newId);
    }
  }, [previewImageId]);

  const renderPreviewTile = useCallback((tile: PreviewTile) => {
    return (
      <div
        className="tile"
        key={tile.id}
        data-imagenmbr={tile.id}
        onClick={() => handleTileClick(tile.id)}
        style={{ cursor: "pointer" }}
      >
        <div
          className="imgWrapper"
          style={{
            position: "relative",
            overflow: "hidden",
            width: `${tile.width}px`,
            height: `${tile.height}px`,
          }}
        >
          {tile.layers.map((layer, layerIndex) => (
            <div
              className="imgWrapperOffset"
              key={`${tile.id}-layer-${layerIndex}`}
              style={{
                position: "absolute",
                left: `-${layer.left}px`,
                top: `-${layer.top}px`,
              }}
            >
              {layer.rows.map((row, rowIndex) => (
                <div
                  className="imgRow"
                  key={`${tile.id}-layer-${layerIndex}-row-${rowIndex}`}
                  style={{
                    height: `${TILE_DIMENSION}px`,
                    width: `${row.width}px`,
                  }}
                >
                  {row.images.map((src, imageIndex) => (
                    <img
                      key={`${tile.id}-layer-${layerIndex}-row-${rowIndex}-img-${imageIndex}`}
                      src={src}
                      height={TILE_DIMENSION}
                      width={TILE_DIMENSION}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="infos">
          {tile.palette.map((rgb, index) => (
            <div
              key={`${tile.id}-${index}`}
              className="colorPalette"
              style={{
                left: `${index * 20}px`,
                backgroundColor: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
              }}
            />
          ))}
          <div className="imageId">
            <span className="id">ID</span>
            {tile.id}
          </div>
        </div>
        <div
          className={`heart ${likedIds.has(tile.id) ? "on" : "off"}`}
          onClick={(e) => { e.stopPropagation(); toggleLike(tile.id); }}
        >
          <div className="heartimgwrapper" data-imagenmbr={tile.id}>
            <img
              className="heart-image heart-off-image"
              src="/img/heart-off.png"
              height="100%"
              width="100%"
              alt=""
            />
            <img
              className="heart-image heart-on-image"
              src="/img/heart-on.png"
              height="100%"
              width="100%"
              alt=""
            />
          </div>
        </div>
        <div
          className={`basket ${basketIds.has(tile.id) ? "on" : "off"}`}
          onClick={(e) => { e.stopPropagation(); toggleBasket(tile.id); }}
        >
          <div className="basketimgwrapper" data-imagenmbr={tile.id}>
            <img
              className="basket-image basket-off-image"
              src="/img/basket-off.png"
              height="100%"
              width="100%"
              alt=""
            />
            <img
              className="basket-image basket-on-image"
              src="/img/basket-on.png"
              height="100%"
              width="100%"
              alt=""
            />
          </div>
        </div>
      </div>
    );
  }, [handleTileClick, likedIds, basketIds, toggleLike, toggleBasket]);

  const applyOsdZoneVisibility = useCallback((inOsdZone: boolean) => {
    osdZoneRef.current = inOsdZone;

    // Match original behavior: hide/show particle container directly.
    // Also keep hidden when scrolled past all fullpage sections.
    const particleEl = document.getElementById("particleImage");
    if (particleEl) {
      const pastFullpage = window.scrollY >= window.innerHeight * 10;
      particleEl.style.display = inOsdZone || pastFullpage ? "none" : "block";
    }

    setParticlesVisible((prev) => (prev === !inOsdZone ? prev : !inOsdZone));
    setOsdVisible((prev) => (prev === inOsdZone ? prev : inOsdZone));

    // Match original behavior: toggle the OSD canvas itself.
    const osdCanvas = osdViewerRef.current?.element?.querySelector(
      ".openseadragon-canvas"
    ) as HTMLElement | null;
    if (osdCanvas) {
      osdCanvas.style.opacity = inOsdZone ? "1" : "0";
    }
  }, []);

  // --- Scroll handler: updates particle progress via ref (no re-renders) ---
  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY;
    const sectionHeight = window.innerHeight;
    const section5Top = sectionHeight * 5;

    // scrollEnd = curve value at section5Top, so progress reaches 1.0
    // exactly when scrollY arrives at the OSD section
    const scrollEnd = (section5Top * 6000 + 5000) / (section5Top + 2000);

    const newScrollTop =
      (scrollTop * 6000 + 5000) / (scrollTop + 2000);
    const scrollProgress = Math.min(newScrollTop / scrollEnd, 1);
    scrollRef.current = scrollProgress;

    // Track current section for snapping logic
    const currentSection = Math.floor(scrollTop / sectionHeight);
    currentSectionRef.current = currentSection;

    if (!titleAnimated && scrollTop > 2) {
      setTitleAnimated(true);
    }

    // Trigger USP section animations when scrolled into view
    // Sections: usp1=2, usp2=3, usp3=4 — use direct DOM to avoid re-renders
    if (currentSection >= 2 && currentSection <= 4 && !uspAnimatedRef.current[currentSection]) {
      uspAnimatedRef.current[currentSection] = true;
      const sectionIds = { 2: "usp1", 3: "usp2", 4: "usp3" } as const;
      const el = document.querySelector(`#${sectionIds[currentSection as 2 | 3 | 4]} .big-title-usp`);
      if (el) {
        el.classList.remove("usp-hidden");
        el.classList.add("usp-visible");
      }
    }

    // Hide particle image once scrolled past all fullpage sections
    // (prevents the artwork from bleeding through concept/footer area)
    const fullpageBottom = sectionHeight * 10;
    const particleEl = document.getElementById("particleImage");
    if (particleEl) {
      const pastFullpage = scrollTop >= fullpageBottom;
      particleEl.style.display = pastFullpage || osdZoneRef.current ? "none" : "block";
    }
  }, [titleAnimated]);

  // --- Fullpage scroll snapping: intercept wheel events, snap to sections ---
  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    // Initial visibility sync (refresh/deeplink safety)
    const initSH = window.innerHeight;
    applyOsdZoneVisibility(window.scrollY >= initSH * 5 && window.scrollY < initSH * 6);

    const sections = document.querySelectorAll("#fullpage .section");
    const totalSections = sections.length;

    let wheelAccum = 0;
    let wheelTimer: ReturnType<typeof setTimeout> | null = null;
    const WHEEL_THRESHOLD = 30; // min accumulated delta to trigger snap

    const handleWheel = (e: WheelEvent) => {
      const scrollTop = window.scrollY;
      const sectionHeight = window.innerHeight;
      const fullpageBottom = totalSections * sectionHeight;

      // Past fullpage zone → allow normal scrolling in both directions
      if (scrollTop >= fullpageBottom) {
        return;
      }

      const cur = Math.floor(scrollTop / sectionHeight);
      if (cur === 5) {
        const osdWrapper = document.getElementById("openseadragonWrapper");
        const isInsideOsdWrapper =
          !!osdWrapper && e.target instanceof Node && osdWrapper.contains(e.target);

        if (isInsideOsdWrapper) {
          // Inside OSD wrapper (center 80%): let OSD handle zoom natively, no scroll
          return;
        }
        // Outside OSD wrapper (gutters): fall through to snap-scroll logic below
      }

      // Inside fullpage zone → prevent native scroll, handle snapping
      e.preventDefault();

      if (isSnapping.current) {
        return;
      }

      // Accumulate delta for trackpad support (many small events)
      wheelAccum += e.deltaY;
      if (wheelTimer) clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => { wheelAccum = 0; }, 200);

      if (Math.abs(wheelAccum) < WHEEL_THRESHOLD) return;

      const direction = wheelAccum > 0 ? 1 : -1;
      wheelAccum = 0;

      const next = cur + direction;

      if (next < 0) return;

      // Determine if zone will change after scroll completes
      const nextInOsdZone = next === 5;
      const zoneWillChange = nextInOsdZone !== osdZoneRef.current;

      // Scrolling past last fullpage section → snap to fullpageBottom, then normal scroll
      if (next >= totalSections) {
        isSnapping.current = true;
        window.scrollTo({ top: fullpageBottom, behavior: "smooth" });
        setTimeout(() => { isSnapping.current = false; }, 1000);
        return;
      }

      isSnapping.current = true;
      const target = next * sectionHeight;
      window.scrollTo({ top: target, behavior: "smooth" });

      // Swap visibility AFTER scroll completes (when arriving at destination)
      // This keeps particles visible during the scroll animation to section 5
      if (zoneWillChange) {
        // Use scrollend event if available, otherwise poll for arrival
        const swapOnArrival = () => {
          const arrived = Math.abs(window.scrollY - target) < 5;
          if (arrived) {
            applyOsdZoneVisibility(nextInOsdZone);
          } else {
            requestAnimationFrame(swapOnArrival);
          }
        };
        requestAnimationFrame(swapOnArrival);
      }

      setTimeout(() => { isSnapping.current = false; }, 1000);
    };

    // --- Touch snapping for mobile ---
    let touchStartY = 0;
    const TOUCH_THRESHOLD = 30; // min px swipe to trigger snap

    const handleTouchStart = (e: TouchEvent) => {
      const scrollTop = window.scrollY;
      const sectionHeight = window.innerHeight;
      const fullpageBottom = totalSections * sectionHeight;

      // Past fullpage zone → allow normal scrolling
      if (scrollTop >= fullpageBottom) return;

      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const scrollTop = window.scrollY;
      const sectionHeight = window.innerHeight;
      const fullpageBottom = totalSections * sectionHeight;

      // Past fullpage zone → allow normal scrolling
      if (scrollTop >= fullpageBottom) return;

      const cur = Math.floor(scrollTop / sectionHeight);

      // Inside OSD wrapper → let OSD handle touch natively
      if (cur === 5) {
        const osdWrapper = document.getElementById("openseadragonWrapper");
        const isInsideOsdWrapper =
          !!osdWrapper && e.target instanceof Node && osdWrapper.contains(e.target);
        if (isInsideOsdWrapper) return;
      }

      // Prevent native scroll in fullpage zone
      e.preventDefault();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const scrollTop = window.scrollY;
      const sectionHeight = window.innerHeight;
      const fullpageBottom = totalSections * sectionHeight;

      // Past fullpage zone → allow normal scrolling
      if (scrollTop >= fullpageBottom) return;

      if (isSnapping.current) return;

      const touchEndY = e.changedTouches[0].clientY;
      const deltaY = touchStartY - touchEndY; // positive = swipe up = scroll down

      if (Math.abs(deltaY) < TOUCH_THRESHOLD) return;

      const cur = Math.floor(scrollTop / sectionHeight);

      // Inside OSD wrapper → let OSD handle touch natively
      if (cur === 5) {
        const osdWrapper = document.getElementById("openseadragonWrapper");
        const isInsideOsdWrapper =
          !!osdWrapper && e.target instanceof Node && osdWrapper.contains(e.target as Node);
        if (isInsideOsdWrapper) return;
      }

      const direction = deltaY > 0 ? 1 : -1;
      const next = cur + direction;

      if (next < 0) return;

      // Determine if zone will change after scroll completes
      const nextInOsdZone = next === 5;
      const zoneWillChange = nextInOsdZone !== osdZoneRef.current;

      // Scrolling past last fullpage section → snap to fullpageBottom
      if (next >= totalSections) {
        isSnapping.current = true;
        window.scrollTo({ top: fullpageBottom, behavior: "smooth" });
        setTimeout(() => { isSnapping.current = false; }, 1000);
        return;
      }

      isSnapping.current = true;
      const target = next * sectionHeight;
      window.scrollTo({ top: target, behavior: "smooth" });

      if (zoneWillChange) {
        const swapOnArrival = () => {
          const arrived = Math.abs(window.scrollY - target) < 5;
          if (arrived) {
            applyOsdZoneVisibility(nextInOsdZone);
          } else {
            requestAnimationFrame(swapOnArrival);
          }
        };
        requestAnimationFrame(swapOnArrival);
      }

      setTimeout(() => { isSnapping.current = false; }, 1000);
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [applyOsdZoneVisibility, handleScroll]);

  // --- Fitty: auto-size USP text to fill container width ---
  const fittyInstancesRef = useRef<ReturnType<typeof fitty>>([]);

  useEffect(() => {
    const titleFits = fitty(".usp-fit-title [data-fitty]", {
      minSize: 14,
      maxSize: 120,
      multiLine: false,
    });
    const subtitleFits = fitty(".usp-fit-subtitle [data-fitty]", {
      minSize: 12,
      maxSize: 72,
      multiLine: false,
    });
    const smallFits = fitty(".usp-fit-small [data-fitty]", {
      minSize: 12,
      maxSize: 48,
      multiLine: false,
    });
    const pickerFits = fitty(".colorpicker-label-fit [data-fitty]", {
      minSize: 14,
      maxSize: 100,
      multiLine: false,
    });
    const allFits = [...titleFits, ...subtitleFits, ...smallFits, ...pickerFits];
    fittyInstancesRef.current = allFits;
    const handleResize = () => allFits.forEach((f) => f.fit());
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      allFits.forEach((f) => f.unsubscribe());
    };
  }, []);

  // Re-trigger fitty when language changes (text length changes)
  useEffect(() => {
    const timer = setTimeout(() => {
      fittyInstancesRef.current.forEach((f) => f.fit());
    }, 50);
    return () => clearTimeout(timer);
  }, [i18n.language]);

  // Sync <html lang> attribute with current i18n language
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const handleLangChange = useCallback(
    (code: string) => {
      i18n.changeLanguage(code);
    },
    [i18n]
  );

  useEffect(() => {
    let active = true;

    const initializeColorPicker = async () => {
      try {
        const response = await fetch("/api/legacy-colors", {
          method: "GET",
          cache: "force-cache",
        });
        if (!response.ok) {
          throw new Error("Failed to load legacy color dataset.");
        }

        const colorsPayload = (await response.json()) as LegacyColorsMap;
        if (!active) {
          return;
        }

        const randomColor = randomHexColor();
        const references = buildColorReferences(colorsPayload);

        setLegacyColors(colorsPayload);
        setPickerHex(randomColor);
        setMonochromeImageIds(getClosestImagesArr(references, randomColor, 3));
        setAppReady(true);
      } catch {
        if (active) {
          setLegacyColors(null);
          setMonochromeImageIds([]);
          setAppReady(true);
        }
      }
    };

    void initializeColorPicker();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (colorReferences.length === 0) {
      return;
    }

    setMonochromeImageIds(getClosestImagesArr(colorReferences, pickerHex, 3));
  }, [colorReferences, pickerHex]);

  useEffect(() => {
    let active = true;

    const loadSoldPieces = async () => {
      try {
        const response = await fetch("/api/pieces/sold", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to fetch sold pieces.");
        }

        const payload = (await response.json()) as SoldPiecesResponse;
        if (!active) {
          return;
        }

        if (typeof payload.soldCount === "number") {
          setSoldPieceCount(payload.soldCount);
        }
      } catch {
        if (active) {
          setSoldPieceCount(null);
        }
      }
    };

    void loadSoldPieces();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadHighestBid = async () => {
      try {
        const response = await fetch("/api/bids", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to fetch bids.");
        }

        const payload = (await response.json()) as {
          highestBid: { amount: number; createdAt: string } | null;
        };
        if (!active) {
          return;
        }

        if (payload.highestBid) {
          setHighestBidAmount(payload.highestBid.amount);
        }
      } catch {
        if (active) {
          setHighestBidAmount(null);
        }
      }
    };

    void loadHighestBid();

    return () => {
      active = false;
    };
  }, []);

  // Keyboard navigation for preview overlay
  useEffect(() => {
    if (previewImageId === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          closePreviewOverlay();
          break;
        case "ArrowRight":
          navigatePreview("right");
          e.preventDefault();
          break;
        case "ArrowLeft":
          navigatePreview("left");
          e.preventDefault();
          break;
        case "ArrowDown":
          navigatePreview("down");
          e.preventDefault();
          break;
        case "ArrowUp":
          navigatePreview("up");
          e.preventDefault();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewImageId, closePreviewOverlay, navigatePreview]);

  const handleBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setBidFormState((prev) => ({ ...prev, submitting: true, error: null }));

    try {
      const response = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: bidFormState.name,
          email: bidFormState.email,
          amount: Number(bidFormState.amount),
          message: bidFormState.message || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("bid.submitError"));
      }

      setBidFormState({
        name: "",
        email: "",
        amount: "",
        message: "",
        submitting: false,
        success: true,
        error: null,
      });

      if (data.bid?.amount) {
        setHighestBidAmount((prev) =>
          prev === null || data.bid.amount > prev ? data.bid.amount : prev
        );
      }
    } catch (err) {
      setBidFormState((prev) => ({
        ...prev,
        submitting: false,
        error: err instanceof Error ? err.message : t("bid.submitError"),
      }));
    }
  };

  return (
    <>
      {/* Animated gradient background */}
      <div id="background-image" />
      <div id="particleImageWrapper" />

      {/* Three.js particle overlay */}
      <ParticleScene
        scrollRef={scrollRef}
        visible={particlesVisible}
      />

      {/* Header & Navigation */}
      <HeaderNav
        lang={i18n.language}
        onLangChange={handleLangChange}
        likedCount={likedIds.size}
        basketCount={basketIds.size}
      />
      <MobileScrollNav
        isSnapping={isSnapping}
        osdZoneRef={osdZoneRef}
        applyOsdZoneVisibility={applyOsdZoneVisibility}
      />

      {/* ===== FULLPAGE SECTIONS ===== */}
      <div id="fullpage" ref={fullpageRef}>
        {/* --- Section 1: Loading / Intro Slide --- */}
        <div className="section" id="loading-slide">
          <div className="intro">
            <div id="intro-image">
              <div id="imaginary-gallery">
                <h3>
                  <strong>{t("intro.gallery")}</strong>
                </h3>
                <p>
                  <span className="big">
                    <strong>{t("intro.headline")}</strong>
                    <br />
                    {t("intro.subline")}
                  </span>
                </p>
                {!appReady ? (
                  <div id="loading">{t("intro.loading")}</div>
                ) : (
                  <div
                    className="startButton"
                    id="startButton"
                    onClick={() => {
                      window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
                    }}
                  >
                    {t("intro.start")}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* --- Section 2: Title --- */}
        <div className="section" id="title">
          <div className="intro">
            <h1 className={`text-pop-up-top ${titleAnimated ? "hover" : ""}`}>
              I LAUGH YOU!
            </h1>
          </div>
        </div>

        {/* --- Section 3: USP 1 --- */}
        <div className="section" id="usp1">
          <div className="intro usps">
            <div className="big-title-usp usp-hidden">
              <div className="usp-fit-title usp-anim usp-anim-title">
                <h2 data-fitty>{t("usp1.title")}</h2>
              </div>
              <div className="usp-image-wrapper usp-anim usp-anim-image">
                <img
                  className="usp-image"
                  src="/img/how-it-all-started.png"
                  alt={t("usp1.imgAlt")}
                />
              </div>
              <div className="usp-fit-subtitle usp-anim usp-anim-text">
                <p className="big" data-fitty>
                  {t("usp1.subtitle")}
                </p>
              </div>
              <div className="usp-fit-small usp-anim usp-anim-text">
                <p className="small" data-fitty>
                  {t("usp1.text")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* --- Section 4: USP 2 --- */}
        <div className="section" id="usp2">
          <div className="intro usps">
            <div className="big-title-usp usp-hidden">
              <div className="usp-fit-title usp-anim usp-anim-title">
                <h2 data-fitty>{t("usp2.title")}</h2>
              </div>
              <div className="usp-image-wrapper usp-anim usp-anim-image">
                <img
                  className="usp-image"
                  src="/img/bigger-picture-2.png"
                  alt={t("usp2.imgAlt")}
                />
              </div>
              <div className="usp-fit-subtitle usp-anim usp-anim-text">
                <p className="big" data-fitty>
                  {t("usp2.subtitle")}
                </p>
              </div>
              <div className="usp-fit-small usp-anim usp-anim-text">
                <p className="small" data-fitty>
                  {t("usp2.text")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* --- Section 5: USP 3 --- */}
        <div className="section" id="usp3">
          <div className="intro usps">
            <div className="big-title-usp usp-hidden">
              <div className="usp-fit-title usp-anim usp-anim-title">
                <h2 data-fitty>{t("usp3.title")}</h2>
              </div>
              <div className="usp-image-wrapper usp-anim usp-anim-image">
                <img
                  className="usp-image"
                  src="/img/pick-a-piece-of-me-2.png"
                  alt={t("usp3.imgAlt", { total: TOTAL_PIECES_COPY })}
                />
              </div>
              <div className="usp-fit-subtitle usp-anim usp-anim-text">
                <p className="big" data-fitty>
                  {t("usp3.subtitle", { total: TOTAL_PIECES_COPY })}
                </p>
              </div>
              <div className="usp-fit-small usp-anim usp-anim-text">
                <p className="small" data-fitty>
                  {t("usp3.text")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* --- Section 6: Full Image (OpenSeadragon Deep Zoom) --- */}
        <div className="section" id="fullImage">
          <div className="intro">
            <DeepZoomViewer
              visible={osdVisible}
              viewerRef={osdViewerRef}
              onImageClick={handleTileClick}
            />
          </div>
        </div>

        {/* --- Section 7: Color Picker --- */}
        <div className="section" id="pickColor">
          <div className="intro">
          <div id="image-picker">
            <h3 id="monochromatic" className="colorpicker">
              <div>
                <div className="colorpicker-label-fit">
                  <span data-fitty>{t("colorPicker.label")}</span>
                </div>
                <div id="monochromatic-picker-wrapper">
                  <p
                    id="helpText"
                    style={{
                      opacity: helpTextFaded ? 0 : 1,
                      transition: "opacity 300ms ease",
                      pointerEvents: helpTextFaded ? "none" : "auto",
                    }}
                  >
                    {t("colorPicker.helpText")}
                    <Image
                      src="/img/help/arrow.png"
                      alt="Arrow"
                      width={150}
                      height={150}
                      style={{ width: "auto", height: "auto" }}
                    />
                  </p>
                  {/* Visible circle with native color input overlaid on top */}
                  <div
                    id="monochromatic-picker"
                    style={{
                      backgroundColor: `#${pickerHex}`,
                    }}
                  >
                    <input
                      ref={nativeColorInputRef}
                      type="color"
                      value={`#${pickerHex}`}
                      onChange={(event) => {
                        setHelpTextFaded(true);
                        setPickerHex(event.target.value.replace("#", ""));
                      }}
                      onFocus={() => setHelpTextFaded(true)}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        opacity: 0,
                        cursor: "pointer",
                        borderRadius: "100px",
                      }}
                    />
                  </div>
                </div>
              </div>
            </h3>
            <div id="monochrome" className="imagePreview">
              {monochromePreviewTiles.map(renderPreviewTile)}
            </div>
          </div>
        </div>
        </div>

        {/* --- Section 8: Price --- */}
        <div className="section" id="price-slide">
          <div id="which-price" className="big-title">
        <h2>{t("price.title")}</h2>
        <h3>
          <span className="big">
            {t("price.currentPrice")} <strong id="currentPricePlot">{currentPricePlot}</strong>
          </span>
        </h3>
        <h3>
          <span className="small">
            {t("price.soldPieces")} <strong id="soldPieces">{soldPieceCount ?? "-"}</strong> / {TOTAL_PIECES_COPY}
          </span>
        </h3>

        <div id="chartWrapperWrapper">
          <div id="chartWrapper">
            <PriceCurveChart
              soldPieceCount={soldPieceCount}
              totalPieces={TOTAL_PIECES}
              currency={currency}
            />
          </div>
        </div>

        <h3>
          <span className="small">
            <strong>{t("price.tip")} </strong> {t("price.tipText")}
            <br />
            {t("price.firstLast", { firstPrice: firstPriceFormatted, lastPrice: lastPriceFormatted })}
            <br />
            {t("price.beQuick")}
            <br />
            {t("price.cheaper")} <strong>{t("price.hesitation")}</strong>
          </span>
        </h3>
          </div>
        </div>

        {/* --- Section 9: Sofa --- */}
        <SofaSection
          likedIds={likedIds}
          sofaPlacements={sofaPlacements}
          onSofaPlacement={setSofaPlacement}
          palettesByImageId={palettesByImageId}
        />

        {/* --- Section 10: Bid --- */}
        <div className="section" id="bid-slide">
          <div id="buy-bigger-picture">
        <h2>{t("bid.title")}</h2>
        <p>
          {t("bid.description")}
        </p>
        <p>
          <strong>
            {t("bid.currentHighest")}{" "}
            {highestBidAmount !== null
              ? `$${highestBidAmount.toLocaleString()}`
              : t("bid.noBids")}
          </strong>
        </p>

        {bidFormState.success ? (
          <div className="bid-success">
            <p className="bid-success-title">
              {t("bid.successTitle")}
            </p>
            <p className="bid-success-sub">
              {t("bid.successSub")}
            </p>
            <button
              type="button"
              className="bid-btn"
              onClick={() =>
                setBidFormState((prev) => ({ ...prev, success: false }))
              }
            >
              {t("bid.newBid")}
            </button>
          </div>
        ) : (
          <form
            id="bid-form"
            className="bid-form"
            onSubmit={handleBidSubmit}
          >
            {bidFormState.error && (
              <div className="bid-error">
                {bidFormState.error}
              </div>
            )}

            <label className="bid-label">
              <span>{t("bid.nameLabel")}</span>
              <input
                type="text"
                name="name"
                required
                minLength={2}
                value={bidFormState.name}
                onChange={(e) =>
                  setBidFormState((prev) => ({ ...prev, name: e.target.value }))
                }
                disabled={bidFormState.submitting}
              />
            </label>

            <label className="bid-label">
              <span>{t("bid.emailLabel")}</span>
              <input
                type="email"
                name="email"
                required
                value={bidFormState.email}
                onChange={(e) =>
                  setBidFormState((prev) => ({ ...prev, email: e.target.value }))
                }
                disabled={bidFormState.submitting}
              />
            </label>

            <label className="bid-label">
              <span>{t("bid.amountLabel")}</span>
              <input
                type="number"
                name="amount"
                required
                min={1}
                value={bidFormState.amount}
                onChange={(e) =>
                  setBidFormState((prev) => ({ ...prev, amount: e.target.value }))
                }
                disabled={bidFormState.submitting}
                placeholder={t("bid.amountPlaceholder")}
              />
            </label>

            <label className="bid-label">
              <span>{t("bid.messageLabel")}</span>
              <textarea
                name="message"
                rows={2}
                value={bidFormState.message}
                onChange={(e) =>
                  setBidFormState((prev) => ({ ...prev, message: e.target.value }))
                }
                disabled={bidFormState.submitting}
                placeholder={t("bid.messagePlaceholder")}
              />
            </label>

            <button
              type="submit"
              className="bid-btn"
              disabled={bidFormState.submitting}
            >
              {bidFormState.submitting ? t("bid.submitting") : t("bid.submit")}
            </button>
          </form>
        )}

        <p id="i-will-contact-you">{t("bid.contactNote")}</p>
          </div>
        </div>

      </div>

      {/* --- Concept (outside fullpage → normal flow, scrollable) --- */}
      <div id="concept-slide">
        <div id="content-wrapper">
        <h3>{t("concept.title")}</h3>
        <p>
          <br />
          <span id="intro-text">
            <br />
            <Trans
              i18nKey="concept.intro"
              ns="home"
              components={{
                b: <b />,
                u: <u />,
                artHighlight: <span className="art-highlight" />,
                capHighlight: <span className="capitalism-highlight" />,
              }}
            />
          </span>
          <br />
          <br />
          <Trans
            i18nKey="concept.body1"
            ns="home"
            values={{ total: TOTAL_PIECES_COPY, firstPrice: firstPriceFormatted, lastPrice: lastPriceFormatted }}
            components={{
              span: <span />,
              b_cap: <b className="capitalism-highlight" />,
            }}
          />
          <br />
          <br />
          <Trans
            i18nKey="concept.body2"
            ns="home"
            components={{
              u: <u />,
              capHighlight: <span className="capitalism-highlight" />,
              artHighlight: <span className="art-highlight" />,
            }}
          />
          <br />
          <br />
          {t("concept.body3")}
          <br />
          <br />
          <Trans
            i18nKey="concept.outro"
            ns="home"
            components={{
              i: <i />,
              loveHighlight: <span className="love-highlight" />,
            }}
          />
          <br />
          <br />- <b className="art-highlight">{t("concept.artist")}</b>
        </p>
        </div>
      </div>

      <div id="social-bar">
        <a
          href="https://www.facebook.com/ilaughyouofficial"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            src="/img/512facebook.png"
            alt="Facebook"
            width={90}
            height={90}
            style={{ width: "auto", height: "auto" }}
          />
        </a>
        <a
          href="https://www.instagram.com/ilaughyouofficial"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            src="/img/512insta.png"
            alt="Instagram"
            width={90}
            height={90}
            style={{ width: "auto", height: "auto" }}
          />
        </a>
        <a
          href="https://twitter.com/ily6059"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            src="/img/512twitter.png"
            alt="Twitter"
            width={90}
            height={90}
            style={{ width: "auto", height: "auto" }}
          />
        </a>
        <a
          href="https://www.pinterest.ch/ily6059/pins/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            src="/img/512pinterest.png"
            alt="Pinterest"
            width={90}
            height={90}
            style={{ width: "auto", height: "auto" }}
          />
        </a>
      </div>

      <div id="footer-wrapper">
        <div id="where-is-me-from" className="big-title">
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

      {/* Preview Image Overlay - rendered via portal to escape stacking contexts */}
      {previewImageId !== null && overlayPreviewTile && typeof document !== "undefined" && createPortal(
        <div
          id="previewImage"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closePreviewOverlay();
            }
          }}
        >
          <div id="closePreview" onClick={closePreviewOverlay}>
            ×
          </div>
          <div
            className="tile"
            data-imagenmbr={overlayPreviewTile.id}
            onClick={(e) => e.stopPropagation()}
            style={{
              transform: `scale(${overlayScale})`,
              transformOrigin: "center center",
            }}
          >
            <div
              className="imgWrapper"
              style={{
                position: "relative",
                overflow: "hidden",
                width: `${overlayPreviewTile.width}px`,
                height: `${overlayPreviewTile.height}px`,
              }}
            >
              {overlayPreviewTile.layers.map((layer, layerIndex) => (
                <div
                  className="imgWrapperOffset"
                  key={`overlay-layer-${layerIndex}`}
                  style={{
                    position: "absolute",
                    left: `-${layer.left}px`,
                    top: `-${layer.top}px`,
                  }}
                >
                  {layer.rows.map((row, rowIndex) => (
                    <div
                      className="imgRow"
                      key={`overlay-row-${rowIndex}`}
                      style={{
                        height: `${TILE_DIMENSION}px`,
                        width: `${row.width}px`,
                      }}
                    >
                      {row.images.map((src, imageIndex) => (
                        <img
                          key={`overlay-img-${rowIndex}-${imageIndex}`}
                          src={src}
                          height={TILE_DIMENSION}
                          width={TILE_DIMENSION}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="infos">
              {overlayPreviewTile.palette.map((rgb, index) => (
                <div
                  key={`overlay-palette-${index}`}
                  className="colorPalette"
                  style={{
                    left: `${index * 20}px`,
                    backgroundColor: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
                  }}
                />
              ))}
              <div className="imageId">
                <span className="id">ID</span>
                {overlayPreviewTile.id}
              </div>
            </div>
          </div>
          <div className="overlay-actions" onClick={(e) => e.stopPropagation()}>
            <div
              className={`overlay-heart ${likedIds.has(overlayPreviewTile.id) ? "on" : "off"}`}
              onClick={() => toggleLike(overlayPreviewTile.id)}
            >
              <img className="heart-off-img" src="/img/heart-off.png" alt="Like" />
              <img className="heart-on-img" src="/img/heart-on.png" alt="Liked" />
            </div>
            <div
              className={`overlay-basket ${basketIds.has(overlayPreviewTile.id) ? "on" : "off"}`}
              onClick={() => toggleBasket(overlayPreviewTile.id)}
            >
              <img className="basket-off-img" src="/img/basket-off.png" alt="Add to basket" />
              <img className="basket-on-img" src="/img/basket-on.png" alt="In basket" />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
