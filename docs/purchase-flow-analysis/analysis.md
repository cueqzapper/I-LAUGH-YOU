# I LAUGH YOU - Purchase Flow Analysis

**Last updated:** 2026-04-04

---

## Overview

This document analyzes the complete purchase flow — from browsing the gallery to receiving a Printful-fulfilled framed poster — and identifies what's implemented, what's missing, and UI/UX issues.

---

## Current Purchase Flow

```
Homepage (gallery browse + color picker + add to cart)
  ↓ localStorage: ily-favorites + frame-colors
Cart Page (/cart)
  ↓ POST /api/checkout
Stripe Checkout (hosted page)
  ↓ Stripe webhook: checkout.session.completed
POST /api/checkout/webhook
  ├── fulfillOrderTransaction() — atomic: mark sold + create order items + piece sites + credentials
  ├── Refund conflicted items (race condition)
  ├── sendPurchaseConfirmation() via Resend (email with piece URLs + passwords)
  └── createPrintfulOrder() for each item → Printful API
        ↓ Printful processes + ships
POST /api/webhooks/printful — updates tracking info in DB
  ↓
Success Page (/checkout/success?session_id=...)
```

---

## What's Implemented

| Component | Status | Notes |
|-----------|--------|-------|
| Gallery browsing + deep zoom | Done | 24,236 pieces, color search, particle scene |
| Add to cart (localStorage) | Done | `ily-favorites` key, per-piece frame color |
| Cart page | Done | Frame color selection, remove items, bulk frame change |
| Stripe checkout session creation | Done | Dynamic pricing, max 20 items, 27 shipping countries |
| Stripe webhook (payment) | Done | Signature verified, atomic fulfillment |
| Race condition handling | Done | Automatic partial refund for conflicted pieces |
| Piece sales tracking (DB) | Done | `piece_sales` table, write-once per imageId |
| Order + order_items (DB) | Done | Full order history with status |
| Piece site auto-creation | Done | Slug, password, customizable page |
| Email confirmation (Resend) | Done | Order summary + piece URLs + passwords |
| Printful order creation | Done | Correct variant IDs, artwork URL, shipping |
| Printful webhook (tracking) | Done | Updates status + tracking URL/number |
| Artwork endpoint for Printful | Done | `/api/pieces/[slug]/artwork` → CDN redirect |
| Price curve ($77 → $777) | Done | Exponential formula based on sold count |
| Multi-currency (USD/EUR/CHF) | Done | Timezone-based auto-detection |
| Success page | Done | Order summary, piece images, email notice |
| Bid system for original painting | Done | Form + highest bid display |

---

## What's Missing or Incomplete

### Critical (Blocks Production Launch)

1. **Printful Webhook Signature Validation**
   - `src/app/api/webhooks/printful/route.ts` accepts any POST request
   - No HMAC signature verification — anyone can spoof tracking updates
   - **Fix:** Add Printful webhook secret + signature check

2. **Production Environment Config**
   - Stripe keys are in test mode
   - `BASE_URL` defaults to `http://127.0.0.1:4321` — Printful needs HTTPS to fetch artwork
   - Resend domain `i-laugh-you.com` listed as needing verification
   - **Fix:** Production `.env` with live keys, HTTPS domain, verified email domain

3. **No Retry for Failed Printful Orders**
   - If `createPrintfulOrder()` fails (network, rate limit, bad image), the order is marked `paid` but no Printful order exists
   - No queue, no retry, no admin alert
   - **Fix:** Add a retry queue or at minimum an admin notification for failed Printful submissions

4. **No Shipping Update Emails**
   - Printful webhook updates DB with tracking info, but the customer is never notified
   - Email says "You'll receive tracking information once your order ships" — but this never happens
   - **Fix:** Send email when `printful_status` changes to `shipped` with tracking URL

### Important (Should Fix Before Launch)

5. **No Order Status Page for Customers**
   - After the success page, customers have no way to check order/shipping status
   - The success page URL with `session_id` is transient — not bookmarkable long-term
   - **Fix:** Add `/orders/[id]` page or email-based order lookup

6. **Cart Persistence is Fragile**
   - Cart lives entirely in localStorage (`ily-favorites`)
   - Clearing browser data = lost cart
   - No cross-device sync
   - Success page tries to clear `ily-cart` but cart actually uses `ily-favorites`

7. **No Admin Dashboard for Orders**
   - Only `/api/admin/sales` (GET) exists — read-only
   - No way to manually retry Printful, cancel orders, issue refunds, or view fulfillment status
   - **Fix:** Admin UI or at minimum CLI/API endpoints for order management

8. **Legacy Printify References**
   - `piece_sales` table has `printify_status` and `printify_job_id` columns (dead)
   - `/api/pieces/purchase/route.ts` returns `printifyStatus: 'draft'` — legacy endpoint
   - **Fix:** Clean up or ignore; not blocking but confusing

### Nice-to-Have (Post-Launch)

9. **No Rate Limiting** on checkout, bids, or purchase endpoints
10. **No Discount/Coupon System**
11. **No Customer Accounts** — anonymous checkout only
12. **No Inventory Reservation** during checkout (pieces can be sniped between add-to-cart and payment)
13. **No Analytics Endpoints** for conversion tracking
14. **Bid System Has No Resolution Logic** — bids are stored but no winner selection

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Homepage — gallery, color picker, pricing, cart |
| `src/app/cart/page.tsx` | Cart — frame selection, checkout trigger |
| `src/app/checkout/success/page.tsx` | Post-purchase success page |
| `src/app/api/checkout/route.ts` | Creates Stripe checkout session |
| `src/app/api/checkout/webhook/route.ts` | Stripe webhook — fulfills order + Printful + email |
| `src/lib/printful.ts` | Printful order creation |
| `src/app/api/webhooks/printful/route.ts` | Printful status webhook |
| `src/app/api/pieces/[slug]/artwork/route.ts` | Serves artwork image for Printful |
| `src/lib/resend.ts` | Email confirmation template |
| `src/lib/sqlite.ts` | All database operations |
| `src/lib/pricing.ts` | Price curve formula |
| `src/lib/stripe.ts` | Stripe client init |

---

## Environment Variables Required

```env
# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Printful
PRINTFUL_API_TOKEN=...

# Resend (email)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=I LAUGH YOU <noreply@i-laugh-you.com>

# App
NEXT_PUBLIC_BASE_URL=https://i-laugh-you.com  # MUST be HTTPS for Printful
SQLITE_DB_PATH=data/ily.sqlite
```

---

## Pricing Formula

```
price = 77 + 700 * (soldCount / 24235)^3
```

- Piece #1: ~$77
- Piece #12,000: ~$114
- Piece #24,236: ~$777

---

## Printful Product Details

- **Product:** Premium Luster Photo Paper Framed Poster 12"x16" (Product ID: 172)
- **Variants:** Black (6886), White (10764), Natural/Red Oak (15010)
- **Artwork:** Fetched from `/api/pieces/{imageId}/artwork` → CDN tile redirect

---

## UI/UX Deep Investigation (Browser Audit)

### Page Structure

The homepage is a full-page section-based layout. Each section is exactly `100vh` (viewport height). Sections inside `#fullpage`:

| # | Section ID | Content | Background |
|---|-----------|---------|------------|
| 0 | `loading-slide` | Gallery hero — 5 framed paintings on gallery wall | Background image |
| 1 | `title` | "I LAUGH YOU!" title | Background image |
| 2 | `usp1` | "Wo alles begann" — origin story | Background image |
| 3 | `usp2` | "Von der Leinwand ins Netz" — digitization | Background image |
| 4 | `usp3` | "Dein Stuck vom Ganzen" — 24,236 fragments | Background image |
| 5 | `fullImage` | Deep zoom viewer (canvas) | Empty/viewer |
| 6 | `pickColor` | Color picker to find pieces | `#f8f8f8` |
| 7 | `price-slide` | Price curve chart + sold counter | `rgb(65,0,97)` purple |
| 8 | `sofa-wrapper` | Interactive sofa color demo | `#d9d9d9` |
| 9 | `bid-slide` | Bid form for the original painting | Background image |

After `#fullpage`: `#concept-slide`, `#social-bar`, `#footer-wrapper`.

### UI Issues Found

#### Critical

1. **Cart piece images fail to load (dark/black thumbnails)**
   - First cart item (#15635) shows a completely black/dark image
   - Second item (#11641) loads correctly with actual artwork
   - Likely a CDN tile loading issue for certain piece IDs
   - Users seeing black thumbnails will lose confidence in the product

2. **No "Add to Cart" confirmation feedback**
   - When clicking a piece in the deep zoom viewer, it gets added to favorites/cart
   - There's no toast, animation, or visual feedback confirming the action
   - Only indication is the heart counter in the header incrementing (easy to miss)

3. **Cart key mismatch on success page**
   - Success page clears `localStorage.removeItem("ily-cart")`
   - But the actual cart uses `ily-favorites` key
   - Cart is NOT cleared after successful purchase — user sees stale items

#### Important

4. **Language defaults to German regardless of browser locale**
   - Page loads in "DE" for all users
   - Language switcher exists (DE/EN/ES/FR) but no auto-detection
   - International buyers may bounce before finding the language toggle

5. **No visible cart link/icon in header**
   - The header shows a heart icon with count (7) and a shopping bag icon with count (2)
   - The shopping bag navigates to `/cart` but is small and easy to miss
   - No label or text — purely icon-based navigation

6. **Price display inconsistency**
   - Homepage shows "$77" (USD)
   - Cart shows "$77" per piece
   - But currency auto-detection is based on timezone — could show EUR/CHF
   - No currency selector visible on the page for manual override

7. **"Zur Kasse" (Checkout) button is below the fold**
   - With 2+ items in cart, the checkout button + order summary requires scrolling
   - No sticky/fixed checkout bar at bottom
   - Users may not scroll to find the checkout button

8. **Deep zoom viewer section appears blank on initial load**
   - The `#fullImage` section (index 5) is empty until tiles load
   - Shows as a large grey area during loading
   - No loading spinner or skeleton UI

9. **Desktop nav icons lack labels/tooltips**
   - Left sidebar nav uses emoji icons (smiley, hand, dollar, sofa, info)
   - No tooltips on hover — unclear what each icon navigates to
   - Icons disappear after first interaction

#### Minor / Polish

10. **No product preview with frame**
    - Cart shows piece image + frame color circles
    - But no preview of what the piece looks like IN the selected frame
    - A framed mockup preview would increase conversion

11. **"Entfernen" (Remove) button is very subtle**
    - Positioned at the right edge, small text, low contrast
    - Could be easily missed or accidentally clicked

12. **No empty cart state UX**
    - When cart is empty, unclear what the page shows
    - Should have clear messaging + CTA back to gallery

13. **Footer is simple but functional**
    - Links: About, Blog
    - Social: Facebook, Instagram, Twitter, Pinterest
    - No FAQ, Terms of Service, Privacy Policy, or Return Policy links
    - Missing for e-commerce compliance (especially in EU/Switzerland)

14. **Bid form lacks validation feedback**
    - Bid form for the original painting has no inline validation
    - Required fields not visually marked (just asterisks)
    - No confirmation after submission visible

15. **Mobile nav exists but untested**
    - `#mobile-nav` and `#mobile-scroll-nav` exist but are `display: none` on desktop
    - Need to verify mobile responsive behavior

### Purchase Flow UX Summary

| Step | UX Quality | Issue |
|------|-----------|-------|
| Browse gallery | Good | Beautiful gallery hero, deep zoom works |
| Find a piece | Good | Color picker + zoom navigation |
| Add to cart | Poor | No confirmation feedback |
| View cart | Fair | Images sometimes black, checkout button below fold |
| Checkout | Good | Stripe hosted page handles UX well |
| Post-purchase | Fair | Success page nice, but cart not cleared, no order tracking |
| Shipping updates | Missing | No tracking emails despite promise in confirmation email |

### Recommended Priority Fixes

1. Fix cart clear key mismatch (`ily-cart` vs `ily-favorites`)
2. Add toast/feedback when adding piece to cart
3. Fix black thumbnail images in cart
4. Add shipping update emails when Printful status changes
5. Add language auto-detection based on browser locale
6. Add sticky checkout bar in cart
7. Add legal footer links (Terms, Privacy, Returns)
8. Add Printful webhook signature validation
