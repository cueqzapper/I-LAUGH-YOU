# Gotchas — i18n

- `count` interpolation key triggers i18next pluralization logic; types require it to be `number` — use `total` or other names for string values
- Fitty-managed text doesn't auto-resize on language change — must call `.fit()` after language switch (50ms setTimeout for DOM update)
- `<Trans>` component requires self-closing tags for void elements like `<heartIcon/>` in translation strings
- Chart (D3) labels are rendered imperatively — `i18n.language` must be in the useEffect deps array to re-render on language switch
- `document.documentElement.lang` must be synced manually since layout.tsx is a server component

Last updated: 2026-02-17
