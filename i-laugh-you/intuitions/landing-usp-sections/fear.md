# Fear - Landing USP Sections

## Worst-Case Scenarios

### Animation-Induced Jank and Layout Shift
- If animations target layout properties (width, height, margin, padding) instead of transform/opacity, the browser will trigger layout recalculations every frame. On lower-end devices this causes visible stutter and can push CLS above acceptable thresholds. A CLS penalty would hurt the page's Core Web Vitals score.
- Staggered text animations that change `display` or `height` from 0 can cause content below to jump, creating a jarring user experience.

### Breaking Scroll Snapping
- The custom scroll-snap system is fragile by nature. If an animation changes an element's height mid-scroll, the snap points shift and the user lands between sections. This is extremely disorienting and can make the entire page feel broken.
- A rogue `overflow: hidden` on an animated container could swallow scroll events, making the page appear frozen.

### Images Failing to Load
- The SVG images are hosted externally on i-laugh-you.com. If that server is slow or down, the USP sections render with broken image placeholders. Without proper fallback states (skeleton loaders, alt text, background colors), the sections look unprofessional and the narrative falls apart.
- Large SVG files fetched externally can delay LCP (Largest Contentful Paint) if they are above the fold in any viewport.

### Motion Sickness / Accessibility Complaints
- Excessive or fast animations can trigger vestibular discomfort in users with motion sensitivities. If `prefers-reduced-motion` is not respected, this is both a UX failure and a potential accessibility violation.

### German Copy Errors
- Grammatical mistakes or unnatural phrasing in the German narrative copy would undermine credibility, especially given that the project is inherently artistic. A misplaced comma or wrong case declension in German is immediately noticeable to native speakers.

Last updated: 2026-02-16
