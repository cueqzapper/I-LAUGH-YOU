# Fear — Catastrophe List

## Worst-Case Scenarios & Protective Mechanisms

1. **WebGL context lost on mobile** — Mobile browsers aggressively reclaim GPU memory. **Protection:** Listen for `webglcontextlost` / `webglcontextrestored` events; show a graceful fallback or re-initialize the scene.

2. **Infinite re-renders killing frame rate** — React state changes triggering Three.js scene rebuilds every frame. **Protection:** Separate React UI state from the Three.js render loop. Use `useFrame` (R3F) for animation, not `setState`. Memoize expensive components.

3. **Firebase quota exhaustion** — Firestore reads/writes spiraling due to unthrottled listeners or missing pagination. **Protection:** Use `onSnapshot` with care, implement debouncing, set Firestore security rules with rate limits, monitor usage in Firebase console.

4. **Bundle size explosion** — Three.js + Firebase + React = potentially 500KB+ gzipped. **Protection:** Code-split aggressively. Lazy-load the 3D scene. Use `next/dynamic`. Analyze bundle with `@next/bundle-analyzer`.

5. **SEO invisible content** — All meaningful content rendered in Three.js canvas is invisible to crawlers. **Protection:** Render textual content as HTML sections alongside or overlaying the 3D canvas. Use semantic HTML + metadata.

6. **Data loss from missing Firestore rules** — Default open rules in dev accidentally deployed to production. **Protection:** Write and test security rules before first deploy. Use Firebase emulator for local dev.

Last updated: 2026-02-14
