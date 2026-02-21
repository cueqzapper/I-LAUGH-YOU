# Curiosity — Exploration Backlog

## Open Questions

1. **Can we move position interpolation entirely to GPU?** — Currently CPU updates 6059×3 floats per frame. If we pass `randomPosition` and `gridPosition` as attributes plus `scrollProgress` as uniform, the vertex shader does all interpolation. **Verify:** Benchmark GPU-only vs CPU approach. Our current R3F implementation already does some of this.

2. **What's the ideal scroll curve for fullpage snapping?** — The original uses `(scrollTop*6000+5000)/(scrollTop+2000)` with continuous scroll. With fullpage snapping, scroll jumps in 100vh increments. How does the curve behave with discrete jumps? **Verify:** Plot the curve, test with snap positions as inputs.

3. **Can we use a single draw call for both scattered and assembled states?** — Yes, the original does this. One Points object, one shader, positions updated per frame. No separate meshes for different states.

4. **How to handle the OpenSeadragon zoom-match on resize?** — Original recalculates on every scroll event. With R3F, we need to sync the Three.js camera FOV/position with the OpenSeadragon viewport. **Verify:** Test resize behavior.

5. **Is the 0.75 x-spacing factor correct for our image aspect ratio?** — The original image is 337920×396288 (ratio ≈ 0.853). The grid is 83 cols × 73 rows. Each tile: `(337920-1509-3083)/83 ≈ 4016px` wide, `(396288-3873-1573)/73 ≈ 5354px` tall. Ratio ≈ 0.75. So the 0.75 factor compensates for the tile aspect ratio. **Verify:** Confirm with our actual image dimensions.

Last updated: 2026-02-14
