# Hope — Stripe + Printful E-Commerce

## Success criteria (observable, testable)

- [ ] `priceAt(0) === 77` and `priceAt(24235) === 777`
- [ ] PriceCurveChart renders with correct 24,236 range and 77-777 Y domain
- [ ] Cart: add/remove items, change frame colors, persists across page reloads
- [ ] Cart page shows correct thumbnails, prices in selected currency
- [ ] Stripe test mode checkout completes with card `4242424242424242`
- [ ] Webhook processes `checkout.session.completed` and marks pieces as sold
- [ ] Confirmation email sent via Resend with correct order details
- [ ] Printful order created (or gracefully logged if API token missing)
- [ ] Concurrent checkout of same piece: first wins, second gets refund
- [ ] All 4 locales (en/de/es/fr) load shop translations without errors
- [ ] TypeScript compiles with zero errors (`tsc --noEmit`)

Last updated: 2026-02-17
