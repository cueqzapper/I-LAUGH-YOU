# Determination

- Keep SQLite as single source of truth for sales, piece pages, credentials, and slugs.
- Keep one-sale-per-piece invariant (transaction + DB uniqueness).
- Piece pages are public to view; editing is owner-password protected server-side.
- Admin must be able to view each piece page password per user requirement.
- New inventory model is 24,236 pieces (30x40cm concept), no legacy seeded sold pieces.

Last updated: 2026-02-15
