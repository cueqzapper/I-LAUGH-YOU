# Site-Wide Design Review

A holistic critique of every customer-facing page in the I-LAUGH-YOU app: what already works, where the design dialects diverge, and concrete moves to take the whole flow from "polished Shopify" toward "gallery checkout that matches the brand promise."

Originally scoped to cart + checkout success. Expanded to cover homepage, about, piece detail, blog index, blog post, blog gallery, legal pages, and cross-page consistency.

## Source files reviewed

**Cart flow**

- `i-laugh-you/src/app/cart/page.tsx`
- `i-laugh-you/src/app/checkout/success/page.tsx`
- `i-laugh-you/src/components/FramedPosterMockup.tsx`
- `i-laugh-you/src/components/FrameColorPicker.tsx`
- `i-laugh-you/src/components/CartPieceImage.tsx`

**Landing & narrative**

- `i-laugh-you/src/app/page.tsx` + `HomeClient.tsx`
- `i-laugh-you/src/components/sections/*` (ProductionSection, SofaSection, ParticleScene, …)
- `i-laugh-you/src/app/about/page.tsx` + `about.css`

**Product / content / legal**

- `i-laugh-you/src/app/piece/[slug]/page.tsx` + `PieceClient.tsx`
- `i-laugh-you/src/app/blog/page.tsx` + `blog.css`
- `i-laugh-you/src/app/blog/[slug]/page.tsx`
- `i-laugh-you/src/app/blog/gallery/page.tsx` (admin-only, light review)
- `i-laugh-you/src/app/legal/{privacy,impressum,terms,returns}/page.tsx`

## Executive verdict

The brand has **two strong design moments** (homepage interactive narrative; cart with framed-poster mockup + 1/1 badge) and **three weak ones** (piece detail page is a visual orphan; legal pages are stubs; blog post is undifferentiated).

The core problem across the site is **dialect drift**: the homepage commits to Oswald + dark + magenta + framer-motion; the piece detail page reverts to Inter + Playfair + white + zero motion; legal pages use Oswald-only with magenta on h1; about page is dark Oswald with no motion at all. A buyer walking from landing → piece → cart → success crosses three or four visual languages.

This document proposes one unified system, then per-page application.

## What already works

- **Homepage** — fullpage scroll, Three.js particle scene, SofaSection with responsive aspect-ratio math, ProductionSection with whileInView stagger. Genuinely ownable and not generic.
- **Cart** — soft gradient surface, white cards, framed-poster mockup with rotated 1/1 badge, sticky checkout bar, sold-out handling, apply-frame-to-all detail.
- **Success page** — emotional pacing (hero check → gallery → summary → CTA) and the magenta checkmark moment.
- **Blog index** — cohesive dark aesthetic with the rest of the brand; card hover-lift with magenta border; multi-lingual URL params handled.

## Where the design dialects diverge

### Cross-page consistency snapshot

| Aspect | Homepage | About | Piece detail | Cart / Success | Blog | Legal |
|---|---|---|---|---|---|---|
| Primary font | Oswald | Oswald | **Inter + Playfair** | Oswald | Oswald | Oswald |
| Surface | Dark `#0a0a0a` | Dark `#0a0a0a` | **White `#fff`** | **Light gradient** | Dark `#0a0a0a` | Dark `#0a0a0a` |
| Magenta (`#ff0069`) | CTAs, selection | Implicit (em highlights) | **Zero** | CTAs, badges, prices, links | Card hover border | h1 + links |
| Motion (framer) | Heavy | None | None | Light (sticky bar, success hero) | CSS only | None |
| Max-width | 1320px | 900px | Sidebar flow | 960px | 1200px | 700px |
| Responsive | Heavy `clamp()` | Heavy `clamp()` | **Hardcoded px** | `clamp()` | `clamp()` | Minimal |

Four hard inconsistencies stand out:

1. **Piece detail is a visual orphan.** White surface + Inter + Playfair while everything else is dark Oswald. A buyer goes from a moody hero gallery into what reads like a different site, then back into the dark-themed cart. This is the single highest-impact integration to fix.
2. **Cart + success page invert the dark theme** into a soft light gradient. This is a defensible choice (commerce flows often go lighter for readability/trust), but it should be intentional and consistent across both, not accidental drift.
3. **Motion is one-directional.** Only the homepage and the success hero animate. Blog, about, piece detail, legal pages are completely static. This breaks the rhythm — the homepage promises a polished interactive experience that the rest doesn't deliver.
4. **Legal pages are placeholders.** Once they get real content, they currently look like Lorem-Ipsum stubs with magenta h1s. They need a real treatment, not a "we'll fix later" excuse.

## Proposed unified design system

A single vocabulary that every page can adopt without losing its individual character.

### Typography

Replace the current fragmented mix (Oswald / Ultra / Roboto / Inter / Playfair) with **two faces**, used everywhere:

- **Display: Oswald** (already loaded) — titles, prices, button labels, eyebrow tracking, numerals
- **Body: editorial serif** — descriptions, blog body, about copy, line items, legal text, helper text

Body serif candidates that aren't on the AI-default list (Inter, Roboto, Space Grotesk):

- **Newsreader** (Production Type, free via Google) — literary, looks expensive at body sizes
- **Fraunces** with `opsz` axis turned down — variable, expressive, free
- **GT Sectra Display** (paid) — newspaper-headline energy, perfect counterpart to Oswald
- **Tiempos Text** (paid) — what Stripe, NYT-style sites use

For numerals: turn on `font-variant-numeric: tabular-nums` globally for prices and tables.

**Drop Inter and Playfair from the piece detail page** in favor of this system. Drop Ultra and Roboto from the homepage. One display + one body, used consistently.

### Color

Today everything magenta gets dumped into `#ff0069`: CTAs, badges, prices, link hover, h1s on legal pages, success checkmark glow, frame-picker ring. When one color is on every interactive *and* decorative element, none of them feel important.

Demote magenta to **one role only — commerce action and live price**. Then introduce two supporting tones:

- **Ink black** `#141414` (with a hint of blue) for prices and titles instead of `#0f1423` and `#111`
- **Gold ochre** `#b8923a` for the "1/1 unique" badge, sold-out marker, certificate-of-authenticity cues, blog gold-accent (currently `#ffd700` — too saturated). This single tone immediately reframes badges and "art-object" elements away from "SaaS button" energy.

Resulting palette (proposal):

```
--surface-dark:   #0a0a0a   /* hero/about/blog/legal */
--surface-light:  #fafafa   /* cart/success commerce flow */
--surface-card:   #ffffff   /* light-surface cards */
--ink:            #141414   /* prices, titles */
--ink-soft:       #6b7080   /* helper text */
--accent-magenta: #ff0069   /* CTAs + current piece price ONLY */
--accent-ochre:   #b8923a   /* art-object cues: 1/1 badge, sold-out, COA, blog gold */
--hairline:       rgba(15,20,35,0.08) on light / rgba(255,255,255,0.06) on dark
```

### Motion

Pick one motion language and apply it consistently across pages:

- **Page-load stagger**: hero text fades + slides up; eyebrow → title → body → CTA (60–80ms between). Today only ProductionSection and success hero do this.
- **Scroll-in cards**: blog cards, piece cards in galleries, "So kommt es zu dir" steps — `whileInView` with `opacity 0→1, y 24→0`, `ease: [0.16, 1.2, 0.3, 1]`, `viewport: { once: true, amount: 0.25 }`. This pattern is already in ProductionSection — generalize it to a `ScrollReveal` wrapper component used everywhere.
- **Micro-interaction on CTAs**: subtle `y -2 + shadow lift` on hover (already on cart CTA). Add `:focus-visible` ring (missing across the whole site).

The current state — homepage is rich, blog/about/piece detail/legal are dead static — sets buyer expectation high then immediately disappoints.

## Per-page recommendations

### Cart (`src/app/cart/page.tsx`)

The whole brand is built around *one painting → 6,059 unique pieces, hand-painted, scarcity, price climbs with every sale.* The cart doesn't currently carry any of that weight — strip the magenta and it could be any Shopify store.

1. **Cart item card is generic.** White card with image-left, info-middle, price-right reads like a template. Re-typeset each row as a **gallery placard**:
   - Tracked-out eyebrow: `PIECE №1234 OF 6,059`
   - Hairline rule
   - Body serif: `Hand-painted oil, divided into 6,059 unique pieces.`
   - Right-side data column: `Frame: Black Oak`, `Acrylic glass: Yes`, `Ships from: Switzerland`
   - Price bottom-right, 2.2rem Oswald with `→ #1245` tabular-nums hint indicating "next buyer pays X"
2. **Price tension is told, not shown.** Add a tiny inline curve / step-chart next to the price showing today's position on the 77→777 arc. ~24px tall, magenta dot on a grey track, two micro-labels (`77` / `777`). Owns a brand mechanic no competitor has.
3. **"So kommt es zu dir" icons are UTF-8 placeholders** (`✦ ▦ ➤ ◔`). Replace with a coherent SVG set (single weight, Lucide stroke 1.5) — or better, four inline thumbnail photos (brush + canvas / frame corner / shipping tube / arrived-at-door).
4. **Trust signals missing right under the CTA.** Add a 4-icon row: `Versand 5–8 Tage`, `30 Tage Rückgabe`, `Sichere Zahlung · Stripe`, `Hergestellt in EU`. Then payment-method logos in greyscale (Visa/Mastercard/Amex/Apple Pay/Google Pay/TWINT).
5. **Frame color picker is too plain.** Bigger swatches (32–36px) with inline wood-grain texture instead of flat hex fill; labels below (`Schwarze Eiche` / `Weisse Esche`); soft checkmark fade on selection.
6. **Sticky bar on mobile is text-only.** Add a micro-stack of overlapping circular thumbnails on the left (up to 3 visible, `+N` for the rest).
7. **Remove button is an underlined text link** — looks like a footer link. Replace with a 32×32 ghost icon button (trash/x), neutral → red on hover.
8. **Apply-frame-to-all is orphaned** between sections. Move it into the cart-list header bar so it visually belongs to the items.
9. **Sold-out warning** uses red-on-rose, clashes with magenta. Re-tint to the new gold-ochre with an inline "Aus Korb entfernen" button so users can act from the banner.
10. **Order summary lacks an arrival window.** Compute live `Bei dir: 27. Mai – 1. Juni` from production lead time + shipping window. One specific date range beats three lines of generic trust copy.

### Checkout success (`src/app/checkout/success/page.tsx`)

11. **The magenta circle + check hero is generic conversion-design** — identical to ~50% of all DTC checkouts. The piece they just bought is a *certificate-of-authenticity* moment. Re-design the hero as a stylized digital certificate:
    - Piece number in serif numerals (`№ 1245 / 6059`), centered, large
    - Faux wax-seal mark or signature stroke in ochre below
    - "Acquired by [Name]" line if buyer name is known
    - Then the success text and order id
    
    Single change differentiates from every other shop and gives buyers something to screenshot/share.

12. **Currency formatting inconsistent with cart** — `420 EUR` here, `€420.00` on cart. Use `formatPrice` everywhere.
13. **Email line is a generic envelope icon + grey text.** Replace with one line of body serif: `Bestätigung an [email] gesendet — schau auch in den Spam-Ordner, falls nötig.`
14. **Order summary card is plain** — could double as the digital certificate of authenticity (signature line, piece numbers, date of acquisition).

### Homepage (`src/app/page.tsx` + `HomeClient.tsx`)

The strongest page on the site. Three refinements:

15. **HeaderNav appears ~3300px down with fade-in.** First-paint users see no navigation. Provide a thin always-present logo + cart-count in the top-left from scroll position 0, with the full nav fading in later. Brand presence on first scroll.
16. **ProductionSection mobile**: now stacks to 1 column (just fixed), but the CTA is still "FINDE DEIN STÜCK" only. Add a secondary text link below — `Wie funktioniert das?` linking to about — for buyers not yet ready to convert.
17. **The particle scene loads via dynamic import** — fine, but it occupies hero space before it's ready. Provide a static painting-canvas thumbnail (the source painting) as a placeholder, then crossfade to particles when ready. Hero never goes blank.

### About (`src/app/about/page.tsx`)

Currently dark Oswald, no motion, very text-heavy. The story is the strongest brand asset on the site and the page treats it like a Wikipedia entry.

18. **No motion at all.** Add the proposed `ScrollReveal` to each section header and image — turns the page from "scroll wall of text" into a guided narrative.
19. **No images of the painting being made.** Brand sells "hand-painted" — show the brush. Two or three high-res photos (work-in-progress on canvas, signing, dividing into pieces) anchor the story.
20. **Hero overlay uses a single image + gradient.** Consider a slow Ken Burns zoom on the source painting (1.0 → 1.05 over 20s, CSS only). Free atmosphere.
21. **Dual-language hints in body copy** (German primary, embedded EN). Move to a proper language toggle if the page is going to surface both.

### Piece detail (`src/app/piece/[slug]/page.tsx` + `PieceClient.tsx`) — **highest-priority page**

This page is the bridge between landing and cart and currently reads as a different site:

22. **Drop Inter + Playfair**, adopt Oswald + the proposed editorial serif. Invert to dark surface `#0a0a0a` (commerce-flow can stay light only from cart onward).
23. **Replace hardcoded px with `clamp()`** for typography and spacing — currently the only page that doesn't.
24. **Hero is a tile grid preview + metadata sidebar.** Reframe as the same gallery-placard treatment proposed for the cart row, but at hero scale:
    - Big number `№ 1245 / 6059` in display
    - Editorial serif description below
    - Right column: data table (row/col, frame options, paper, glass, shipping)
    - Then "Add to Cart" with the price-tension micro-chart below
25. **Missing trust signals**: no return-policy line, no payment hint, no "What you get" breakdown. Add a 4-bullet "Was du bekommst" block: original-painting context, hand-signed certificate, framed under acrylic, lifetime authenticity guarantee.
26. **Owner edit mode is hidden behind a password.** Once a buyer owns a piece, give them a more delightful logged-in view — a permanent "Owned by you since [date]" banner, ability to add a story/dedication, link to their profile.

### Blog index (`src/app/blog/page.tsx`)

27. **Cards hover-lift with magenta border** is fine but uniform. Tier the cards: a featured/lead post at 2/3 width with hero image + magenta accent, then standard cards at 1/3. Adds editorial hierarchy.
28. **Gold link color `#ffd700` is too saturated.** Move to `#b8923a` (the proposed ochre) for a consistent metallic note across the site.
29. **No motion on grid reveal.** Apply `ScrollReveal` to cards with 60ms stagger.

### Blog post (`src/app/blog/[slug]/page.tsx`)

Currently undifferentiated. A blog is a publication; treat it like one.

30. **No drop cap, no pull-quotes, no figure captions.** Add an editorial serif drop-cap on the first paragraph, support `<blockquote>` styling with a magenta vertical rule, `<figcaption>` in tracked-out small caps.
31. **No reading progress indicator.** Add a thin magenta bar fixed to the top edge of the viewport that fills as the article scrolls. Trivial CSS-only implementation.
32. **No related-posts at the end.** Add 2–3 related blog cards below the article (already have the data, just need the component).

### Blog gallery (admin-only)

Light touch — internal tool, low priority. Consider adding bulk-actions and a keyword filter once content volume grows.

### Legal pages (`src/app/legal/{privacy,impressum,terms,returns}/page.tsx`)

Currently four near-identical placeholder stubs.

33. **Either write the real content or hide them from the footer.** Placeholder legal pages erode trust — a user who clicks "Impressum" and gets a Lorem-Ipsum line is a worse impression than no link at all.
34. **When filled, use a single shared layout component.** Maximum 700px column (good already), Oswald h1 + serif body, magenta only on h1 and link text. Add a sticky table-of-contents on the left at ≥1024px width — turns walls of text into navigable documents.

## Cross-cutting polish

- **Focus-visible**: no page has a `:focus-visible` outline on CTAs, swatches, links, or remove buttons. Whole site is keyboard-inaccessible past the form fields.
- **Tabular-nums**: prices currently shift width as digits change. One-line global rule fix.
- **`overflow: hidden` on root** of cart hides any rogue overflow but also blocks horizontal-scroll diagnostics. Once mobile fixes are stable, consider removing it and relying on real constraints.
- **Performance**: `CartPieceImage` uses raw `<img>` for many tiles. Cart with 5–10 items can do hundreds of tile fetches. Consider sprite/atlas at low zoom, or a Next.js `<Image>` wrapper with deferred loading below the fold.
- **Currency display drift**: `formatPrice` is used in cart but bypassed on the success page. Audit all price renders.

## Priority order (if you only ship 5)

1. **Type pairing — Oswald display + editorial serif body** across the whole site (touches every page). Single biggest leap from "Shopify" → "gallery."
2. **Demote magenta to commerce-only, introduce ochre as art-object accent.** Same scope, immediately reframes the brand.
3. **Fix piece detail page** — adopt dark theme + the new type system + clamp(). Highest-impact integration; closes the visual orphan gap.
4. **Price-tension micro-chart in cart row + piece detail.** Owns a brand mechanic no competitor has. Differentiator, not just a polish.
5. **`ScrollReveal` component applied to about, blog, piece detail.** Resolves the "homepage promises a polished experience the rest doesn't deliver" problem.

Everything else is incremental; these five rewire the mood of the entire flow.

---

Last updated: 2026-05-21
