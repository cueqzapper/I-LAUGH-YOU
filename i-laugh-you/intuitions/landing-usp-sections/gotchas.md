# Gotchas - Landing USP Sections

## Known Pitfalls

### Scroll Snapping and currentSectionRef
- The fullpage scroll system tracks which section is active via `currentSectionRef`. Animation triggers (e.g., `whileInView` or manual intersection observers) must not set state that causes re-renders interfering with the scroll logic. If the scroll handler and an animation both update state in the same frame, the snap can jump to the wrong section.
- Do NOT add `scroll-snap-align` or `scroll-snap-type` overrides in component-level CSS. The scroll snapping is managed globally.

### SSR and framer-motion
- framer-motion components that use browser APIs (e.g., `useMotionValueEvent`, `useScroll`) will break SSR. The relevant components are already dynamically imported with `next/dynamic` and `ssr: false`. Keep it that way. If adding new animated wrapper components, they must also be dynamic-imported or guarded with `typeof window !== 'undefined'`.

### External SVG Images
- The USP sections reference SVG images hosted on `i-laugh-you.com`. These are external URLs, not local assets. This means:
  - No Webpack/Next.js image optimization applies.
  - `next/image` requires the domain in `next.config.js` `images.remotePatterns` (verify this is configured).
  - If using `<img>` tags instead, ensure `loading="lazy"` and explicit `width`/`height` to prevent CLS.
  - CORS headers must allow embedding. If SVGs are used as `background-image` in CSS, CORS is not an issue, but inline `<object>` or `<use>` tags will fail without proper headers.

### Framer-motion Variants and Key Prop
- If the USP sections unmount/remount (e.g., due to conditional rendering or route changes), framer-motion variants will replay. Ensure `key` props are stable so animations do not re-trigger unexpectedly on unrelated state changes.

### Z-Index Collisions
- The particle scene (Three.js / canvas) runs behind the content. If USP section elements are given `position: relative` or `position: absolute` without explicit `z-index`, they may render behind the particle canvas. Always set `z-index` deliberately on animated USP elements.

### Animation State Must Use Functional Updates
- The `setUspAnimated` call in the scroll handler must use the functional form `(prev) => ...` with an early return if the section is already animated. Without this, every scroll event would create a new object reference and trigger unnecessary re-renders.

### Section Index Mapping
- The scroll handler's `currentSection` is 0-indexed based on scroll position. USP sections are sections 2, 3, 4 (0=hero, 1=title, 2=usp1, 3=usp2, 4=usp3, 5=fullImage). Getting this mapping wrong means animations fire on the wrong section.

Last updated: 2026-02-16
