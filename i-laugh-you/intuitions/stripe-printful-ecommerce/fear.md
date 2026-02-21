# Fear — Stripe + Printful E-Commerce

## High-impact failure scenarios

- **Double-charge without fulfillment**: Webhook fails mid-transaction → order paid but pieces not marked sold → customer charged, no product. Mitigation: atomic transaction, idempotent webhook processing.
- **Race condition double-sell**: Two customers buy same piece simultaneously → both charged. Mitigation: SQLite UNIQUE constraint, automated refund in webhook for conflicted items.
- **Printful API down after payment**: Order paid but Printful order not created → customer waits forever. Mitigation: Printful failure is logged but doesn't block order status. Need admin retry mechanism.
- **Resend API key leak**: If `.env.local` is committed, email sending credentials are exposed. Mitigation: .env.local in .gitignore.
- **Stale cart prices**: Customer adds items, price changes before checkout → charged different amount than displayed. Mitigation: price calculated server-side at checkout time, always current.

Last updated: 2026-02-17
