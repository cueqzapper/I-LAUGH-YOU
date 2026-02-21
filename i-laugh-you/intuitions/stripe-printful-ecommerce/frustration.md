# Frustration — Stripe + Printful E-Commerce

## Recurring issues & regression guardrails

- Stripe SDK version changes frequently break types — always check `tsc --noEmit` after updating stripe package
- `shipping_details` moved around in Stripe API versions — use explicit type assertion when accessing
- Printful sandbox vs production URLs are the same base URL but behavior differs — ensure `PRINTFUL_API_TOKEN` matches the environment

Last updated: 2026-02-17
