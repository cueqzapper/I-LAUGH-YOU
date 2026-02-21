# Fear — Catastrophe List

## Worst-Case Scenarios & Protective Mechanisms

1. **Visible seam on particle→OpenSeadragon transition** — If particle assembly position doesn't align with OpenSeadragon zoom, there's a jarring jump. **Protection:** Calculate zoom match on every scroll frame. Use same image dimensions and aspect ratio for both systems.

2. **6059 CPU position updates per frame = jank** — Updating 6059×3 floats per frame on CPU is ~72K operations. On low-end devices this causes frame drops. **Protection:** Move position interpolation to vertex shader (GPU). Pass scroll progress as a uniform. Keep random positions and grid positions as attributes.

3. **Texture not loaded when particles start rendering** — If `full2.jpg` hasn't loaded, particles render black. **Protection:** Show loading state until texture is confirmed loaded. The original uses `checkLoaded()` polling.

4. **Memory leak from BufferGeometry not disposed** — If the particle scene mounts/unmounts (e.g., during fullpage transitions), geometry/material/texture can leak. **Protection:** Dispose in cleanup. R3F handles some automatically, but custom shaders need manual disposal.

5. **OpenSeadragon tile server CORS failure** — The original tile server (`ily.seez.ch`) doesn't support CORS. **Protection:** Already handled — we use local fallback image. But if tiles are needed for deep zoom, we need a CORS proxy or self-hosted tiles.

Last updated: 2026-02-14
