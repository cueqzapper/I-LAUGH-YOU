# Curiosity — Stripe + Printful E-Commerce

## Open questions & exploration backlog

- What are the actual Printful variant IDs for "Enhanced Matte Paper Framed Poster 12x16" in black/white/natural frames? Need to query `GET /catalog/products` or look up in Printful dashboard.
- Should the artwork endpoint stitch multiple tiles at max zoom for better DPI, or is the single tile at zoom 11 (~2008x2676px) sufficient for 12x16 at 300 DPI (ideal: 3600x4800)?
- Shipping cost: currently not added to Stripe session. Should we use Printful shipping rate API to calculate, or use Stripe's built-in shipping rates?
- What happens if Resend `FROM_EMAIL` domain isn't verified? Need to configure domain in Resend dashboard.
- Should we add order status page for customers to track their Printful order?

Last updated: 2026-02-17
