# Frustration

- "It is faster but jumps around" after aggressive throttling.
  - Guardrail: avoid dropping intermediate movement forever; always render latest state quickly.
- Benchmarks can look good on draw cost while UX still feels bad.
  - Guardrail: treat smoothness and visual lock as first-class acceptance criteria.
- Pan/zoom source combinations are hard to tune by feel.
  - Guardrail: keep per-source counters and compare before/after logs.
