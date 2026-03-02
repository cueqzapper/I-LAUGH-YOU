"use client";

import { useMemo } from "react";
import { getTilePreviewLayout, TILE_DIMENSION } from "@/lib/tile-utils";

interface CartPieceImageProps {
  imageId: number;
  displayWidth: number;
  zoom?: number;
}

export default function CartPieceImage({ imageId, displayWidth, zoom = 10 }: CartPieceImageProps) {
  const layout = useMemo(() => getTilePreviewLayout(imageId, zoom), [imageId, zoom]);
  const displayHeight = Math.round(displayWidth * layout.height / layout.width);
  const scale = displayWidth / layout.width;

  return (
    <div
      style={{
        width: displayWidth,
        height: displayHeight,
        overflow: "hidden",
        position: "relative",
        background: "#333",
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            width: layout.width,
            height: layout.height,
          }}
        >
          {layout.layers.map((layer, layerIndex) => (
            <div
              key={layerIndex}
              style={{
                position: "absolute",
                left: `-${layer.left}px`,
                top: `-${layer.top}px`,
              }}
            >
              {layer.rows.map((row, rowIndex) => (
                <div
                  key={rowIndex}
                  style={{
                    height: TILE_DIMENSION,
                    width: row.width,
                    lineHeight: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  {row.images.map((src, imgIndex) => (
                    <img
                      key={imgIndex}
                      src={src}
                      height={TILE_DIMENSION}
                      width={TILE_DIMENSION}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      style={{ display: "inline-block", verticalAlign: "top" }}
                    />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
