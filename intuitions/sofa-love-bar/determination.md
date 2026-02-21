# Determination — Non-Negotiable Design Principles

- Sofa placements are persisted in the same localStorage key as likes/basket — single source of truth
- Drag & drop uses native HTML5 API (dataTransfer) — no external library
- PieceThumbnail reuses the exact same tile-server quad-key rendering as the main preview — visual consistency guaranteed
- Unliking an image auto-clears its sofa placement — no orphaned references

Last updated: 2026-02-17
