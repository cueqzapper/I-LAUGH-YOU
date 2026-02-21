# Joy — Proven Wins Log

## What Actually Works

1. **Point sprites with texture atlas = efficient** — Using a single full-image texture and UV-mapping each particle to its tile region via the fragment shader is elegant and GPU-efficient. One texture, one material, one draw call for 6059 particles.

2. **getTween clamped interpolation** — Simple linear interpolation clamped at the end value prevents overshoot. Combined with the non-linear scroll curve, it creates a natural "particles rushing together" feel.

3. **Pre-loading OpenSeadragon at opacity:0** — Having the deep zoom viewer ready underneath eliminates any loading delay on transition. The swap is instant.

4. **Fog for depth** — `scene.fog = new THREE.Fog(0x000000, 0.0025, 500)` naturally fades distant scattered particles, creating depth without extra shader work.

5. **Random sphere distribution** — `setRandomPointInSphere(400)` with recursive rejection sampling ensures uniform distribution inside the sphere, not clustered at center.

Last updated: 2026-02-14
