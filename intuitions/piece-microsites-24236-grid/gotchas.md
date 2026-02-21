# Gotchas

- Migrating from 6,059 to 24,236 can silently break ID bounds and tile math.
  - Prevention: centralize constants and remove hardcoded limits.
- Public slug routes can collide after title edits.
  - Prevention: deterministic unique slug generator with numeric suffix.
- Showing admin passwords requires storage beyond one-way hashes.
  - Prevention: keep separate hashed verifier and explicit admin-visible value with strict server-only access.

Last updated: 2026-02-15
