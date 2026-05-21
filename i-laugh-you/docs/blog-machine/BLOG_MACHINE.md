# Blog Posting Machine

How I LAUGH YOU writes and publishes a fresh German art blog article every day, fully autonomously.

## File sources
- Pipeline: `src/lib/blog-generator.ts`
- Topic pool: `src/lib/blog-topics.ts` (~50 topics across 7 categories)
- Scheduler: `src/lib/blog-scheduler.ts`
- Image workflow: `src/lib/blog-comfy-workflow.ts`
- Manual trigger: `src/app/api/blog/generate/route.ts`
- Persistence: `src/lib/sqlite.ts` (`insertBlogArticle`, `insertBlogImage`, scheduler log)

## Scheduling
- `startBlogScheduler()` runs in-process, polling every **30 minutes**.
- Each new day picks **one random hour between 06:00 and 22:00** as the publish slot.
- Once the slot is reached, generation runs once per day (status tracked in `blog_scheduler_log`); failures are *not* retried the same day.
- Gated by env `BLOG_GENERATION_ENABLED=true`.

## Pipeline (5 steps)

### A. Topic selection
`selectBlogTopic()` picks a topic from `BLOG_TOPICS`, avoiding the last 15 used keys (`getRecentBlogTopicKeys(15)`). Each topic carries a German title, a write-prompt, a category, and tag seeds.

### B. Research — `perplexity/sonar` (via OpenRouter)
- Web-search enabled (`web_search_options: { search_context_size: "low" }`)
- Temperature 0.1, German output
- Returns JSON `{ summary, facts[] }` — fed as raw facts into the writer
- Failure is non-fatal: pipeline continues with empty facts

### C. Writing — `moonshotai/kimi-k2.5` (via OpenRouter)
- Temperature 0.6, `response_format: json_object`, max 10k tokens
- System prompt embeds the full project soul: art vs. capitalism, the 6.059-fragment self-portrait, the I LAUGH YOU / I LOVE YOU wordplay (which the model is forbidden from naming), pricing mechanics (77€–777€), HTML structure rules
- Returns one JSON object: `title`, `excerpt`, `content_html`, `tags`, plus **4 image prompts** (`cover` + `content_1/2/3`), each in a *different* art-historical style picked from a curated list (Kandinsky, Van Gogh, Picasso, Dalí, Banksy, Klimt, Pollock, …)
- Field-name variants are auto-normalized (`titel` → `title`, `inhalt` → `content_html`, etc.)

### D. Quality gate + retry
`evaluateQuality()` requires:
- ≥ 750 words
- ≥ 3 headings
- ≥ 6 paragraphs
- Title present

Up to **3 attempts**; if all fail, the run errors out. Post-processing strips disallowed tags, removes `<a>` links, and cleanses image prompts of negations (only positive phrasing for ComfyUI).

### E. Image generation — ComfyUI (z-image-turbo)
- Endpoint: `COMFY_BASE_URL` (default `https://comfy.catdone.com`), timeout 900 s
- Workflow: `z_image_turbo_bf16` + `qwen_3_4b` CLIP (Lumina2), `dpmpp_2m`/`sgm_uniform`, 8 steps, CFG 1, 1200×1024, no LoRAs
- All **4 images generated in parallel** (`Promise.all`)
- Saved to `data/blog-images/YYYY/MM/DD/<slug>-{cover,content-N}.png`

### F. Publishing
- Cover used as hero image
- Content images injected as `<figure>` at ~25 %, 50 %, 75 % of paragraph positions (or after the first `<p>` for short articles); captions use category + tag labels
- Article written to SQLite via `insertBlogArticle`; each image row via `insertBlogImage` (`position` 0 = cover, 1–3 = content)
- Scheduler log marked `completed` with article id

## Models at a glance

| Step | Model | Purpose |
|------|-------|---------|
| Research | `perplexity/sonar` | Web-grounded facts (German) |
| Writing | `moonshotai/kimi-k2.5` | Long-form German HTML + image prompts |
| Images | ComfyUI `z_image_turbo_bf16` | 4 stylistically distinct illustrations |

All LLM calls go through OpenRouter (`OPENROUTER_API_KEY`).

---
Last updated: 2026-05-21
