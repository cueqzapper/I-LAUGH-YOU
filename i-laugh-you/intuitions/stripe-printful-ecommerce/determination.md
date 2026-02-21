# Determination — Stripe + Printful E-Commerce

## Non-negotiable design principles

- `piece_sales.image_id` UNIQUE constraint is the **single source of truth** for sold status — never bypass it
- Every checkout must go through Stripe → webhook → atomic DB transaction. No shortcutting the flow.
- Cart is client-only (localStorage). Server validates everything at checkout time — never trust client state.
- Price is calculated server-side from `priceAt(getSoldPieceCount())` at checkout time, not from client-supplied values
- Refunds for race-condition conflicts are automated in the webhook — no manual intervention required
- Resend email is fire-and-forget in the webhook — failure must not block order fulfillment
- Printful order creation failure must not block the order from being marked as paid

Last updated: 2026-02-17
