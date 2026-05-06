/**
 * Device-tier profile for OpenSeadragon.
 *
 * Why: a 396 MP deep-zoom image has wildly different perf budgets on a
 * Samsung A22 (Mali-G52, 4 GB, slow eMMC) vs a desktop. The same OSD
 * settings that feel snappy on desktop OOM the A22 or hit shader-compile
 * bugs in the WebGL drawer.
 *
 * The detector returns one of four tiers and a matching config bundle.
 * The viewer spreads the bundle into the OSD constructor and uses the
 * extra fields (gridDprCap, maxViewerZoom, maxZoomPixelRatio,
 * disableContinuousRaf) for the bits that aren't OSD-native.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

export type DeviceTier = "low" | "medium" | "high" | "desktop";

export interface OsdDeviceProfile {
  tier: DeviceTier;
  /** Reasons used in detection — surfaced for debugging via console. */
  reasons: string[];
  /** Drawer preference list passed to OSD. */
  drawer: string[];
  /** Settings spread directly into the OSD constructor. */
  osdOptions: {
    imageLoaderLimit: number;
    maxImageCacheCount: number;
    minPixelRatio: number;
    immediateRender: boolean;
    smoothTileEdgesMinZoom: number;
    blendTime: number;
    alwaysBlend: boolean;
    preload: boolean;
    springStiffness: number;
    animationTime: number;
    maxZoomPixelRatio: number;
    maxZoomLevel: number;
    /** Touch gesture settings (looser flick on low-end so flings finish). */
    gestureSettingsTouch: {
      flickEnabled: boolean;
      flickMinSpeed: number;
      flickMomentum: number;
    };
  };
  /** Overlay-grid DPR cap; large canvases dominate fillRect cost on Mali. */
  gridDprCap: number;
  /** Skip the continuous RAF redraw loop entirely on low tier. */
  disableContinuousRaf: boolean;
}

interface DetectionSignals {
  isMobile: boolean;
  isIOS: boolean;
  deviceMemoryGb: number | null;
  hardwareConcurrency: number;
  effectiveType: string | null;
  saveData: boolean;
  dpr: number;
  screenLongEdge: number;
  webglUsable: boolean;
  malilike: boolean;
  knownLowEndAndroid: boolean;
}

function getWebglRenderer(): string | null {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      (canvas.getContext("webgl2") as WebGL2RenderingContext | null) ||
      (canvas.getContext("webgl") as WebGLRenderingContext | null) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return null;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (!ext) return null;
    return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string;
  } catch {
    return null;
  }
}

function probeWebglShaders(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      (canvas.getContext("webgl2") as WebGL2RenderingContext | null) ||
      (canvas.getContext("webgl") as WebGLRenderingContext | null) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return false;
    const vs = gl.createShader(gl.VERTEX_SHADER);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!vs || !fs) return false;
    gl.shaderSource(vs, "void main(){gl_Position=vec4(0.0);}");
    gl.shaderSource(fs, "void main(){gl_FragColor=vec4(0.0);}");
    gl.compileShader(vs);
    gl.compileShader(fs);
    return (
      gl.getShaderParameter(vs, gl.COMPILE_STATUS) === true &&
      gl.getShaderParameter(fs, gl.COMPILE_STATUS) === true
    );
  } catch {
    return false;
  }
}

function collectSignals(): DetectionSignals {
  const ua = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua) ||
    // iPadOS 13+ reports as Mac with touch
    (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);

  const nav = navigator as any;
  const deviceMemoryGb = typeof nav.deviceMemory === "number" ? nav.deviceMemory : null;
  const hardwareConcurrency = navigator.hardwareConcurrency || 0;

  const conn = nav.connection || nav.mozConnection || nav.webkitConnection || null;
  const effectiveType = conn?.effectiveType ?? null;
  const saveData = conn?.saveData === true;

  const dpr = window.devicePixelRatio || 1;
  const screenLongEdge = Math.max(window.screen.width, window.screen.height) * dpr;

  const renderer = getWebglRenderer();
  // Mali GPUs (esp. Mali-G52 on Samsung A22) ship with broken/slow shaders
  // for OSD's WebGL drawer; PowerVR low-end is similarly weak.
  const malilike = !!renderer &&
    /Mali|Adreno 3\d\d|Adreno 4\d\d|PowerVR.*Rogue.*GE|Tegra 3/i.test(renderer);

  // Samsung A0x/A1x/A2x and Galaxy Jx are entry-level; users specifically
  // call out the A22 in the bug report.
  const knownLowEndAndroid = /SM-A[012]\d|SM-J\d|Galaxy A[012]\d/i.test(ua);

  return {
    isMobile,
    isIOS,
    deviceMemoryGb,
    hardwareConcurrency,
    effectiveType,
    saveData,
    dpr,
    screenLongEdge,
    webglUsable: probeWebglShaders(),
    malilike,
    knownLowEndAndroid,
  };
}

function classifyTier(s: DetectionSignals, reasons: string[]): DeviceTier {
  // Hard low-tier signals — any of these forces low.
  if (s.knownLowEndAndroid) {
    reasons.push("known low-end Android model");
    return "low";
  }
  if (s.saveData) {
    reasons.push("Save-Data requested");
    return "low";
  }
  if (s.effectiveType === "slow-2g" || s.effectiveType === "2g") {
    reasons.push(`slow connection (${s.effectiveType})`);
    return "low";
  }
  if (s.deviceMemoryGb !== null && s.deviceMemoryGb <= 2) {
    reasons.push(`deviceMemory ${s.deviceMemoryGb} GB`);
    return "low";
  }
  if (s.malilike && s.isMobile) {
    reasons.push("low-end mobile GPU");
    return "low";
  }

  if (!s.isMobile) {
    reasons.push("desktop UA");
    return "desktop";
  }

  // Mobile from here on — pick medium vs high.
  const looksHighEnd =
    (s.deviceMemoryGb ?? 0) >= 6 &&
    s.hardwareConcurrency >= 8 &&
    s.webglUsable &&
    (s.effectiveType === null || s.effectiveType === "4g" || s.effectiveType === "5g");

  if (looksHighEnd) {
    reasons.push("high-end mobile signals");
    return "high";
  }

  // 3g network, 3-4 GB RAM, Mali-but-passes-shader-probe → medium.
  reasons.push("default mobile mid-tier");
  return "medium";
}

function profileFor(tier: DeviceTier, s: DetectionSignals): OsdDeviceProfile {
  // Shared touch defaults — flick momentum tuned per tier.
  const baseTouch = {
    flickEnabled: true,
    flickMinSpeed: 120,
    flickMomentum: 0.25,
  };

  switch (tier) {
    case "low":
      // Canvas drawer only. Even when shaders compile, the OSD WebGL drawer
      // is slower than canvas2d on Mali-G52 / Adreno 3xx. Aggressively cap
      // memory and concurrent loads.
      return {
        tier,
        reasons: [],
        drawer: ["canvas"],
        osdOptions: {
          imageLoaderLimit: 1,
          maxImageCacheCount: 40,
          minPixelRatio: 1.2,
          immediateRender: true,
          smoothTileEdgesMinZoom: Infinity,
          blendTime: 0,
          alwaysBlend: false,
          preload: false,
          springStiffness: 5.0,
          animationTime: 0.6,
          maxZoomPixelRatio: 2,
          maxZoomLevel: 32,
          gestureSettingsTouch: { ...baseTouch, flickMomentum: 0.18 },
        },
        gridDprCap: 1,
        disableContinuousRaf: true,
      };

    case "medium":
      // Try WebGL only if shader probe passed; otherwise canvas. Moderate
      // caches; immediateRender off so progressive loading still works.
      return {
        tier,
        reasons: [],
        drawer: s.webglUsable ? ["webgl", "canvas"] : ["canvas"],
        osdOptions: {
          imageLoaderLimit: 2,
          maxImageCacheCount: 100,
          minPixelRatio: 0.8,
          immediateRender: false,
          smoothTileEdgesMinZoom: Infinity,
          blendTime: 0,
          alwaysBlend: false,
          preload: false,
          springStiffness: 6.0,
          animationTime: 0.4,
          maxZoomPixelRatio: 4,
          maxZoomLevel: 60,
          gestureSettingsTouch: baseTouch,
        },
        gridDprCap: 1.25,
        disableContinuousRaf: false,
      };

    case "high":
      return {
        tier,
        reasons: [],
        drawer: s.webglUsable ? ["webgl", "canvas"] : ["canvas"],
        osdOptions: {
          imageLoaderLimit: 4,
          maxImageCacheCount: 200,
          minPixelRatio: 0.5,
          immediateRender: false,
          smoothTileEdgesMinZoom: 1.1,
          blendTime: 0,
          alwaysBlend: false,
          preload: false,
          springStiffness: 6.5,
          animationTime: 0.35,
          maxZoomPixelRatio: 8,
          maxZoomLevel: 100,
          gestureSettingsTouch: baseTouch,
        },
        gridDprCap: 1.5,
        disableContinuousRaf: false,
      };

    case "desktop":
    default:
      return {
        tier: "desktop",
        reasons: [],
        drawer: s.webglUsable ? ["webgl", "canvas"] : ["canvas"],
        osdOptions: {
          imageLoaderLimit: 6,
          maxImageCacheCount: 200,
          minPixelRatio: 0.5,
          immediateRender: false,
          smoothTileEdgesMinZoom: 1.1,
          blendTime: 0,
          alwaysBlend: false,
          preload: true,
          springStiffness: 6.5,
          animationTime: 0.35,
          maxZoomPixelRatio: 16,
          maxZoomLevel: 100,
          gestureSettingsTouch: baseTouch,
        },
        gridDprCap: 1,
        disableContinuousRaf: false,
      };
  }
}

/** SSR-safe fallback used before window is available. */
export const DESKTOP_FALLBACK_PROFILE: OsdDeviceProfile = {
  tier: "desktop",
  reasons: ["ssr fallback"],
  drawer: ["webgl", "canvas"],
  osdOptions: {
    imageLoaderLimit: 6,
    maxImageCacheCount: 200,
    minPixelRatio: 0.5,
    immediateRender: false,
    smoothTileEdgesMinZoom: 1.1,
    blendTime: 0,
    alwaysBlend: false,
    preload: true,
    springStiffness: 6.5,
    animationTime: 0.35,
    maxZoomPixelRatio: 16,
    maxZoomLevel: 100,
    gestureSettingsTouch: {
      flickEnabled: true,
      flickMinSpeed: 120,
      flickMomentum: 0.25,
    },
  },
  gridDprCap: 1,
  disableContinuousRaf: false,
};

export function detectOsdDeviceProfile(): OsdDeviceProfile {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return DESKTOP_FALLBACK_PROFILE;
  }
  const reasons: string[] = [];
  const signals = collectSignals();
  reasons.push(
    `dpr=${signals.dpr}`,
    `mem=${signals.deviceMemoryGb ?? "?"}gb`,
    `cores=${signals.hardwareConcurrency || "?"}`,
    `net=${signals.effectiveType ?? "?"}`,
    `webgl=${signals.webglUsable ? "ok" : "no"}`,
  );
  const tier = classifyTier(signals, reasons);
  const profile = profileFor(tier, signals);
  return { ...profile, reasons };
}
