import { PIECE_COLUMNS, PIECE_ROWS, TOTAL_PIECES } from "@/lib/piece-config";

const TILE_SERVER_BASE_URL = "https://ily.seez.ch/";
const TILE_DIMENSION = 256;
const MAX_ZOOM_LEVEL = 11;

const SOURCE_IMAGE_WIDTH = 337920;
const SOURCE_IMAGE_HEIGHT = 396288;
const SOURCE_OFFSETS = { top: 3873, right: 3083, bottom: 1573, left: 1509 };
const FINAL_IMAGE_WIDTH =
  (SOURCE_IMAGE_WIDTH - SOURCE_OFFSETS.right - SOURCE_OFFSETS.left) / PIECE_COLUMNS;
const FINAL_IMAGE_HEIGHT =
  (SOURCE_IMAGE_HEIGHT - SOURCE_OFFSETS.top - SOURCE_OFFSETS.bottom) / PIECE_ROWS;

function tileXYToQuadKey(tileX: number, tileY: number, zoom: number): string {
  let quadKey = "q";
  for (let i = zoom; i > 0; i--) {
    let digit = 0;
    const mask = 1 << (i - 1);
    if ((tileX & mask) !== 0) digit += 1;
    if ((tileY & mask) !== 0) digit += 2;
    quadKey += `t${digit}`;
  }

  let dirname = TILE_SERVER_BASE_URL;
  if (zoom % 2 === 0) {
    for (let i = 1; i < zoom + 1; i++) {
      if (i % 2 === 0) {
        dirname += `${quadKey.substring(0, quadKey.length - (zoom - i) * 2 - 1)}\\`;
      }
    }
  } else {
    for (let i = 1; i < zoom; i++) {
      if (i % 2 !== 0) {
        dirname += `${quadKey.substring(0, quadKey.length - (zoom - i) * 2 + 1)}\\`;
      }
    }
  }

  return `${dirname}${quadKey}.jpg`;
}

/**
 * Returns a CDN URL for the primary tile representing this piece at max zoom.
 * Used for email previews and other contexts where a single image per piece is needed.
 */
export function getPieceImageUrl(imageId: number): string {
  if (!Number.isInteger(imageId) || imageId < 1 || imageId > TOTAL_PIECES) {
    return "";
  }
  const normalizedId = imageId - 1;
  const yCoord = Math.floor(normalizedId / PIECE_COLUMNS) * FINAL_IMAGE_HEIGHT + SOURCE_OFFSETS.top;
  const xCoord = (normalizedId % PIECE_COLUMNS) * FINAL_IMAGE_WIDTH + SOURCE_OFFSETS.left;
  const tileX = Math.floor(xCoord / TILE_DIMENSION);
  const tileY = Math.floor(yCoord / TILE_DIMENSION);
  return tileXYToQuadKey(tileX, tileY, MAX_ZOOM_LEVEL);
}
