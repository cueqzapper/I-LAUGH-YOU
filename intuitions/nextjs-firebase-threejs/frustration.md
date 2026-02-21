# Frustration — Bug-Magnet Map

## Recurring Issues & Guardrails

1. **"window is not defined"** — Happens every time someone imports Three.js in a server component or at module level. **Guardrail:** Lint rule or code review checklist: no Three.js imports without `"use client"` + dynamic import.

2. **Hydration mismatch warnings** — Three.js canvas or random IDs differ between server and client render. **Guardrail:** Always SSR-skip 3D components. Use `suppressHydrationWarning` only as last resort.

3. **Firebase initialization called multiple times** — Multiple `initializeApp()` calls cause errors. **Guardrail:** Singleton pattern in `lib/firebase.ts` using `getApps().length === 0` check.

4. **Environment variables undefined in client** — Forgetting `NEXT_PUBLIC_` prefix. **Guardrail:** TypeScript validation of env vars at build time. Use a `env.ts` validation file.

5. **Three.js animation continues after navigation/unmount** — `requestAnimationFrame` loops running in background. **Guardrail:** R3F handles this; if using vanilla Three.js, cancel animation frame in cleanup.

6. **Particle-to-OSD transition blink keeps regressing** — Every attempt to "fix" it by adding per-scroll DOM opacity manipulation or debug instrumentation made it worse. The original WP site uses a dead-simple pattern: swap display/opacity in `onLeave` (before scroll), not in scroll handler (during scroll). **Guardrail:** Visibility swap lives ONLY in `handleWheel` (the `onLeave` equivalent). `handleScroll` must NEVER touch visibility. Single visibility mechanism per element (`display` for particles, canvas `opacity` for OSD).

Last updated: 2026-02-14
