# Curiosity — Exploration Backlog

## Open Questions & Verification Plans

1. **React Three Fiber vs vanilla Three.js?** — R3F provides better React integration but adds abstraction. **Verify:** Prototype both approaches for the main scene; measure bundle size delta and DX.

2. **App Router server actions for Firebase?** — Can we use Next.js server actions to keep Firebase Admin SDK entirely server-side? **Verify:** Build a proof-of-concept server action that reads Firestore and returns data to a client component.

3. **Three.js postprocessing performance on mobile** — Effects like bloom, SSAO can kill mobile FPS. **Verify:** Profile on a mid-range Android device with Chrome DevTools.

4. **Firebase Auth + Next.js middleware** — Can we protect API routes with Firebase Auth tokens verified in Next.js middleware? **Verify:** Implement token verification in middleware and measure latency.

5. **Scroll-driven Three.js animations** — How to smoothly tie scroll position to 3D camera/object transforms? **Verify:** Test with `framer-motion` scroll hooks + R3F `useFrame`, measure smoothness.

6. **ISR vs SSG for the one-pager** — If content changes infrequently, full SSG may be better than ISR. **Verify:** Compare build/deploy workflow for both.

Last updated: 2026-02-14
