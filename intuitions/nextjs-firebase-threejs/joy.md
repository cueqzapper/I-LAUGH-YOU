# Joy — Proven Wins Log

## What Actually Worked

*This file will be populated as we build and discover what works well.*

1. **R3F + Next.js dynamic import** — Confirmed pattern: `dynamic(() => import('./Scene'), { ssr: false })` cleanly separates 3D from SSR.

2. **Firebase modular SDK** — Tree-shaking works well, keeping only used features in the bundle.

3. **Drei helpers** — `@react-three/drei` provides battle-tested components (OrbitControls, Environment, Html overlay) that save significant dev time.

4. **Fullpage onLeave-style visibility swap** — Matching the original WP pattern (swap in wheel handler before `scrollTo`, not in scroll handler during animation) eliminates the blink. Direct DOM `display` toggle for particles + direct `.openseadragon-canvas` opacity toggle = zero-frame-gap swap. OSD `preload: true` + continuous zoom-matching while hidden ensures the image is ready at the exact right zoom/pan when revealed.

Last updated: 2026-02-14
