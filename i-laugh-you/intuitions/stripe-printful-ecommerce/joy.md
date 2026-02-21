# Joy — Stripe + Printful E-Commerce

## Proven wins

- Clean TypeScript compilation across all new files (0 errors)
- Atomic transaction pattern for fulfillment reuses existing `piece_sales` UNIQUE constraint — no new locking needed
- Cart hook (`useCart`) keeps existing `useFavorites` completely untouched — no regression risk on hearts/likes
- Price curve formula `77 + 700 * (x/24235)^3` is elegant — starts slow, accelerates dramatically at the end
- i18n shop namespace cleanly separated from home namespace — no key collisions

Last updated: 2026-02-17
