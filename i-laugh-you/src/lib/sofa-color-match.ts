import type { Rgb } from "@/lib/tile-utils";

/**
 * Convert a hex color string (with or without leading "#") to an RGB triple.
 * Falls back to black for malformed input.
 */
export function hexToRgb(hex: string): Rgb {
  const cleaned = hex.trim().replace("#", "");
  const expanded =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => `${c}${c}`)
          .join("")
      : cleaned.padStart(6, "0").slice(0, 6);
  const value = Number.parseInt(expanded, 16);
  if (!Number.isFinite(value)) return [0, 0, 0];
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function squaredDistance(a: Rgb, b: Rgb): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

/**
 * Pick the top-N image IDs whose dominant palette color is closest to the
 * given sofa color, using simple squared Euclidean distance in RGB space.
 *
 * - Pieces missing a palette are skipped.
 * - Ties are broken by smaller imageId (stable, deterministic).
 * - Returns fewer than `count` IDs only if not enough pieces have palettes.
 */
export function pickClosestImageIds(
  sofaHex: string,
  palettesByImageId: Map<number, Rgb[]>,
  count = 3
): number[] {
  if (count < 1 || palettesByImageId.size === 0) return [];

  const target = hexToRgb(sofaHex);

  const scored: Array<{ id: number; distance: number }> = [];
  palettesByImageId.forEach((palette, imageId) => {
    const dominant = palette[0];
    if (!dominant) return;
    scored.push({ id: imageId, distance: squaredDistance(dominant, target) });
  });

  scored.sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    return a.id - b.id;
  });

  return scored.slice(0, count).map((entry) => entry.id);
}
