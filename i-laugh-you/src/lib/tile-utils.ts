import {
  PIECE_COLUMNS,
  PIECE_ROWS,
} from "@/lib/piece-config";

export type Rgb = [number, number, number];

export interface PreviewRow {
  images: string[];
  width: number;
}

export interface PreviewLayer {
  left: number;
  top: number;
  rows: PreviewRow[];
}

export interface PreviewTile {
  id: number;
  palette: Rgb[];
  width: number;
  height: number;
  layers: PreviewLayer[];
}

const TILE_COLUMNS = PIECE_COLUMNS;
const TILE_ROWS = PIECE_ROWS;
export const TILE_COUNT = TILE_COLUMNS * TILE_ROWS;
export const TILE_DIMENSION = 256;
const MAX_ZOOM_LEVEL = 11;
const PREVIEW_OFFSET_SHADOW = 4;

const SOURCE_IMAGE_WIDTH = 337920;
const SOURCE_IMAGE_HEIGHT = 396288;
const SOURCE_OFFSETS = {
  top: 3873,
  right: 3083,
  bottom: 1573,
  left: 1509,
};

const FINAL_IMAGE_WIDTH =
  (SOURCE_IMAGE_WIDTH - SOURCE_OFFSETS.right - SOURCE_OFFSETS.left) /
  TILE_COLUMNS;
const FINAL_IMAGE_HEIGHT =
  (SOURCE_IMAGE_HEIGHT - SOURCE_OFFSETS.top - SOURCE_OFFSETS.bottom) / TILE_ROWS;

const TILE_SERVER_BASE_URL = "https://ily.seez.ch/";

export const DEFAULT_PALETTE: Rgb[] = [
  [220, 220, 220],
  [200, 200, 200],
  [180, 180, 180],
  [160, 160, 160],
  [140, 140, 140],
  [120, 120, 120],
  [100, 100, 100],
];

export function clampImageId(id: number): number {
  return Math.min(TILE_COUNT, Math.max(1, id));
}

export function tileXYToQuadKey(
  tileX: number,
  tileY: number,
  levelOfDetail: number
): string {
  let quadKey = "q";
  for (let i = levelOfDetail; i > 0; i -= 1) {
    let digit = 0;
    const mask = 1 << (i - 1);
    if ((tileX & mask) !== 0) {
      digit += 1;
    }
    if ((tileY & mask) !== 0) {
      digit += 2;
    }
    quadKey += `t${digit}`;
  }

  let dirname = TILE_SERVER_BASE_URL;

  if (levelOfDetail % 2 === 0) {
    for (let i = 1; i < levelOfDetail + 1; i += 1) {
      if (i % 2 === 0) {
        dirname += `${quadKey.substring(
          0,
          quadKey.length - (levelOfDetail - i) * 2 - 1
        )}\\`;
      }
    }
  } else {
    for (let i = 1; i < levelOfDetail; i += 1) {
      if (i % 2 !== 0) {
        dirname += `${quadKey.substring(
          0,
          quadKey.length - (levelOfDetail - i) * 2 + 1
        )}\\`;
      }
    }
  }

  return `${dirname}${quadKey}.jpg`;
}

export function getTilePreviewLayout(imageId: number, zoom: number): {
  width: number;
  height: number;
  layers: PreviewLayer[];
} {
  const normalizedId = clampImageId(imageId) - 1;

  let yCoord =
    Math.floor(normalizedId / TILE_COLUMNS) * FINAL_IMAGE_HEIGHT +
    SOURCE_OFFSETS.top;
  let xCoord =
    (normalizedId % TILE_COLUMNS) * FINAL_IMAGE_WIDTH + SOURCE_OFFSETS.left;
  let singleImageWidth = FINAL_IMAGE_WIDTH;
  let singleImageHeight = FINAL_IMAGE_HEIGHT;

  for (let t = 0; t < MAX_ZOOM_LEVEL - zoom; t += 1) {
    xCoord /= 2;
    yCoord /= 2;
    singleImageWidth /= 2;
    singleImageHeight /= 2;
  }

  const tileXFirst = Math.floor(xCoord / TILE_DIMENSION);
  const tileYFirst = Math.floor(yCoord / TILE_DIMENSION);
  const xOffset = xCoord % TILE_DIMENSION;
  const yOffset = yCoord % TILE_DIMENSION;

  let tileXLast = Math.trunc((xCoord + singleImageWidth) / TILE_DIMENSION);
  let tileYLast = Math.trunc((yCoord + singleImageHeight) / TILE_DIMENSION);

  if ((xCoord + singleImageWidth) % TILE_DIMENSION !== 0) {
    tileXLast += 1;
  }

  if ((yCoord + singleImageHeight) % TILE_DIMENSION !== 0) {
    tileYLast += 1;
  }

  const xRange = tileXLast - tileXFirst;
  const yRange = tileYLast - tileYFirst;

  const rows: PreviewRow[] = [];
  for (let row = 0; row < yRange; row += 1) {
    const images: string[] = [];
    for (let column = 0; column < xRange; column += 1) {
      images.push(
        tileXYToQuadKey(tileXFirst + column, tileYFirst + row, zoom)
      );
    }
    rows.push({
      images,
      width: xRange * TILE_DIMENSION,
    });
  }

  const baseOffsetLeft = Math.trunc(xOffset);
  const baseOffsetTop = Math.trunc(yOffset);

  return {
    width: Math.max(1, Math.trunc(singleImageWidth)),
    height: Math.max(1, Math.trunc(singleImageHeight)),
    layers: [
      {
        left: baseOffsetLeft,
        top: baseOffsetTop,
        rows,
      },
      {
        left: baseOffsetLeft + PREVIEW_OFFSET_SHADOW,
        top: baseOffsetTop + PREVIEW_OFFSET_SHADOW,
        rows,
      },
    ],
  };
}

export function buildPreviewTile(
  imageId: number,
  palettesByImageId: Map<number, Rgb[]>,
  zoom: number
): PreviewTile {
  const normalizedId = clampImageId(imageId);
  const palette = [...(palettesByImageId.get(normalizedId) ?? DEFAULT_PALETTE)];

  while (palette.length < 7) {
    palette.push(palette[palette.length - 1] ?? DEFAULT_PALETTE[0]);
  }

  const previewLayout = getTilePreviewLayout(normalizedId, zoom);

  return {
    id: normalizedId,
    palette: palette.slice(0, 7),
    width: previewLayout.width,
    height: previewLayout.height,
    layers: previewLayout.layers,
  };
}
