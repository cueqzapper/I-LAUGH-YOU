#!/usr/bin/env node
/**
 * Generate hero images for blog articles that have hero_image = NULL.
 *
 * Uses the same ComfyUI z-image-turbo workflow as src/lib/blog-generator.ts.
 * Reimplements the workflow graph + HTTP client inline so the script runs
 * under plain Node (no Next.js / TS transpile needed).
 *
 * Usage:
 *   COMFY_BASE_URL=https://comfy.catdone.com node scripts/generate-hero-images.js
 *   (COMFY_BASE_URL defaults to https://comfy.catdone.com)
 *
 * For specific slugs:
 *   node scripts/generate-hero-images.js <slug-1> <slug-2>
 *
 * Writes PNGs to data/blog-images/YYYY/MM/DD/<slug>-hero.png and UPDATEs
 * blog_articles.hero_image + INSERTs into blog_images.
 */

const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const Database = require("better-sqlite3");

const COMFY_BASE_URL = (process.env.COMFY_BASE_URL || "https://comfy.catdone.com").replace(/\/$/, "");
const COMFY_TIMEOUT_MS = Number(process.env.COMFY_TIMEOUT || "900") * 1000;

const repoRoot = path.resolve(__dirname, "..");
const dbPath = path.join(repoRoot, "data", "ily.sqlite");
const blogImagesRoot = process.env.BLOG_IMAGES_DIR || path.join(repoRoot, "data", "blog-images");

// --- Hero prompts, curated per slug. Positive-only (no "avoid", "no", etc. -----
// The workflow has negative prompts applied separately; the cleanser would
// strip disallowed vocabulary, so we keep these purely descriptive.
const HERO_PROMPTS = {
  "ich-habe-mein-selbstportrait-in-24236-teile-geschnitten": {
    prompt:
      "a lone artist standing in front of a massive oil self-portrait canvas, thin white rectangular grid lines overlaid across the entire painting in a fine geometric pattern, cinematic studio lighting from above, warm ochre and muted umber palette, visible oil paint impasto texture, 35mm film look, contemplative mood, editorial art magazine composition, extreme detail, centered composition",
    alt:
      "An artist standing before a huge oil self-portrait divided by a fine white grid of 24,236 rectangles",
  },
  "nummerierter-kunstdruck-was-auflage-wirklich-bedeutet": {
    prompt:
      "close-up macro photograph of a stack of archival fine art prints, pencil-written edition numbers '1/100', '23/100', '73/100' visible in the lower corners, pristine museum-grade paper texture, shallow depth of field, soft directional studio light, neutral gray background, editorial still-life composition, high resolution, hyper-realistic",
    alt:
      "Close-up of numbered fine art prints stacked with hand-written edition numbers in pencil",
  },
  "kunst-nach-farbe-finden-hex-code": {
    prompt:
      "modern scandinavian living room interior, one wall painted in muted sage green, a single framed abstract oil painting with bold yellow and ochre brushstrokes hanging perfectly centered, natural golden-hour light streaming through a large window, minimalist furniture, warm wooden floor, harmonious complementary color composition, interior design magazine photography, sharp focus, high detail",
    alt:
      "A sage-green living room with a framed yellow-toned abstract painting illustrating color harmony",
  },
};

// --- Comfy workflow (mirrors src/lib/blog-comfy-workflow.ts) ----------------

function buildWorkflow(prompt) {
  const seed = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  return {
    "39": {
      inputs: { clip_name: "qwen_3_4b.safetensors", type: "lumina2", device: "default" },
      class_type: "CLIPLoader",
    },
    "40": {
      inputs: { vae_name: "ae.safetensors" },
      class_type: "VAELoader",
    },
    "42": {
      inputs: { conditioning: ["45", 0] },
      class_type: "ConditioningZeroOut",
    },
    "43": {
      inputs: { samples: ["44", 0], vae: ["40", 0] },
      class_type: "VAEDecode",
    },
    "44": {
      inputs: {
        seed,
        steps: 8,
        cfg: 1,
        sampler_name: "dpmpp_2m",
        scheduler: "sgm_uniform",
        denoise: 1,
        model: ["47", 0],
        positive: ["45", 0],
        negative: ["84", 0],
        latent_image: ["118", 0],
      },
      class_type: "KSampler",
    },
    "45": {
      inputs: { text: prompt, clip: ["39", 0] },
      class_type: "CLIPTextEncode",
    },
    "46": {
      inputs: { unet_name: "z_image_turbo_bf16.safetensors", weight_dtype: "default" },
      class_type: "UNETLoader",
    },
    "47": {
      inputs: { shift: 3, model: ["46", 0] },
      class_type: "ModelSamplingAuraFlow",
    },
    "84": {
      inputs: { conditioning: ["42", 0] },
      class_type: "ConditioningZeroOut",
    },
    "118": {
      inputs: { width: 1200, height: 1024, batch_size: 1 },
      class_type: "EmptyLatentImage",
    },
    "save": {
      inputs: { filename_prefix: "ily-hero", images: ["43", 0] },
      class_type: "SaveImage",
    },
  };
}

async function queuePrompt(workflow) {
  const clientId = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const res = await fetch(`${COMFY_BASE_URL}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow, client_id: clientId }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Comfy /prompt failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const { prompt_id } = await res.json();
  return prompt_id;
}

async function waitForImage(promptId) {
  const deadline = Date.now() + COMFY_TIMEOUT_MS;
  let delay = 1500;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(5000, delay + 1000);

    const res = await fetch(`${COMFY_BASE_URL}/history/${promptId}`);
    if (!res.ok) continue;

    const history = await res.json();
    const entry = history[promptId];
    if (!entry?.outputs) continue;

    for (const node of Object.values(entry.outputs)) {
      if (node.images && node.images.length > 0) {
        const img = node.images[0];
        const url = `${COMFY_BASE_URL}/view?filename=${encodeURIComponent(
          img.filename
        )}&subfolder=${encodeURIComponent(img.subfolder || "")}&type=${encodeURIComponent(img.type || "output")}`;
        const imgRes = await fetch(url);
        if (!imgRes.ok) throw new Error(`Image download failed: ${imgRes.status}`);
        return Buffer.from(await imgRes.arrayBuffer());
      }
    }
  }
  throw new Error("Comfy timeout: no image produced");
}

async function generate(prompt) {
  const workflow = buildWorkflow(prompt);
  const promptId = await queuePrompt(workflow);
  console.log(`   queued prompt_id=${promptId}`);
  return waitForImage(promptId);
}

function savePng(buffer, slug) {
  const now = new Date();
  const y = now.getFullYear().toString();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const dir = path.join(blogImagesRoot, y, m, d);
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${slug}-hero.png`;
  const absPath = path.join(dir, filename);
  fs.writeFileSync(absPath, buffer);
  return { absPath, urlPath: `/blog-images/${y}/${m}/${d}/${filename}` };
}

// --- Main ------------------------------------------------------------------

async function main() {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  const selectNullHero = db.prepare(
    `SELECT id, slug FROM blog_articles WHERE hero_image IS NULL`
  );
  const selectBySlug = db.prepare(
    `SELECT id, slug FROM blog_articles WHERE slug = ?`
  );
  const updateHero = db.prepare(
    `UPDATE blog_articles SET hero_image = ? WHERE id = ?`
  );
  const insertImage = db.prepare(`
    INSERT INTO blog_images (
      article_id, file_path, alt_text, prompt, position, created_at
    ) VALUES (
      @article_id, @file_path, @alt_text, @prompt, @position, @created_at
    )
  `);

  const argv = process.argv.slice(2);
  let targets;
  if (argv.length > 0) {
    targets = argv
      .map((slug) => selectBySlug.get(slug))
      .filter((row) => row && HERO_PROMPTS[row.slug]);
  } else {
    targets = selectNullHero.all().filter((row) => HERO_PROMPTS[row.slug]);
  }

  if (targets.length === 0) {
    console.log("No articles to generate. Nothing with a known prompt + null hero_image.");
    db.close();
    return;
  }

  console.log(`Generating hero images for ${targets.length} article(s) via ${COMFY_BASE_URL}\n`);

  let success = 0;
  let failed = 0;

  for (const row of targets) {
    const entry = HERO_PROMPTS[row.slug];
    console.log(`[${row.id}] ${row.slug}`);
    console.log(`   prompt: ${entry.prompt.slice(0, 90)}...`);
    try {
      const buffer = await generate(entry.prompt);
      const { absPath, urlPath } = savePng(buffer, row.slug);
      console.log(`   saved:  ${absPath}`);

      const now = new Date().toISOString();
      updateHero.run(urlPath, row.id);
      insertImage.run({
        article_id: row.id,
        file_path: urlPath,
        alt_text: entry.alt,
        prompt: entry.prompt,
        position: 0,
        created_at: now,
      });
      console.log(`   db:     hero_image -> ${urlPath}\n`);
      success++;
    } catch (err) {
      console.error(`   ERROR:  ${err.message}\n`);
      failed++;
    }
  }

  console.log(`Done. Success: ${success}. Failed: ${failed}.`);
  db.close();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
