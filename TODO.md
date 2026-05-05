# TODO: End-to-End Purchase Flow

Goal: Customer buys a piece via Stripe → Printful prints & ships it → buyer
gets an email with their piece-page link + password to customize it.

**Last audit: 2026-04-24**

Status key: `[ ]` = open, `[x]` = done

---

## ✅ Already done (verified live)

- Stripe checkout session creation, dynamic pricing, multi-currency, 15-country shipping
- Stripe webhook handler with conflict handling + partial refunds
- `STRIPE_WEBHOOK_SECRET` set in both `.env.local` and `.env.production`
- Resend client configured + `sendPurchaseConfirmation` includes piece URLs **and** the admin-visible password (`webhook/route.ts:135` → `resend.ts:78-93`)
- `RESEND_API_KEY` set in both env files
- Resend domain `i-laugh-you.com` is **fully verified** in Resend (DKIM + SPF MX + SPF TXT all green, EU region) — sending is enabled
- Printful API client + order creation + frame variant mapping
- Printful shipment-tracking webhook handler (`/api/webhooks/printful`)
- `PRINTFUL_API_TOKEN` set in both env files
- Printful product 172 variant IDs verified against catalog API:
  - `6886` Black 12″×16″ ✓ (US/EU/UK/AU)
  - `10764` White 12″×16″ ✓ (US/EU/UK/AU)
- "Natural" frame option **fully removed** (Red Oak was US-only):
  - `FrameColor` type, `FrameColorPicker`, `FRAME_STYLES`, `FRAME_BORDER_COLORS` (cart + success page)
  - `VALID_FRAME_COLORS`, `FRAME_VARIANT_MAP`
  - i18n: `shop.json` (en/de/es/fr) + `home.json` spec2 strings
- Printful webhook URL registered (`https://i-laugh-you.com/api/webhooks/printful`, 6 event types)
- `NEXT_PUBLIC_BASE_URL` set in both env files (local dev + prod)
- Email + Stripe checkout product description corrected from "Enhanced Matte" → "Premium Luster Photo Paper Framed Poster"
- **Printful safety verified**: live test order returned `status: "draft"` (no print, no ship) and was canceled. Code default behavior is safe; explicit comment added in `printful.ts` documenting the `?confirm=true` switch needed for go-live.

---

## ⚠️ Open

### 1. End-to-end test (manual — needs you)

Stripe stays in TEST mode for now. Read the dev-server log for the actual port, then:

```
stripe listen --forward-to http://127.0.0.1:<PORT>/api/checkout/webhook
```

The signing secret printed by `stripe listen` should match `STRIPE_WEBHOOK_SECRET` in `.env.local`. If it doesn't, copy the new one in.

Then:
1. Add a piece to cart, check out with `4242 4242 4242 4242` (any future date, any CVC)
2. Verify DB rows: `piece_sales`, `orders`, `order_items`, `piece_sites`, `piece_site_credentials`
3. Check Resend dashboard: confirmation email arrived, contains piece URL + password
4. Visit the piece page, log in with the password from the email
5. Check Printful dashboard: order shows up as **draft** (this confirms the API call works without real fulfillment)
6. Optional: cancel the draft order in Printful dashboard

### 2. Printful needs a public URL to fetch artwork

For step 5 above to work, Printful must be able to fetch
`${NEXT_PUBLIC_BASE_URL}/api/pieces/{id}/artwork`. Locally:

```
cloudflared tunnel --url http://127.0.0.1:<PORT>
```

…then set `NEXT_PUBLIC_BASE_URL` to the tunnel URL in `.env.local` for that
test session and restart the dev server. Or: just verify against the deployed
production site (test Stripe keys still apply there).

---

## 📦 Going live checklist (later)

- [ ] Switch Stripe to live keys: replace `pk_test_…` / `sk_test_…` in `.env.production`
- [ ] Register live Stripe webhook at `https://i-laugh-you.com/api/checkout/webhook` in Stripe Dashboard → Developers → Webhooks (live mode); capture new `whsec_…` and put in `.env.production`
- [ ] Flip Printful to fulfilling: change `${PRINTFUL_API_BASE}/orders` to `${PRINTFUL_API_BASE}/orders?confirm=true` in `src/lib/printful.ts` (see comment block above the for-loop)
- [ ] Deploy with `.\scripts\deploy-server.ps1`
- [ ] Run a real €/$ test purchase end-to-end against the live site (smallest piece)
- [ ] Confirm: confirmation email arrives, Printful order is fulfilled (not draft), password works on piece page
- [ ] Then announce.
