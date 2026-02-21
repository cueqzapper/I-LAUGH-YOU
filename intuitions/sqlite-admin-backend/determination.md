# Determination

## Non-negotiable constraints

1. Keep backend local-first: SQLite is the single source of truth for sold pieces and orders.
2. A piece can be sold only once (enforced by DB uniqueness + transactional write path).
3. Admin auth is single-user only and must stay server-validated.
4. No external backend dependencies for core purchase/admin flow.
5. Printify integration is stubbed as a deterministic server-side dummy action for now.

Last updated: 2026-02-14
