# Determination - Landing USP Sections

## Non-Negotiables

### Scroll Snapping Compatibility
- All animations MUST work within the existing custom fullpage scroll-snapping system. This is a hand-rolled implementation, not a library like fullPage.js. Animations trigger on section enter but must never fight the snap behavior.

### Animation Runtime
- framer-motion is the animation engine. It is already a project dependency. No other animation libraries are to be introduced.
- No reverse reads from the DOM. All layout measurements, if needed, must go through React refs or framer-motion's layout system. Direct `getBoundingClientRect()` calls inside animation loops are forbidden to avoid forced reflows.

### Language
- All user-facing copy is in German. The three USP sections tell the story:
  1. An art student painted an oil self-portrait.
  2. She photographed the painting in pieces.
  3. She made 24,236 digital tiles available online.
- The German copywriting must be compelling, natural, and free of anglicisms. It should read like a short narrative, not marketing bullet points.

### Performance
- Animations must not cause layout shifts (CLS). All animated elements need explicit dimensions or reserved space.
- Target 60fps on mid-range devices. Heavy GPU compositing (transform, opacity) only -- no animating width, height, top, or left.

Last updated: 2026-02-16
