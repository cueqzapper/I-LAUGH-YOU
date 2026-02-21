# Love - Landing USP Sections

## Quality Standards

### Clean Separation of Animation Logic
- Animation variants and transition configs must be defined in dedicated objects or files, not inline in JSX. Each USP section component should import its variants from a shared animation config. This keeps the JSX readable and makes it easy to adjust timing across all sections from one place.
- Entry animations, exit animations, and stagger orchestration should each be clearly named and documented with comments explaining the choreography intent.

### Accessible Motion (prefers-reduced-motion)
- All animations MUST respect the `prefers-reduced-motion: reduce` media query. When this preference is active:
  - Fade-in opacity transitions are acceptable (they do not cause vestibular discomfort).
  - Slide, scale, and rotation animations must be disabled or replaced with simple opacity fades.
  - Continuous animations (glow pulse, floating effects) must be paused.
- Implementation: use framer-motion's `useReducedMotion()` hook to conditionally apply reduced variants, or use CSS `@media (prefers-reduced-motion: reduce)` to override animation durations to 0.

### Semantic HTML
- Each USP section must use proper semantic elements:
  - `<section>` with an `aria-label` or `aria-labelledby` describing the section's narrative role.
  - `<h2>` or `<h3>` for section headlines (maintaining correct heading hierarchy from the page's `<h1>`).
  - `<p>` for narrative body text.
  - `<figure>` and `<figcaption>` for illustrative images if they carry meaning.
  - Decorative images (glows, backgrounds) use `aria-hidden="true"` and empty `alt=""`.
- Screen readers must be able to navigate the three-part story without any animation dependency.

### Performance Budget
- Each USP section's JavaScript (animation logic + component) should not exceed 5KB gzipped.
- No layout thrashing: all animated properties must be compositor-friendly (transform, opacity).
- Images must have explicit intrinsic sizing to prevent cumulative layout shift.

### Code Consistency
- Follow the existing codebase conventions: naming patterns, file structure, import ordering.
- TypeScript types for all props and animation variants. No `any` types.

Last updated: 2026-02-16
