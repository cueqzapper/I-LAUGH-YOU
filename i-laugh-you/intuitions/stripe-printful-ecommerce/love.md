# Love — Stripe + Printful E-Commerce

## Craftsmanship compass

- Every price shown to the user is calculated from the same `priceAt()` function — no formula duplication
- Race conditions handled at the database level (UNIQUE constraint), not with application locks
- Email template is clean HTML that works in all email clients (no CSS frameworks)
- Cart page UI follows the existing dark aesthetic with pink accent color (`rgba(255, 0, 105, 1)`)
- Frame color picker uses actual color swatches, not text labels — intuitive and fast

Last updated: 2026-02-17
