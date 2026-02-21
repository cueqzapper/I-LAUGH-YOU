"use client";

import { useMemo } from "react";
import {
  type Rgb,
  TILE_DIMENSION,
  buildPreviewTile,
} from "@/lib/tile-utils";

interface PieceThumbnailProps {
  imageId: number;
  zoom: number;
  width: number;
  height: number;
  palettesByImageId: Map<number, Rgb[]>;
}

export default function PieceThumbnail({
  imageId,
  zoom,
  width,
  height,
  palettesByImageId,
}: PieceThumbnailProps) {
  const tile = useMemo(
    () => buildPreviewTile(imageId, palettesByImageId, zoom),
    [imageId, palettesByImageId, zoom]
  );

  const scaleX = width / tile.width;
  const scaleY = height / tile.height;
  const scale = Math.min(scaleX, scaleY);

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: `${tile.width}px`,
          height: `${tile.height}px`,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {tile.layers.map((layer, layerIndex) => (
          <div
            key={`thumb-${imageId}-layer-${layerIndex}`}
            style={{
              position: "absolute",
              left: `-${layer.left}px`,
              top: `-${layer.top}px`,
            }}
          >
            {layer.rows.map((row, rowIndex) => (
              <div
                key={`thumb-${imageId}-layer-${layerIndex}-row-${rowIndex}`}
                style={{
                  height: `${TILE_DIMENSION}px`,
                  width: `${row.width}px`,
                  display: "flex",
                }}
              >
                {row.images.map((src, imgIndex) => (
                  <img
                    key={`thumb-${imageId}-${layerIndex}-${rowIndex}-${imgIndex}`}
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
    </div>
  );
}
