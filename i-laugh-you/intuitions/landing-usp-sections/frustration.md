# Frustration - Landing USP Sections

## Common Pain Points

### CSS Specificity Conflicts with globals.css
- The project has a `globals.css` that likely sets base styles on headings, paragraphs, links, and containers. When styling USP section text or layout, component-scoped styles (CSS Modules or Tailwind) can be overridden by higher-specificity global selectors.
- Watch out for global resets that set `margin: 0` or `padding: 0` on elements you expect to have spacing. Also beware of global `font-size` or `line-height` rules that override the carefully chosen typography for the USP narrative.
- If using Tailwind alongside globals.css, the `@layer` directives matter. Tailwind utilities in the `utilities` layer will beat most global styles, but Tailwind `@apply` inside component CSS may not.

### Z-Index Stacking with Particles
- The particle canvas (likely a Three.js scene in a fixed/absolute container) occupies a specific stacking context. Adding `transform`, `opacity`, `will-change`, or `filter` to USP section elements creates new stacking contexts, which can unexpectedly reorder visual layers.
- Debugging z-index issues is tedious because the DevTools stacking context view is limited. The typical cycle: set z-index, reload, particles cover content, bump z-index, now something else breaks.

### Animation Timing Feels Wrong
- Getting stagger timing right for text reveal animations is subjective and requires iteration. Too fast feels rushed; too slow feels sluggish. On a snapped scroll page the user expects content to appear quickly because they "jumped" to the section intentionally.
- Different viewport sizes change the feel of timing. An animation that looks elegant on a 1440px monitor may feel agonizingly slow on a 375px phone where there is less content to reveal.

### Inconsistent Rendering Across Browsers
- Safari handles `will-change` and GPU compositing differently. Animations that are butter-smooth in Chrome may flicker or show rendering artifacts in Safari, especially with overlapping translucent elements on top of a WebGL canvas.

Last updated: 2026-02-16
