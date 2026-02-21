"use client";

import type { FrameColor } from "@/hooks/useCart";

const FRAME_OPTIONS: { color: FrameColor; hex: string; label: string }[] = [
  { color: "white", hex: "#FFFFFF", label: "White" },
  { color: "black", hex: "#000000", label: "Black" },
  { color: "natural", hex: "#C4A777", label: "Natural Wood" },
];

interface FrameColorPickerProps {
  selected: FrameColor;
  onChange: (color: FrameColor) => void;
  size?: number;
}

export default function FrameColorPicker({
  selected,
  onChange,
  size = 28,
}: FrameColorPickerProps) {
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      {FRAME_OPTIONS.map((option) => (
        <button
          key={option.color}
          type="button"
          title={option.label}
          onClick={() => onChange(option.color)}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: "50%",
            backgroundColor: option.hex,
            border: selected === option.color
              ? "3px solid rgba(255, 0, 105, 1)"
              : option.color === "white"
                ? "2px solid rgba(255,255,255,0.5)"
                : "2px solid rgba(255,255,255,0.2)",
            cursor: "pointer",
            padding: 0,
            transition: "border-color 0.2s ease",
          }}
        />
      ))}
    </div>
  );
}
