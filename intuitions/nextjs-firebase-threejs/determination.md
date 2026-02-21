# Determination — Non-Negotiable Design Principles

## Core Commitments

1. **Single-page architecture** — The app is a one-pager. All routing is internal scroll/section-based, not multi-page. Next.js is used for SSR/SSG benefits, API routes, and build tooling — not for multi-page routing.

2. **Three.js runs client-only** — Three.js (and any wrapper like React Three Fiber) must never execute on the server. All 3D code is wrapped in `dynamic(() => import(...), { ssr: false })` or guarded by `typeof window !== 'undefined'`.

3. **Firebase is a backend service, not a frontend SDK dump** — Firebase interactions (Firestore, Auth, Storage, etc.) are abstracted behind a clean service layer. No raw Firebase calls scattered across components.

4. **Performance is non-negotiable** — Three.js scenes are expensive. We budget carefully: lazy-load the 3D canvas, dispose geometries/materials/textures on unmount, and never block the main thread with heavy computation.

5. **State flows one direction** — UI state lives in React; persistent state lives in Firebase. No bidirectional sync hacks. Commands go up, data flows down.

6. **Latest versions** — Next.js 15+, React 19+, Three.js r170+, Firebase 11+. No legacy patterns (no `pages/` router — use App Router).

Last updated: 2026-02-14
