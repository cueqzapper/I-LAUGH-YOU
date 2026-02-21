# Determination — Non-Negotiable Design Principles

## Core Commitments

1. **Particles ARE the image** — Each of the 6059 particles renders a unique rectangular piece of `full2.jpg` via a custom fragment shader. When assembled in grid formation, they form the complete portrait. This is not a visual trick — it's the actual image, split across GPU-rendered point sprites.

2. **Scroll drives the animation, not time** — Particle positions interpolate between random (scattered) and grid (assembled) based purely on scroll progress. Time-based animation (cos/sin wobble) only adds subtle floating and diminishes to zero as scroll approaches the assembly point.

3. **The transition to OpenSeadragon must be seamless** — When particles fully assemble, they must be pixel-aligned with the hidden OpenSeadragon viewer underneath. The switch is: hide particle canvas → reveal OpenSeadragon (already pre-zoomed to match). No visible jump.

4. **OpenSeadragon is always loaded and pre-positioned** — While particles are visible, OpenSeadragon runs underneath at opacity:0, continuously zoom-matched to the particle image size. This enables instant, seamless swap.

5. **CPU position updates with GPU texture sampling** — Position interpolation happens on CPU (updating BufferGeometry positions per frame). Texture mapping happens on GPU (fragment shader samples the correct tile from the full texture per particle).

Last updated: 2026-02-14
