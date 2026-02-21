# Gotchas — Fail-Fast Radar

## Pitfalls & Prevention

1. **Grid dimensions are swapped between particles.js and helpers.js** — In the original code, `particles.js` uses `rowCount=83, columnCount=73` (AMOUNTX=83, AMOUNTY=73) while `helpers.js` uses `rowCount=73, columnCount=83`. The particle grid iterates 83×73=6059 points, but the image grid for tile extraction is 73 rows × 83 columns. **Prevention:** Use consistent naming: `gridCols=83, gridRows=73` everywhere. The outer loop is columns (x), inner loop is rows (y).

2. **geom.center() + geom.scale(0.5,0.5,0.5) called EVERY FRAME** — The original code re-centers and re-scales the geometry after every position update. This is because position updates write absolute coordinates (random → grid interpolation), and centering/scaling normalizes the cloud. **Prevention:** In our R3F version, handle this in the vertex shader or apply once, not per-frame. Alternatively, pre-center the grid positions and use relative offsets.

3. **The 0.75 x-spacing creates non-square tiles** — `points.push(new THREE.Vector3(x*0.75, y, 1))` makes each tile wider than tall. The fragment shader compensates: `pUv.x = (pUv.x - 0.5) / 0.75 + 0.5`. If this factor is wrong, tiles will show the wrong portion of the image. **Prevention:** Keep the 0.75 factor consistent in both position generation and UV correction.

4. **scrollEnd depends on OpenSeadragon canvas position** — `scrollEnd = $('.openseadragon-canvas').offset().top - offsetTopAnim`. If the canvas hasn't rendered yet when this is calculated, scrollEnd will be wrong. **Prevention:** Recalculate on scroll and resize, as the original does.

5. **Scroll curve is non-linear** — `newScrollTop = (scrollTop*6000+5000)/(scrollTop+2000)` is a rational function, not linear. This makes particles rush together fast initially, then slow down for fine positioning. Changing the constants changes the feel dramatically. **Prevention:** Plot and test any changes to this curve.

6. **OpenSeadragon zoom must match particle image size exactly** — The zoom level is calculated as `threeJsWidth / viewer.element.clientWidth` where `threeJsHeight = windowHeight * 0.6`. If these don't match, there's a visible jump on transition. **Prevention:** Compute the match dynamically on every scroll event.

Last updated: 2026-02-14
