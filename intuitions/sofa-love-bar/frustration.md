# Frustration — Bug-Magnet Map

- Duplicated tile rendering logic between page.tsx and new components: resolved by extracting to `src/lib/tile-utils.ts`
- Types defined inline in page.tsx couldn't be shared: resolved by moving to tile-utils module

Last updated: 2026-02-17
