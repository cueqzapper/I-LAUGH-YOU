# Love — Craftsmanship Compass

## Quality Standards Worth Protecting

1. **Clean separation of concerns** — 3D scene logic lives in `/components/three/`, Firebase services in `/lib/firebase/`, UI components in `/components/ui/`. No cross-contamination.

2. **TypeScript everywhere** — Full type safety for props, Firebase documents, Three.js objects. No `any` types.

3. **Readable scene graph** — R3F's JSX declarative scene graph should read like a blueprint. Each 3D object is a well-named component.

4. **Graceful degradation** — If WebGL isn't available, show a beautiful static fallback — not a blank screen or error.

5. **Consistent naming** — PascalCase for components, camelCase for hooks/utils, kebab-case for files. Three.js mesh components prefixed descriptively (e.g., `FloatingLogo`, `ParticleField`).

6. **Small, focused components** — No 500-line scene files. Break scenes into composable pieces.

7. **Environment config is validated** — Missing Firebase keys fail at build time, not at runtime in production.

Last updated: 2026-02-14
