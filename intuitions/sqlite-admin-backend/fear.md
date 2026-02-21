# Fear

- Overselling a unique piece (same image sold twice).
  - Protection: DB-level unique index, transaction guard, and 409 conflict response.
- Losing buyer records after successful checkout.
  - Protection: single atomic insert for sold_piece + order; fail fast if partial write is attempted.
- Admin data exposure.
  - Protection: server-side auth gate for /admin and all admin APIs.

Last updated: 2026-02-14
