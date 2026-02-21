# Determination — Admin Image Check

- Canonical path strategy: original file_path is the reference in article HTML; selecting a variant copies to canonical path, article content never changes
- Keyboard-first: every action reachable without mouse via single keypress
- Image sets grouped by (article_id, position) — this is the navigation unit
- Variants within a set are independent DB rows sharing article_id + position

Last updated: 2026-02-18
