# Curiosity - Landing USP Sections

## Open Questions

### Does the Shining-Glow Image Need Animation?
- There is a "shining-glow" image (likely a radial glow or light effect SVG). Should this have its own subtle animation (pulse, slow scale, opacity breathe) to draw attention, or should it remain static to avoid visual noise?
- If animated, should it run continuously or only on section enter? A continuous subtle pulse could add life; an enter-only animation keeps things calmer.

### Should Animations Replay on Revisit?
- When a user scrolls past a USP section and then scrolls back to it, should the entrance animations replay? Options:
  - **Replay every time**: Feels dynamic but can be annoying on repeated navigation.
  - **Play once only**: Cleaner, but the section looks "already loaded" when revisited, losing some impact.
  - **Partial replay**: Only certain elements (e.g., the headline) re-animate, while others stay in their final state.
- framer-motion's `whileInView` with `once` prop controls this. What is the right UX choice here?

### How Much Copy Per Section?
- Is each USP section a headline + 1-2 sentences, or should there be more detailed text? The scroll-snap model means each section is a "slide" -- too much text makes it feel cramped, too little makes it feel empty.
- Should there be a visible call-to-action in the final USP section (e.g., a button to explore the tiles)?

### Mobile Interaction Model
- On mobile, fullpage scroll snapping can feel aggressive. Do the USP animations need different timing or reduced motion on small viewports to account for faster swipe-based navigation?

### Image Loading Strategy
- Should the external SVGs be preloaded in the `<head>` to avoid pop-in when the user reaches the section, or is lazy loading acceptable given the scroll-snap model guarantees the user will pause on each section?

Last updated: 2026-02-16
