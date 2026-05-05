# Integrations Gap Analysis — Resend / Printful / Stripe

**Purpose:** enumerate what is MISSING, half-built, or broken across the three
external integrations powering the purchase flow. Companion to
`docs/purchase-flow-analysis/analysis.md` (which describes the flow as shipped).

**Scope:** Stripe (Bezahldienst), Printful (print-on-demand), Resend (email).

**Last updated:** 2026-04-22

---

## How to read this doc

Each gap is tagged with a severity:

- **P0** — customer-visible bug, money at stake, or security hole. Fix before next sale.
- **P1** — silent failure mode, admin blind spot, or feature parity with competitors.
- **P2** — quality-of-life, i18n polish, operational tooling.

Every gap cites the file:line it applies to. "No such code exists" is
annotated with the closest sensible insertion point.

---

## 1. The shipped purchase flow (1-paragraph recap)

`POST /api/checkout` validates the cart, creates a `pending` row in `orders`,
and returns a Stripe Checkout URL. Stripe hosts the payment; on success it
hits `POST /api/checkout/webhook`, which runs `fulfillOrderTransaction()`
(atomic: marks pieces sold, creates `order_items`, generates piece-site
credentials), auto-refunds any pieces that were already sold, sends a Resend
purchase confirmation, then fires off one Printful order per fulfilled piece.
Printful later calls `POST /api/webhooks/printful?secret=...` with shipment
status; on `shipped`, a Resend shipping email goes out.

---

## 2. Critical bugs (P0)

### 2.1 Webhook always returns 200, even on fatal error
`src/app/api/checkout/webhook/route.ts:180`
Handler returns `{ received: true }` unconditionally. If `fulfillOrderTransaction`
throws, Resend is down, or Printful fails — Stripe sees a 200 and will NEVER
retry. Order is stuck in `pending` with no recovery path.
**Fix:** return 500 on unrecoverable error; catch recoverable ones and continue.

### 2.2 Silent refund failure
`src/app/api/checkout/webhook/route.ts:111-113`
`stripe.refunds.create()` is wrapped in try/catch that only `console.error`s.
Order status is already `partial` in the DB. Customer paid for pieces they
will never receive and was not refunded.
**Fix:** write to a `refund_queue` table; retry in a background job; alert admin.

### 2.3 Payment-intent type mismatch skips refund entirely
`src/app/api/checkout/webhook/route.ts:95-97`
`typeof session.payment_intent === "string"` — if Stripe returns the expanded
object (depends on API version / expand params), the refund block is skipped.
Conflicted customer is charged full price.
**Fix:** `const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;`

### 2.4 Printful webhook secret is spoofable
`src/app/api/webhooks/printful/route.ts:9-15`
Secret is passed as query parameter (`?secret=...`) and compared with `===`.
Anyone who can guess or observe the URL can forge shipment notifications,
which causes fake shipping emails to real customers and poisons the DB's
tracking fields.
**Fix:** move to header (`X-Printful-Secret`), constant-time compare, and
rotate the secret. Printful v2 API supports HMAC — migrate when possible.

### 2.5 Duplicate fulfillment on webhook replay
`src/app/api/checkout/webhook/route.ts:36-180`
Stripe retries webhooks. Second delivery re-runs: sends a second purchase email,
attempts a second refund (Stripe rejects it but we continue), and creates
duplicate Printful orders with the same `external_id` (Printful may or may
not dedupe — behavior undocumented).
**Fix:** guard on `orders.status !== 'pending'` at top of handler; only
proceed if the order has not yet been fulfilled. Store `stripe_event_id` and
reject already-seen events.

---

## 3. High-impact gaps (P1)

### 3.1 No admin alerts anywhere
No email, Slack, or log sink fires when:
- A sale completes (observability of the business)
- A refund is issued due to a piece-conflict
- Printful order creation exhausts its 3 retries (`src/lib/printful.ts:69-95`)
- Resend send fails (`src/lib/resend.ts:110-112`, `:157`)
- Stripe webhook signature verification fails (`src/app/api/checkout/webhook/route.ts:26-34`)

**Fix:** add `sendAdminAlert(subject, body)` in `src/lib/resend.ts` that pings
a hard-coded admin address (or `ADMIN_ALERT_EMAIL` env var). Call from each
failure branch listed above.

### 3.2 Emails are English-only
`src/lib/resend.ts` — all strings (`"Order Confirmation"`, `"Your pieces are ready"`,
table headers, button labels) are hardcoded English. Site supports en/de/es/fr.
Buyer sees their language on the success page but a foreign email in their inbox.

**Fix:**
1. Add a `locale` column to `orders` (populate from `Accept-Language` at checkout).
2. Add email translation strings to `src/lib/i18n/locales/<lang>/email.json`.
3. Accept `locale` parameter in `sendPurchaseConfirmation()` and `sendShippingNotification()`.

### 3.3 No tracking of what was actually sent
There is no `email_log` table. If a customer claims "I never got a confirmation,"
there's no way to distinguish: Resend dropped it / our code never called Resend
/ customer's provider bounced it.

**Fix:** insert a row per send attempt into `email_log (order_id, type, to, resend_message_id, status, error, sent_at)`.
`resend.emails.send()` returns an `id` — capture it.

### 3.4 Email failures are not retried
`src/lib/resend.ts:108-112` and `:155-158` — errors are logged and swallowed.
Resend has transient failures like any API.

**Fix:** once `email_log` exists (3.3), add a scheduled retry for rows with
`status='failed'` and `attempts < 3`.

### 3.5 Printful retries don't honour `Retry-After`
`src/lib/printful.ts:69-95` — on 429 the backoff is 1s/2s/4s regardless of
what Printful's `Retry-After` header says. Under sustained rate limiting
we'll burn all 3 retries and give up when a single longer wait would have
succeeded.

**Fix:** if `res.status === 429` and `Retry-After` header is present, use
`max(header_seconds, computed_backoff)`.

### 3.6 Shipping costs are absorbed
`src/app/api/checkout/route.ts:100-137` — the Stripe line item is unit price
× quantity, with no shipping fee. Printful charges us shipping (variable by
country/variant). Every sale quietly loses money equal to the shipping cost.

**Fix:** either (a) call Printful's `/shipping/rates` endpoint at checkout
and add a shipping line item to the Stripe session, or (b) bake an average
shipping cost into `priceAt()` — document which and make it intentional.

### 3.7 No tax / VAT handling
EU buyers legally require VAT-inclusive pricing and a VAT line on the receipt.
Stripe Checkout can handle this via `automatic_tax: { enabled: true }`, which
is not currently set.

**Fix:** enable Stripe Tax, register the business in each jurisdiction we
sell to (Switzerland is home, Germany/France/etc. depending on volume).
**Blocker:** this is a business decision, not pure code.

### 3.8 Address not validated before Printful
`src/lib/printful.ts:47-53` — shipping fields are copied raw from Stripe's
`shipping_details`. If `postal_code` is malformed or `state_code` is missing
for a US order, Printful rejects the order *silently* (from our perspective —
we just see `createPrintfulOrder` return `null` at line 89).

**Fix:** call Printful's `/orders` endpoint with `confirm: false` as a dry-run,
or use `/orders/{id}/estimate-costs` to validate address before committing.
At minimum, require `state_code` for US/CA/AU.

### 3.9 Only one Stripe event is handled
`src/app/api/checkout/webhook/route.ts:36` — only `checkout.session.completed`.
Ignored events that matter:
- `charge.refunded` (manual refunds from the Stripe dashboard don't update our DB)
- `charge.dispute.created` (chargebacks — no admin alert, no piece un-sold)
- `checkout.session.expired` (abandoned sessions — pending orders live forever)
- `payment_intent.payment_failed` (buyer's card declined — we never know)

**Fix:** add handlers for each; for dispute, mark order `disputed` and alert
admin; for refund, flip piece back to unsold; for expired, delete the pending
order after 24h.

### 3.10 No protection against duplicate pending orders
`src/app/api/checkout/route.ts:140-149` — calling `/api/checkout` twice with
the same cart creates two `pending` rows with two Stripe sessions. If buyer
pays on one, the other is orphaned forever.

**Fix:** require an idempotency key from the client, or dedupe on
`(user_fingerprint, cart_hash)` within a 15-min window.

### 3.11 Webhook errors after DB commit are unrecoverable
If `fulfillOrderTransaction` succeeds but then the code crashes before emailing
and creating Printful orders, there's no retry path — the order is `paid` in DB
but the customer has no email and no fulfillment.

**Fix:** write a durable `post_fulfillment_tasks` table with rows for
`send_confirmation_email` and `create_printful_order` per piece. A background
worker processes them with retries. Webhook just enqueues.

---

## 4. Operational / polish gaps (P2)

### 4.1 No abandoned-cart email
No record of carts that didn't check out; no reminder flow.
**Fix:** persist `cart_snapshots (email, items, created_at)` when buyer fills
the Stripe email field. Cron job sends a nudge 24h later if no matching
`order.status='paid'`.

### 4.2 No unsubscribe / preference management
Required for promotional mail under GDPR/CAN-SPAM. Transactional mail (receipt,
shipping) is exempt but any future marketing mail needs this.
**Fix:** add `email_suppressions` table; every `send()` checks before calling
Resend.

### 4.3 Test vs live mode not explicit
`src/lib/stripe.ts:7-9` reads `STRIPE_SECRET_KEY` blindly. Whether that's
a `sk_test_` or `sk_live_` is implicit. Similarly Printful has no env flag.
**Fix:** add `STRIPE_MODE=test|live` and `PRINTFUL_MODE=test|live` env vars;
assert at boot that the key prefix matches the declared mode. Prevents the
"deployed test keys to prod" class of incident.

### 4.4 Printful variant IDs are hardcoded
`src/lib/printful.ts:13-17` — Black 6886, White 10764, Natural 15010. If
Printful retires or replaces a variant, orders silently fail.
**Fix:** move to `PRINTFUL_VARIANT_BLACK` etc. env vars, and add a boot-time
`GET /products/172` check that the configured variants still exist.

### 4.5 No refund notification email
When we auto-refund conflicted pieces (`src/app/api/checkout/webhook/route.ts:101-114`),
the buyer is not told why their charge was reduced. They'll see a partial
refund on their card statement and wonder.
**Fix:** after successful refund, send a Resend email explaining which pieces
were unavailable.

### 4.6 Customer has no self-service
No order-status page, no "resend my email," no refund-request form. All
support issues become inbound email that a human has to handle.
**Fix:** the `/checkout/success?session_id=...` page could also work as a
stable "my order" URL if reached later. Add a "resend confirmation email"
button that hits a new endpoint.

### 4.7 No load / race test
The `piece_sales` uniqueness constraint is the only guard against two buyers
racing for the last copy of a piece. The handling is correct (`sqlite.ts:1946-1950`)
but has never been load-tested. With Next.js on a single node this is fine;
if we ever horizontally scale, worth revisiting.

---

## 5. Missing database structure

Tables referenced above that do not exist:

| Table | Purpose | Referenced in gap |
|---|---|---|
| `email_log` | every send attempt with Resend message id, status, retry count | 3.3, 3.4 |
| `refund_queue` | durable refund retry + audit | 2.2 |
| `post_fulfillment_tasks` | durable post-payment task queue | 3.11 |
| `cart_snapshots` | abandoned cart reminders | 4.1 |
| `email_suppressions` | unsubscribe list | 4.2 |
| `stripe_events` | dedup by event id for idempotency | 2.5 |

Nullable fields to revisit:

- `orders.buyer_email` starts empty at checkout creation (`checkout/route.ts:143`);
  only filled by webhook. Any report that joins on this before webhook fires
  gets blank rows. Consider capturing an early email value from the Stripe
  `customer_email` pre-fill.
- `orders.stripe_payment_intent_id` can be NULL if the payment_intent came
  back as an object and the type-check at `webhook/route.ts:95-97` bailed.
- `order_items.printful_order_id` silently NULL after 3 retries exhaust —
  there is no `printful_error` column to explain why.

---

## 6. Environment variables

### Currently required (crash on missing)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`

### Currently optional (silent degradation — **dangerous in prod**)
- `PRINTFUL_WEBHOOK_SECRET` — if missing, webhook accepts anything (see 2.4)
- `PRINTFUL_API_TOKEN` — if missing, order creation silently skipped (`printful.ts:34-36`).
  A misconfigured prod box would accept payments forever and never fulfill.

### Should be added
- `ADMIN_ALERT_EMAIL` (for 3.1)
- `STRIPE_MODE`, `PRINTFUL_MODE` (for 4.3)
- `PRINTFUL_VARIANT_BLACK / _WHITE / _NATURAL` (for 4.4)
- `RESEND_REPLY_TO` — transactional mail should have a real reply-to, not `noreply@`

---

## 7. Recommended fix order

1. **This week — P0 safety net:**
   - 2.2 + 2.3 (refund safety)
   - 2.5 (webhook idempotency)
   - 2.1 (return 500 on failure)
   - 2.4 (Printful secret in header)

2. **Next sprint — P1 observability:**
   - 3.1 (admin alerts)
   - 3.3 + 3.4 (email log + retry)
   - 3.5 (Retry-After honouring)
   - 3.6 or 3.7 (shipping OR tax — pick one first based on first non-CH sale)

3. **Whenever — P1 UX:**
   - 3.2 (email i18n) — blocker for DE/FR marketing push
   - 3.9 (handle refund / dispute / expired session events)

4. **Backlog — P2:** everything in §4.

---

## File index

Primary code paths examined:

- `i-laugh-you/src/lib/resend.ts`
- `i-laugh-you/src/lib/printful.ts`
- `i-laugh-you/src/lib/stripe.ts`
- `i-laugh-you/src/app/api/checkout/route.ts`
- `i-laugh-you/src/app/api/checkout/webhook/route.ts`
- `i-laugh-you/src/app/api/webhooks/printful/route.ts`
- `i-laugh-you/src/app/api/orders/[sessionId]/route.ts`
- `i-laugh-you/src/lib/sqlite.ts` (schema + `fulfillOrderTransaction`)
- `i-laugh-you/src/lib/pricing.ts`
- `i-laugh-you/.env.production.example`

Related existing doc: `docs/purchase-flow-analysis/analysis.md`.
