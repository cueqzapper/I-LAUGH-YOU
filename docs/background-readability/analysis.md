# Background Readability — Analyse & Lösungsvorschläge

**Problem:** Auf `/cart` und `/checkout/success` zykliert der Hintergrund alle ~15s durch
4 Farben (Orange → Pink → Blau → Türkis). In den helleren Phasen (Cyan/Türkis) verliert
der weisse Text Kontrast — Schrift wird schwer lesbar.

**Last updated: 2026-04-24**

## Quellen (Code)

- `src/app/globals.css:122-137` — definiert `#background-image` + `@keyframes Gradient`
- `src/app/cart/page.tsx:127-129` und `:212-214` — kopiert das Gradient als inline-Style
- `src/app/checkout/success/page.tsx:43-45` und `:116-118` — kopiert das Gradient als inline-Style
- `src/app/HomeClient.tsx:1228` — fügt `<div id="background-image" />` als globalen Hintergrund ein

## Warum die Startseite NICHT betroffen ist

Die Startseite legt den animierten Gradient als ein einziges fixes Layer hinter alles
(`#background-image`, `position: absolute; height: 800vh`). Aber jede textreiche Sektion
hat ihren **eigenen, deckenden** Hintergrund, der das Animations-Layer überdeckt:

| Sektion | Eigene Background-Regel | Effekt |
|---|---|---|
| `#price-slide` | `hsla(280, 100%, 19%, 1)` (dunkles Lila) | Text auf konstantem Dunkel |
| `#concept-slide` | `#f0f0f0` (hellgrau, Card-Look) | Schwarzer Text auf hellem Karton |
| `#buy-bigger-picture` | `linear-gradient(160deg, #0a0a0a → #16213e)` (statisch dunkel) | Weisser Text auf konstantem Dunkel |
| `.big-title-usp.usp-visible` | Frosted-Glass-Stripe (`linear-gradient` + `backdrop-filter: blur(48px)`) | USP-Text auf konstantem Frosted-Band |
| `#loading-slide` | Vollbild-Hintergrundbild + starker `text-shadow` | Lesbar trotz wechselnder Bildbereiche |

Anders gesagt: Die Startseite **lässt den animierten Gradient nirgends direkt durch
unter Text scheinen**. Er ist Schmuck zwischen den Sektionen, nicht der Lese-Untergrund.

`/cart` und `/checkout/success` machen genau das Gegenteil — der animierte Gradient
ist die Lese-Fläche. Daher das Lesbarkeitsproblem.

## Lösungsoptionen (geordnet vom besten Aufwand-Nutzen-Verhältnis)

### Option 1 — Gleiches Pattern wie `#buy-bigger-picture` (empfohlen)

Statt animiertem Gradient: ein konstanter, dunkler Gradient mit dezenten Akzenten.
Lesbarkeit ist garantiert weil Hintergrund nie heller als ~#1a1a2e wird.

```tsx
const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(160deg, #0a0a0a 0%, #1a1a2e 40%, #16213e 100%)",
  color: "white",
  // …
};
```

Optional Akzent-Glow oben (Marken-Pink, dezent) — sieht gut aus und kostet nichts:

```tsx
background: `
  radial-gradient(ellipse 80% 40% at 50% -5%, rgba(255, 0, 105, 0.15) 0%, transparent 70%),
  linear-gradient(160deg, #0a0a0a 0%, #1a1a2e 40%, #16213e 100%)
`,
```

**Pro:** konsistent mit dem Bid-Slide, garantiert lesbar, keine Animation = kein
ständiger Reflow auf Low-End-Geräten.
**Contra:** keine Bewegung mehr — was bei Cart/Success auch kein Verlust ist.

### Option 2 — Animation behalten, Inhalt auf Frosted-Card

Animierten Gradient bleiben lassen, aber der Lese-Inhalt sitzt auf einer Frosted-Glass-Card
(wie `.big-title-usp.usp-visible` oder das Order-Number-Badge mit `backdropFilter: blur`).

```tsx
<div style={{ background: "linear-gradient(-45deg, …)", animation: "Gradient 15s …" }}>
  <div style={{
    maxWidth: 960,
    margin: "120px auto 60px",
    background: "rgba(0, 0, 0, 0.45)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    padding: "48px",
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  }}>
    {/* Inhalt */}
  </div>
</div>
```

**Pro:** behält das Marken-Gefühl der animierten Farben, Inhalt immer lesbar.
**Contra:** Frosted-Card kostet GPU; auf älteren Mobiles ruckelt es manchmal.

### Option 3 — Animation behalten, Lese-Bereich mit Dark-Overlay

Über den ganzen Inhalt einen dunklen Verlauf legen (`linear-gradient(rgba(0,0,0,0.45), …)`).
Quasi Option 2 ohne Card-Border.

**Pro:** minimaler CSS-Eingriff, Animation bleibt sichtbar.
**Contra:** das Marken-Gefühl der frischen Farben wird gedämpft.

### Option 4 — Animation langsamer + sättigungsärmer

`animation: Gradient 60s ease infinite` statt 15s, und den Gradient mit `filter: saturate(0.6)`
oder `brightness(0.7)` abdunkeln. Macht die hellen Phasen erträglicher, löst das Problem
aber nur halb — Kontrast bleibt unstabil.

**Pro:** kleinster Fix.
**Contra:** Lesbarkeit bleibt situativ, kein wirklich konsistenter Look.

## Empfehlung

**Option 1** für Cart und Checkout-Success. Vorteile:
- Visuell konsistent mit dem stärksten "Wow"-Bereich der Site (`#buy-bigger-picture`)
- Garantierte WCAG-AA-Lesbarkeit für weissen Text
- Performance gewinnt (kein 15s-Animation-Reflow)
- Cart/Checkout sind funktionale Seiten — Stabilität > Show

**Implementierung** (3 Stellen):

1. `src/app/cart/page.tsx:127-129` und `:212-214` — animated gradient → statischer dunkler Gradient
2. `src/app/checkout/success/page.tsx:43-45` und `:116-118` — gleicher Tausch

Wenn man möchte: zusätzlich den `#background-image`-`display: none`-Hack auf `:166` entfernen,
weil bei statischem Page-Background nicht mehr nötig.

## Zusatz: das Image im Screenshot deutet auf 1 Bug noch

Auf `/checkout/success` zeigt der Footer-Text **"Eine Bestätigungs-E-Mail mit Deinen
Bestelldetails wurde gesendet. ()"** — die leeren Klammern am Ende. Das ist
wahrscheinlich ein i18n-Variable die nicht gefüllt wurde (z.B. `{{email}}`). Sollte beim
Background-Refactor mit-checken.
