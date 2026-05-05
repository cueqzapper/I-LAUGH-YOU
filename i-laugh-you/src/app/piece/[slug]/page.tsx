import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import {
  getPieceSessionCookieName,
  verifyPieceSessionToken,
} from "@/lib/piece-auth";
import { getPieceSiteBySlug, listSoldImageIds } from "@/lib/sqlite";
import { PIECE_COLUMNS } from "@/lib/piece-config";
import PieceClient, { type PieceNoticeCode } from "./PieceClient";

const TILE_SERVER_BASE_URL = "https://ily.seez.ch/";
const TILE_DIMENSION = 256;
const MAX_ZOOM_LEVEL = 11;
const PREVIEW_ZOOM = 10;

const SOURCE_IMAGE_WIDTH = 337920;
const SOURCE_IMAGE_HEIGHT = 396288;
const SOURCE_OFFSETS = {
  top: 3873,
  right: 3083,
  bottom: 1573,
  left: 1509,
};
const PIECE_ROWS = 146;
const FINAL_IMAGE_WIDTH =
  (SOURCE_IMAGE_WIDTH - SOURCE_OFFSETS.right - SOURCE_OFFSETS.left) / PIECE_COLUMNS;
const FINAL_IMAGE_HEIGHT =
  (SOURCE_IMAGE_HEIGHT - SOURCE_OFFSETS.top - SOURCE_OFFSETS.bottom) / PIECE_ROWS;
const PREVIEW_OFFSET_SHADOW = 4;

interface PreviewRow {
  images: string[];
  width: number;
}

interface PreviewLayer {
  left: number;
  top: number;
  rows: PreviewRow[];
}

interface PreviewLayout {
  width: number;
  height: number;
  layers: PreviewLayer[];
}

function tileXYToQuadKey(
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
        )}/`;
      }
    }
  } else {
    for (let i = 1; i < levelOfDetail; i += 1) {
      if (i % 2 !== 0) {
        dirname += `${quadKey.substring(
          0,
          quadKey.length - (levelOfDetail - i) * 2 + 1
        )}/`;
      }
    }
  }

  return `${dirname}${quadKey}.jpg`;
}

function getPiecePreviewLayout(imageId: number): PreviewLayout {
  const normalizedId = Math.max(1, imageId) - 1;
  const zoom = PREVIEW_ZOOM;

  let yCoord =
    Math.floor(normalizedId / PIECE_COLUMNS) * FINAL_IMAGE_HEIGHT +
    SOURCE_OFFSETS.top;
  let xCoord =
    (normalizedId % PIECE_COLUMNS) * FINAL_IMAGE_WIDTH + SOURCE_OFFSETS.left;
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

type SearchParams = Record<string, string | string[] | undefined>;

function getSingleValue(value: string | string[] | undefined) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    return value[0];
  }

  return undefined;
}

function getNoticeCode(searchParams: SearchParams): PieceNoticeCode | null {
  const errorCode = getSingleValue(searchParams.error);
  const statusCode = getSingleValue(searchParams.status);

  if (errorCode === "invalid_credentials") return "invalid_credentials";
  if (errorCode === "unauthorized") return "unauthorized";
  if (errorCode === "invalid_input") return "invalid_input";
  if (statusCode === "updated") return "updated";
  if (statusCode === "logged_out") return "logged_out";

  return null;
}

export default async function PiecePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }> | { slug: string };
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = (await searchParams) ?? {};

  const site = getPieceSiteBySlug(resolvedParams.slug);

  if (!site) {
    notFound();
  }

  const soldImageIds = listSoldImageIds();
  const isSold = soldImageIds.includes(site.image_id);
  const pieceLayout = getPiecePreviewLayout(site.image_id);

  const cookieStore = await cookies();
  const ownerCookieName = getPieceSessionCookieName(site.image_id);
  const ownerToken = cookieStore.get(ownerCookieName)?.value;
  const isOwner = verifyPieceSessionToken(ownerToken, site.image_id);
  const noticeCode = getNoticeCode(resolvedSearchParams);
  const actionPrefix = `/api/pieces/${encodeURIComponent(site.slug)}`;

  const pieceRow = Math.floor((site.image_id - 1) / PIECE_COLUMNS) + 1;
  const pieceCol = ((site.image_id - 1) % PIECE_COLUMNS) + 1;

  return (
    <PieceClient
      site={{
        image_id: site.image_id,
        slug: site.slug,
        title: site.title,
        description: site.description,
        link_url: site.link_url,
        link_label: site.link_label,
      }}
      isSold={isSold}
      isOwner={isOwner}
      pieceLayout={pieceLayout}
      pieceRow={pieceRow}
      pieceCol={pieceCol}
      noticeCode={noticeCode}
      actionPrefix={actionPrefix}
    />
  );
}
