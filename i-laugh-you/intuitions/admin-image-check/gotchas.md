# Gotchas — Admin Image Check

- ALTER TABLE migration uses try/catch because SQLite throws if column already exists — this is expected, not an error
- `insertBlogImage` (existing function) must include `status` and `is_selected` in its return value after schema change
- The `selectBlogImageVariant` transaction must deselect all variants first, then select the target, then clear failed status — order matters
- ComfyUI regeneration can take minutes; the UI shows "Generating..." but the fetch may timeout if maxDuration is too short (set to 300s)

Last updated: 2026-02-18
