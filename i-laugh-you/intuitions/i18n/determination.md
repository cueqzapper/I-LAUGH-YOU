# Determination — i18n

- German is the source of truth; all other languages are translations of the DE keys
- `react-i18next` client-side only — no route restructuring, no `[lang]` segments
- JSON translation files bundled statically (no external CDN/API dependency)
- `count` is reserved by i18next for pluralization — use custom key names like `total` for string interpolation
- Language state lives in i18next, not in React state — `i18n.changeLanguage()` is the single API

Last updated: 2026-02-17
