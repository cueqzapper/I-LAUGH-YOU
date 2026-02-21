"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

interface ImageVariant {
  id: number;
  article_id: number;
  file_path: string;
  alt_text: string;
  prompt: string | null;
  position: number;
  status: string;
  is_selected: number;
  created_at: string;
}

interface ImageSet {
  articleId: number;
  articleTitle: string;
  articleSlug: string;
  articleHeroImage: string | null;
  position: number;
  variants: ImageVariant[];
}

export default function ImageCheckGallery() {
  const [open, setOpen] = useState(false);
  const [sets, setSets] = useState<ImageSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [setIndex, setSetIndex] = useState(0);
  const [variantIndex, setVariantIndex] = useState(0);
  const [filter, setFilter] = useState<"all" | "failed">("all");
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);

  const fetchSets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/blog/images/check");
      const data = await res.json();
      if (res.ok && data.sets) {
        setSets(data.sets);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchSets();
      setSetIndex(0);
      setVariantIndex(0);
      setFilter("all");
    }
  }, [open, fetchSets]);

  const filteredSets =
    filter === "failed"
      ? sets.filter((s) => s.variants.some((v) => v.status === "failed"))
      : sets;

  const currentSet = filteredSets[setIndex] ?? null;
  const currentVariant = currentSet?.variants[variantIndex] ?? null;

  // Reset variant index when set changes
  useEffect(() => {
    setVariantIndex(0);
  }, [setIndex]);

  // Clamp indices when filter changes
  useEffect(() => {
    if (setIndex >= filteredSets.length) {
      setSetIndex(Math.max(0, filteredSets.length - 1));
    }
  }, [filteredSets.length, setIndex]);

  const handleFail = useCallback(async () => {
    if (!currentSet) return;
    setActionStatus("Marking failed...");
    try {
      await fetch("/api/blog/images/fail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: currentSet.articleId,
          position: currentSet.position,
        }),
      });
      await fetchSets();
      setActionStatus("Marked as failed");
    } catch {
      setActionStatus("Failed to mark");
    }
    setTimeout(() => setActionStatus(null), 1500);
  }, [currentSet, fetchSets]);

  const handleRegenerate = useCallback(async () => {
    if (!currentVariant) return;
    setActionStatus("Generating new variant...");
    try {
      const res = await fetch("/api/blog/images/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: currentVariant.id }),
      });
      if (res.ok) {
        await fetchSets();
        setActionStatus("New variant generated!");
      } else {
        const data = await res.json();
        setActionStatus(data.error || "Regeneration failed");
      }
    } catch {
      setActionStatus("Regeneration failed");
    }
    setTimeout(() => setActionStatus(null), 3000);
  }, [currentVariant, fetchSets]);

  const handleSelect = useCallback(async () => {
    if (!currentVariant || !currentSet) return;
    setActionStatus("Selecting variant...");

    // Find the canonical path (first/original variant = lowest id)
    const sorted = [...currentSet.variants].sort((a, b) => a.id - b.id);
    const canonicalPath = sorted[0]?.file_path ?? currentVariant.file_path;

    try {
      await fetch("/api/blog/images/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageId: currentVariant.id,
          articleId: currentSet.articleId,
          position: currentSet.position,
          canonicalPath,
        }),
      });
      await fetchSets();
      setActionStatus("Variant selected!");
    } catch {
      setActionStatus("Selection failed");
    }
    setTimeout(() => setActionStatus(null), 1500);
  }, [currentVariant, currentSet, fetchSets]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;

      // Ignore if focus is on an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      switch (e.key) {
        case "Escape":
          setOpen(false);
          break;
        case "ArrowLeft":
          e.preventDefault();
          setSetIndex((i) => Math.max(0, i - 1));
          break;
        case "ArrowRight":
          e.preventDefault();
          setSetIndex((i) => Math.min(filteredSets.length - 1, i + 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setVariantIndex((i) => Math.max(0, i - 1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setVariantIndex((i) =>
            currentSet ? Math.min(currentSet.variants.length - 1, i + 1) : i
          );
          break;
        case "f":
        case "F":
          e.preventDefault();
          handleFail();
          break;
        case "g":
        case "G":
          e.preventDefault();
          handleRegenerate();
          break;
        case "s":
        case "S":
          e.preventDefault();
          handleSelect();
          break;
        case "Tab":
          e.preventDefault();
          setFilter((f) => (f === "all" ? "failed" : "all"));
          break;
      }
    },
    [open, filteredSets.length, currentSet, handleFail, handleRegenerate, handleSelect]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Create portal container
  useEffect(() => {
    if (!portalRef.current) {
      const el = document.createElement("div");
      el.id = "image-check-gallery-portal";
      document.body.appendChild(el);
      portalRef.current = el;
    }
    return () => {
      if (portalRef.current) {
        document.body.removeChild(portalRef.current);
        portalRef.current = null;
      }
    };
  }, []);

  const overlay = open && portalRef.current ? createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999999,
        background: "rgba(0,0,0,0.95)",
        display: "flex",
        flexDirection: "column",
        color: "#e4e4e7",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Image Check</span>
          <span style={{ color: "#71717a", fontSize: "0.85rem" }}>
            {filteredSets.length} image sets
            {filter === "failed" && " (failed only)"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setFilter((f) => (f === "all" ? "failed" : "all"))}
            style={{
              background: filter === "failed" ? "rgba(239,68,68,0.2)" : "rgba(113,113,122,0.2)",
              border: `1px solid ${filter === "failed" ? "rgba(239,68,68,0.4)" : "rgba(113,113,122,0.3)"}`,
              color: filter === "failed" ? "#fca5a5" : "#a1a1aa",
              padding: "4px 12px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            {filter === "all" ? "All" : "Failed Only"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              background: "none",
              border: "none",
              color: "#71717a",
              fontSize: "1.5rem",
              cursor: "pointer",
              padding: "0 4px",
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>
      </div>

      {/* Center content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {loading ? (
          <div style={{ color: "#71717a" }}>Loading images...</div>
        ) : !currentSet ? (
          <div style={{ color: "#71717a" }}>
            {filter === "failed" ? "No failed images found" : "No images found"}
          </div>
        ) : (
          <>
            {/* Set counter */}
            <div
              style={{
                position: "absolute",
                top: 20,
                left: 20,
                fontSize: "0.8rem",
                color: "#71717a",
              }}
            >
              Set {setIndex + 1} / {filteredSets.length}
            </div>

            {/* Article info */}
            <div
              style={{
                textAlign: "center",
                marginBottom: 12,
                maxWidth: 600,
              }}
            >
              <div style={{ fontSize: "0.85rem", color: "#a1a1aa", marginBottom: 4 }}>
                {currentSet.articleTitle}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#52525b" }}>
                Position: {currentSet.position === 0 ? "Hero" : `Inline #${currentSet.position}`}
                {" | "}
                {currentSet.variants.length} variant{currentSet.variants.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Image */}
            <div
              style={{
                position: "relative",
                maxHeight: "calc(100vh - 280px)",
                maxWidth: "calc(100vw - 80px)",
              }}
            >
              {currentVariant && (
                <>
                  <img
                    src={currentVariant.file_path}
                    alt={currentVariant.alt_text}
                    style={{
                      maxHeight: "calc(100vh - 280px)",
                      maxWidth: "calc(100vw - 80px)",
                      objectFit: "contain",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  />

                  {/* Badges */}
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      display: "flex",
                      gap: 6,
                    }}
                  >
                    {currentVariant.status === "failed" && (
                      <span
                        style={{
                          background: "rgba(239,68,68,0.9)",
                          color: "#fff",
                          padding: "4px 10px",
                          borderRadius: 4,
                          fontSize: "0.75rem",
                          fontWeight: 700,
                        }}
                      >
                        FAILED
                      </span>
                    )}
                    {currentVariant.is_selected === 1 && (
                      <span
                        style={{
                          background: "rgba(34,197,94,0.9)",
                          color: "#fff",
                          padding: "4px 10px",
                          borderRadius: 4,
                          fontSize: "0.75rem",
                          fontWeight: 700,
                        }}
                      >
                        SELECTED
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Variant dots */}
            {currentSet.variants.length > 1 && (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginTop: 12,
                  alignItems: "center",
                }}
              >
                {currentSet.variants.map((v, i) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVariantIndex(i)}
                    style={{
                      width: i === variantIndex ? 12 : 8,
                      height: i === variantIndex ? 12 : 8,
                      borderRadius: "50%",
                      border: "none",
                      cursor: "pointer",
                      background:
                        v.status === "failed"
                          ? "#ef4444"
                          : v.is_selected === 1
                            ? "#22c55e"
                            : i === variantIndex
                              ? "#e4e4e7"
                              : "#52525b",
                      transition: "all 0.15s",
                    }}
                    title={`Variant ${i + 1} (id: ${v.id})`}
                  />
                ))}
              </div>
            )}

            {/* Action status */}
            {actionStatus && (
              <div
                style={{
                  marginTop: 12,
                  padding: "6px 16px",
                  background: "rgba(113,113,122,0.2)",
                  borderRadius: 6,
                  fontSize: "0.8rem",
                  color: "#a1a1aa",
                }}
              >
                {actionStatus}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom: keyboard legend */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 20,
          padding: "10px 20px",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        {[
          ["←→", "Navigate sets"],
          ["↑↓", "Variants"],
          ["F", "Mark failed"],
          ["G", "Regenerate"],
          ["S", "Select"],
          ["Tab", "Filter"],
          ["Esc", "Close"],
        ].map(([key, label]) => (
          <div
            key={key}
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              fontSize: "0.75rem",
            }}
          >
            <kbd
              style={{
                background: "rgba(255,255,255,0.1)",
                padding: "2px 8px",
                borderRadius: 4,
                fontSize: "0.7rem",
                fontFamily: "monospace",
                color: "#d4d4d8",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              {key}
            </kbd>
            <span style={{ color: "#71717a" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>,
    portalRef.current
  ) : null;

  return (
    <>
      <button
        type="button"
        className="admin-btn"
        onClick={() => setOpen(true)}
        style={{
          background: "rgba(113,113,122,0.2)",
          color: "#a1a1aa",
          border: "1px solid rgba(113,113,122,0.3)",
          padding: "6px 14px",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: "0.85rem",
        }}
      >
        Check Images
      </button>
      {overlay}
    </>
  );
}
