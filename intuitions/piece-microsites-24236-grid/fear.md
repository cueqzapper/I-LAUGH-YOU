# Fear

- Overselling pieces during migration.
  - Protection: preserve PK uniqueness on image_id and transactional purchase writes.
- Leaking owner controls across pieces.
  - Protection: owner session tokens scoped to image_id and verified on every write.
- Broken routing after slug rename.
  - Protection: enforce unique slug writes atomically and always resolve by slug/index.

Last updated: 2026-02-15
