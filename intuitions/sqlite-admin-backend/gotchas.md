# Gotchas

- Duplicate sale race on same image ID under concurrent checkout requests.
  - Prevention: unique DB constraint on sold image id + transaction + explicit conflict handling.
- Client-side only auth checks can be bypassed.
  - Prevention: verify signed admin session cookie in every admin API route.
- Seeding sold images multiple times can create duplicates.
  - Prevention: idempotent UPSERT/INSERT OR IGNORE with deterministic seed source.
- SQLite path mismatch between dev/prod can create accidental empty DBs.
  - Prevention: centralize DB path resolution and log selected path in server startup path.

Last updated: 2026-02-14
