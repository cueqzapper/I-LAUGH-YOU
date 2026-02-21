# USP Sections — Scroll Animations & German Copywriting

## Overview
The three USP ("Unique Selling Proposition") sections on the landing page tell the origin story of I-LAUGH-YOU in a three-act narrative. Each section occupies a full viewport height and is revealed via the custom fullpage scroll-snapping system.

## Source Files
- **Page component**: `src/app/page.tsx` (lines ~1206–1300)
- **Styles**: `src/app/globals.css` (section "Story USP Sections" + "USP Animation System")

## Architecture

### Animation Trigger
The scroll handler in `page.tsx` tracks `currentSectionRef` (0-indexed). When the user scrolls into sections 2, 3, or 4 (USP 1/2/3), the handler sets `uspAnimated[sectionIndex] = true` via state update. This toggles the CSS class from `usp-hidden` to `usp-visible`.

```tsx
// State declaration
const [uspAnimated, setUspAnimated] = useState<Record<number, boolean>>({});

// In scroll handler (handleScroll callback)
if (currentSection >= 2 && currentSection <= 4) {
  setUspAnimated((prev) => {
    if (prev[currentSection]) return prev;
    return { ...prev, [currentSection]: true };
  });
}
```

### CSS Animation Classes
Each USP section contains three animated elements:
- `.usp-anim-title` — h2 headline (slides down from -40px)
- `.usp-anim-image` — illustration wrapper (scales up from 0.8)
- `.usp-anim-text` — h3 description (slides up from +30px)

Staggered timing via `transition-delay`:
- Title: 0ms delay
- Image: 150ms delay
- Text: 350ms delay

All animations use `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo) for a snappy feel.

The glow image gets a separate keyframe animation (`usp-glow-pulse`) that scales and fades in after 400ms.

### Accessibility
`@media (prefers-reduced-motion: reduce)` disables all transforms and replaces them with simple opacity fades.

## German Copywriting

### Section 1: "Wo alles begann"
- **Headline**: Wo alles begann
- **Body**: Ein Kunststudent. Ein riesiges Ölgemälde. Ein Ziel.
- **Tagline**: Das grösste Selbstporträt der Welt — gemalt von Hand.

### Section 2: "Von der Leinwand ins Netz"
- **Headline**: Von der Leinwand ins Netz
- **Body**: Stück für Stück fotografiert, Pixel für Pixel digitalisiert.
- **Tagline**: So wurde aus Farbe auf Leinwand ein digitales Kunstwerk.

### Section 3: "Dein Stück vom Ganzen"
- **Headline**: Dein Stück vom Ganzen
- **Body**: 24.236 einzigartige Fragmente — jedes ein Original.
- **Tagline**: Finde das eine, das zu Dir gehört.

## Visual Improvements
- `font-weight: 700` + `text-transform: uppercase` + `letter-spacing: 3px` on h2 for stronger presence
- `clamp()` for fluid font sizing (no breakpoint jumps)
- `text-shadow` on headlines for depth against particle backdrop
- `drop-shadow` filter on USP images
- Gold color `#ffd700` for taglines (was plain yellow)
- Tighter image wrapper width (`420px` vs `460px`) for better proportion

Last updated: 2026-02-16
