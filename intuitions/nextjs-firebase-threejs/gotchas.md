# Gotchas — Fail-Fast Radar

## Pitfalls & Prevention

1. **Three.js SSR crash** — Three.js accesses `window`, `document`, `navigator` which don't exist on the server. **Prevention:** Always use `dynamic(() => import(...), { ssr: false })` for any component that imports Three.js or R3F. Never import three at module-level in a server component.

2. **Memory leaks in Three.js** — Geometries, materials, textures, and renderers are not garbage-collected automatically. **Prevention:** Implement `dispose()` calls in cleanup/unmount hooks. R3F handles some of this, but custom objects need manual disposal.

3. **Firebase SDK bundle size** — Importing the full Firebase SDK bloats the client bundle. **Prevention:** Use modular imports (`firebase/firestore`, `firebase/auth`) and tree-shake. Consider keeping heavy Firebase ops in API routes/server actions.

4. **Firebase config exposure** — Firebase client config is public by design, but service account keys must never reach the client. **Prevention:** Server-side Firebase Admin SDK goes in API routes/server actions only. Use environment variables with `NEXT_PUBLIC_` prefix only for client-safe config.

5. **Next.js App Router + client components** — Forgetting `"use client"` directive causes hydration mismatches with Three.js. **Prevention:** Any component using hooks, Three.js, or browser APIs must have `"use client"` at the top.

6. **R3F Canvas sizing** — The `<Canvas>` component needs a parent with explicit dimensions; it won't auto-size in a flex container without height. **Prevention:** Always wrap Canvas in a container with `width: 100%` and `height: 100vh` (or explicit dimensions).

7. **Hot reload breaks Three.js state** — HMR can cause duplicate scenes, orphaned renderers, or stale WebGL contexts. **Prevention:** Use R3F which handles this, or manually track and dispose renderer on module hot replacement.

8. **Scroll-driven visibility swap causes blink** — Toggling element visibility inside a scroll handler that fires DURING `scrollTo({behavior: "smooth"})` creates a race: the browser paints intermediate frames where neither element is visible. **Prevention:** Toggle visibility in the wheel/intent handler BEFORE calling `scrollTo`, matching fullpage.js `onLeave` semantics. Never toggle visibility in a passive scroll listener.

9. **React inline styles fight direct DOM manipulation** — If a React component sets `opacity`/`visibility` via inline styles AND a parent does direct DOM `display` toggle, the async React re-render can temporarily restore stale opacity (e.g., `opacity: 0` on a just-shown element). **Prevention:** Use a single visibility mechanism. For instant swaps, use only direct DOM `display` toggle; keep React props only for non-visual concerns (e.g., R3F `frameloop`).

Last updated: 2026-02-14
