# Love — Craftsmanship Compass

## Quality Standards

1. **The transition must be invisible** — A user should not notice the moment particles become OpenSeadragon. This is the single most important UX quality measure.

2. **Scroll feel must be natural** — The non-linear curve makes the animation feel organic, not mechanical. Particles that are far away (in the scattered sphere) travel faster to catch up, creating a convergence effect.

3. **Each particle is a real artwork** — The 6059 tiles aren't abstract — they're actual pieces of the portrait that users can buy. The shader must render them with correct color, correct position, correct UV mapping. No approximations.

4. **Performance is part of the experience** — Jank during the scroll animation breaks the magic. 60fps is the minimum. If CPU updates cause drops, move to GPU.

5. **The code should be readable** — The particle system is the core creative feature. Future developers (or future-you) must be able to understand the grid→random interpolation, the UV mapping, and the OpenSeadragon sync by reading the code.

Last updated: 2026-02-14
