# Gotchas — Fail-Fast Radar

- Drag events bubble: `onDragLeave` fires when entering a child element inside the drop zone. Prevention: check `relatedTarget` containment before clearing `dragOverSlot`
- `dataTransfer.getData()` returns empty string in `dragOver` (security restriction) — only read in `onDrop`
- Tile rendering at low zoom (< 9) produces sub-pixel images that are invisible. Use zoom 9 for thumbnails
- `Set<number>` can't be JSON-serialized directly — convert to array for localStorage

Last updated: 2026-02-17
