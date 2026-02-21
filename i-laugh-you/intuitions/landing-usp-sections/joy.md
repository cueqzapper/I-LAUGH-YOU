# Joy - Landing USP Sections

## What Already Works in Our Favor

### framer-motion Is Already a Dependency
- No installation or bundle-size justification needed. The project already uses framer-motion, so the team is familiar with its API. We can use `motion.div`, `AnimatePresence`, `whileInView`, `variants`, and `stagger` patterns immediately.
- The dynamic import pattern for SSR safety is already established in the codebase. We just follow the same pattern for new animated components.

### Oswald Font Is Already Loaded
- The Oswald typeface, which works beautifully for bold headlines and section titles, is already loaded via Next.js font optimization (likely `next/font/google`). No additional font requests or FOUT concerns. We can style headlines with Oswald immediately and focus on sizing, weight, and spacing.

### Particle Scene Provides a Great Backdrop
- The Three.js particle scene already creates a visually rich, immersive background. The USP sections do not need to generate their own "wow factor" from scratch -- they just need to complement what is already there. This means the animations can be restrained and elegant rather than flashy, letting the particles do the heavy atmospheric lifting.

### Existing Section Structure
- The landing page already has a section-based architecture with scroll snapping. The USP sections are not being retrofitted into a layout that was not designed for them -- they are part of the intended structure. This means the HTML scaffolding and scroll logic already accommodate them.

### Next.js Image Optimization Pipeline
- If we decide to self-host the SVGs or convert them to optimized formats, Next.js's built-in image optimization is available. Even for external images, the `remotePatterns` configuration allows us to leverage width-based optimization and modern format delivery.

### CSS-Only Animations Work Great Here
- Pure CSS transitions triggered by class toggling (usp-hidden → usp-visible) proved simpler and more reliable than framer-motion for this use case. No extra JS bundle, no SSR concerns, works perfectly with the existing scroll handler that already tracks `currentSectionRef`. The staggered delays via `transition-delay` create a clean choreography effect.

### clamp() for Fluid Typography
- Using `clamp()` for font sizes eliminates the need for separate mobile breakpoint overrides. The headings scale smoothly from mobile to desktop without jumps.

Last updated: 2026-02-16
