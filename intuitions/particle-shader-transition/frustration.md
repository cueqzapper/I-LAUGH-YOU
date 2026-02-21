# Frustration — Bug-Magnet Map

## Recurring Issues & Guardrails

1. **Particle positions look wrong after assembly** — Usually caused by missing `geom.center()` or wrong scale factor. The original applies center+scale(0.5) every frame AFTER updating positions. **Guardrail:** Verify that the assembled particle image matches the OpenSeadragon image size and position.

2. **Particles render as squares instead of image tiles** — Shader not compiled or texture not loaded. **Guardrail:** Check shader compilation errors in console. Verify texture URL resolves. Check that `onBeforeCompile` actually runs (it only runs on first render).

3. **Scroll animation feels wrong** — The non-linear scroll curve `(scrollTop*6000+5000)/(scrollTop+2000)` is critical. Using raw scrollTop gives a completely different feel. **Guardrail:** Always apply the curve transformation before feeding into getTween.

4. **OpenSeadragon visible behind particles** — If opacity isn't set to 0 on the OpenSeadragon canvas, it shows through transparent areas of the particle render. **Guardrail:** Set `.openseadragon-canvas { opacity: 0 }` by default, switch to 1 only when particles are hidden.

5. **Particle tile UV mapping off-by-one** — The `whIndex` attribute maps each particle to its grid position. If the iteration order doesn't match the UV expectation, tiles show wrong image regions. **Guardrail:** The outer loop is x (columns 0..82), inner loop is y (rows 0..72). `whIndex` is `[x, y]` for each particle.

Last updated: 2026-02-14
