# Gotchas — Stripe + Printful E-Commerce

## Known pitfalls

- **Stripe SDK types**: `shipping_details` is not directly on Session type in newer Stripe SDK — needs `retrieve()` with expand + type assertion
- **Stripe refund API**: `reason: "other"` may not be valid in all SDK versions — omit if type errors occur
- **Printful variant IDs**: Currently placeholder values (1, 2, 3) — must be looked up from Printful catalog API for "Enhanced Matte Paper Framed Poster 12x16" before going live
- **Tile URL format**: Uses backslash (`\`) in URL path (legacy CDN format) — don't "fix" to forward slash
- **SQLite WAL mode**: Concurrent reads are fine, but writes are serialized — the `fulfillOrderTransaction` handles this atomically
- **Double-webhook risk**: Stripe may send `checkout.session.completed` more than once — the UNIQUE constraint on `piece_sales.image_id` prevents double-sells but the order items might fail on `UNIQUE(order_id, image_id)` — this is caught by `isSqliteConstraintError`

Last updated: 2026-02-17
