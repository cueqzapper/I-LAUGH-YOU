# Frustration

- "It worked in UI but DB didn't update" drift.
  - Guardrail: treat API response from DB commit as source of truth and re-fetch admin list after writes.
- Repeated breakage from ad-hoc sold-count logic in multiple places.
  - Guardrail: expose a single backend endpoint for sold count/list and reuse everywhere.

Last updated: 2026-02-14
