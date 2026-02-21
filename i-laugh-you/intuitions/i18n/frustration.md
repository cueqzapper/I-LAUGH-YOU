# Frustration — i18n

- First build failed because `count` is reserved by i18next TOptionsBase as `number` — fixed by renaming to `total`
- HTML entities (&ouml; etc.) in JSX are replaced by Unicode characters in JSON — must ensure correct encoding in all 8 files

Last updated: 2026-02-17
