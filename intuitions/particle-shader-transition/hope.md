# Hope — Success Picture

## What "Working" Means

1. **Particles scatter on load** — On page load, 6059 particles are randomly distributed in a sphere (radius 400). Each shows its unique piece of the portrait. Subtle cos/sin wobble animates them.

2. **Scroll assembles the image** — As user scrolls through sections 1-5, particles smoothly interpolate from random positions to grid positions. The non-linear scroll curve makes them rush together fast, then fine-tune.

3. **Assembled image matches OpenSeadragon** — At scroll completion, the particle image and the hidden OpenSeadragon viewer show the SAME image at the SAME size and position. No visible difference.

4. **Seamless swap on section 6** — When entering the fullImage section: particle canvas hides, OpenSeadragon canvas reveals. User sees no change — just gains the ability to zoom/pan into individual tiles.

5. **Reverse works too** — Scrolling back up from fullImage: OpenSeadragon hides, particles show (already in assembled position), then scatter as user scrolls up.

6. **60fps on desktop** — Position updates don't cause frame drops. GPU handles texture sampling. No visible jank during scroll animation.

Last updated: 2026-02-14
