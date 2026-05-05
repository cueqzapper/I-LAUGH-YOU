#!/usr/bin/env node
/**
 * Generate inline (in-content) images for the 3 SEO pillar posts and embed
 * them into the article HTML (both DE master content and EN translation).
 *
 * For each post we place 2 inline images at natural narrative beats.
 * Each image is anchored to a specific <h2> heading that exists in both
 * the DE and the EN text; we insert the <img> right after the heading's
 * closing tag. The DE heading and the EN heading are listed side by side.
 *
 * Uses the same ComfyUI z-image-turbo workflow as the hero generator.
 * Images are rendered at 1200×768 (slightly wider than hero) for better
 * in-article display on desktop.
 *
 * Safe to re-run: script checks whether the image path is already present
 * in content before inserting, skipping if so.
 *
 * Usage:
 *   node scripts/generate-inline-images.js
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

// --- Config per slug --------------------------------------------------------
//
// Each inline entry:
//   - anchorDe / anchorEn: the exact <h2>…</h2> heading the image should follow
//   - prompt: positive-only prompt for z-image-turbo
//   - altDe / altEn: alt text per language
//
const POSTS = {
  "ich-habe-mein-selbstportrait-in-24236-teile-geschnitten": {
    inline: [
      {
        id: 1,
        anchorDe: "<h2>Die Mathematik hinter dem Preis (ohne Formel)</h2>",
        anchorEn: "<h2>The math behind the price (without a formula)</h2>",
        prompt:
          "abstract ascending exponential price curve drawn in thick oil paint across a wide dark canvas, left side warm golden yellow representing 77, right side deep crimson representing 777, minimal geometric composition, gallery lighting, editorial infographic art style, high detail, cinematic, 35mm film look",
        altDe:
          "Eine steil steigende Preiskurve von 77 CHF zu 777 CHF, in Ölfarbe auf dunklem Hintergrund",
        altEn:
          "A steeply rising price curve from 77 CHF to 777 CHF painted in oil on a dark background",
      },
      {
        id: 2,
        anchorDe: "<h2>Rembrandt hat es auch gemacht (und er wusste es)</h2>",
        anchorEn: "<h2>Rembrandt did it too (and he knew it)</h2>",
        prompt:
          "intimate 17th century Dutch etching studio, copper etching plate on a wooden workbench, half-finished engraved portrait, etching needle, loupe, candlelight, rich chiaroscuro Rembrandt atmosphere, cigar box textures, deep browns and warm ambers, dramatic side lighting, close-up shallow depth of field",
        altDe:
          "Rembrandt-Ära Kupferstich-Werkstatt mit Radierplatte und Kerzenlicht",
        altEn:
          "A Rembrandt-era copper etching plate on a wooden workbench under candlelight",
      },
    ],
  },

  "nummerierter-kunstdruck-was-auflage-wirklich-bedeutet": {
    inline: [
      {
        id: 1,
        anchorDe: "<h2>Kurzes Glossar</h2>",
        anchorEn: "<h2>Quick glossary</h2>",
        prompt:
          "elegant certificate of authenticity document for a fine art edition, handwritten edition number 23 of 100, artist's signature in ink, embossed red wax seal, museum-quality archival paper with subtle texture, close-up macro photography, shallow depth of field, warm desk lamp light, editorial photography composition",
        altDe:
          "Echtheitszertifikat eines limitierten Kunstdrucks mit rotem Siegel und handschriftlicher Nummerierung 23/100",
        altEn:
          "Certificate of authenticity for a limited edition art print with a red wax seal and a hand-numbered 23/100",
      },
      {
        id: 2,
        anchorDe: "<h2>Der Sonderfall: sehr große Auflagen</h2>",
        anchorEn: "<h2>The edge case: very large editions</h2>",
        prompt:
          "overhead photograph of a vast grid of tiny numbered rectangles printed on museum-quality paper, each rectangle shows a unique fragment of an oil painting in a different color, grid stretches to the edges of the frame, infographic poster aesthetic, soft even studio lighting, minimal composition, high detail",
        altDe:
          "Draufsicht auf ein riesiges Raster von 24.236 nummerierten Ausschnitten eines Ölgemäldes",
        altEn:
          "Overhead view of a massive grid of 24,236 numbered fragments of an oil painting",
      },
    ],
  },

  "kunst-nach-farbe-finden-hex-code": {
    inline: [
      {
        id: 1,
        anchorDe: "<h2>Schritt 2: Verstehe Farbharmonie in drei Minuten</h2>",
        anchorEn: "<h2>Step 2: understand color harmony in three minutes</h2>",
        prompt:
          "elegant minimalist color wheel diagram on a deep black background, thin golden line connections illustrate complementary, analogous, and triadic relationships between colors, labels in clean sans serif, editorial infographic illustration, high contrast, museum didactic panel style",
        altDe:
          "Farbkreis mit markierten komplementären, analogen und triadischen Farbbeziehungen",
        altEn:
          "Color wheel diagram with complementary, analogous, and triadic color relationships highlighted",
      },
      {
        id: 2,
        anchorDe: "<h2>Schritt 4: Nutze eine Kunst-Plattform mit Farb-Filter</h2>",
        anchorEn: "<h2>Step 4: use an art platform with a real color filter</h2>",
        prompt:
          "split-screen editorial illustration: left side shows a painted sage green wall with a paint-chip card labeled '#8FA87A' leaning against it, right side shows three small framed abstract art fragments hung in a row that echo the same sage green tone, natural daylight from a window, clean minimal interior photography, warm golden hour light",
        altDe:
          "Vergleich: salbeigrüne Wand mit Hex-Code #8FA87A neben drei abgestimmten Kunstfragmenten",
        altEn:
          "Sage green wall with hex code #8FA87A next to three matching framed art fragments",
      },
    ],
  },
};

// --- Comfy workflow --------------------------------------------------------

function buildWorkflow(prompt) {
  const seed = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  return {
    "39": { inputs: { clip_name: "qwen_3_4b.safetensors", type: "lumina2", device: "default" }, class_type: "CLIPLoader" },
    "40": { inputs: { vae_name: "ae.safetensors" }, class_type: "VAELoader" },
    "42": { inputs: { conditioning: ["45", 0] }, class_type: "ConditioningZeroOut" },
    "43": { inputs: { samples: ["44", 0], vae: ["40", 0] }, class_type: "VAEDecode" },
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
    "45": { inputs: { text: prompt, clip: ["39", 0] }, class_type: "CLIPTextEncode" },
    "46": { inputs: { unet_name: "z_image_turbo_bf16.safetensors", weight_dtype: "default" }, class_type: "UNETLoader" },
    "47": { inputs: { shift: 3, model: ["46", 0] }, class_type: "ModelSamplingAuraFlow" },
    "84": { inputs: { conditioning: ["42", 0] }, class_type: "ConditioningZeroOut" },
    "118": { inputs: { width: 1200, height: 768, batch_size: 1 }, class_type: "EmptyLatentImage" },
    save: { inputs: { filename_prefix: "ily-inline", images: ["43", 0] }, class_type: "SaveImage" },
  };
}

async function queuePrompt(workflow) {
  const clientId = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const res = await fetch(`${COMFY_BASE_URL}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow, client_id: clientId }),
  });
  if (!res.ok) throw new Error(`Comfy /prompt failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).prompt_id;
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
        const url = `${COMFY_BASE_URL}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || "")}&type=${encodeURIComponent(img.type || "output")}`;
        const imgRes = await fetch(url);
        if (!imgRes.ok) throw new Error(`Image download failed: ${imgRes.status}`);
        return Buffer.from(await imgRes.arrayBuffer());
      }
    }
  }
  throw new Error("Comfy timeout: no image produced");
}

async function generate(prompt) {
  const id = await queuePrompt(buildWorkflow(prompt));
  return waitForImage(id);
}

function savePng(buffer, slug, inlineId) {
  const now = new Date();
  const y = now.getFullYear().toString();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const dir = path.join(blogImagesRoot, y, m, d);
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${slug}-inline-${inlineId}.png`;
  const absPath = path.join(dir, filename);
  fs.writeFileSync(absPath, buffer);
  return { absPath, urlPath: `/blog-images/${y}/${m}/${d}/${filename}` };
}

function insertImgAfterAnchor(content, anchor, imgTag) {
  const idx = content.indexOf(anchor);
  if (idx === -1) return { content, inserted: false, reason: "anchor-not-found" };
  if (content.includes(imgTag.split('"')[1])) {
    return { content, inserted: false, reason: "image-already-present" };
  }
  const insertAt = idx + anchor.length;
  return {
    content: content.slice(0, insertAt) + imgTag + content.slice(insertAt),
    inserted: true,
  };
}

// --- Main ------------------------------------------------------------------

async function main() {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  const selectArticleBySlug = db.prepare(
    `SELECT id, slug, content FROM blog_articles WHERE slug = ?`
  );
  const updateArticleContent = db.prepare(
    `UPDATE blog_articles SET content = ? WHERE id = ?`
  );
  const selectTranslation = db.prepare(
    `SELECT id, content FROM blog_article_translations WHERE article_id = ? AND language = ?`
  );
  const updateTranslationContent = db.prepare(
    `UPDATE blog_article_translations SET content = ? WHERE id = ?`
  );
  const insertImageRow = db.prepare(`
    INSERT INTO blog_images (
      article_id, file_path, alt_text, prompt, position, created_at
    ) VALUES (
      @article_id, @file_path, @alt_text, @prompt, @position, @created_at
    )
  `);

  console.log(`Using Comfy at ${COMFY_BASE_URL}\n`);
  let ok = 0;
  let fail = 0;

  for (const [slug, cfg] of Object.entries(POSTS)) {
    const article = selectArticleBySlug.get(slug);
    if (!article) {
      console.log(`[miss] ${slug}: article not found`);
      continue;
    }
    let contentDe = article.content;

    const translation = selectTranslation.get(article.id, "en");
    let contentEn = translation ? translation.content : null;

    console.log(`\n[${article.id}] ${slug}`);

    for (const inline of cfg.inline) {
      console.log(`  inline ${inline.id}: ${inline.prompt.slice(0, 70)}...`);

      const existing = findExistingInline(`${slug}-inline-${inline.id}.png`);
      let finalPath, finalUrl;
      if (existing) {
        finalPath = existing.absPath;
        finalUrl = existing.urlPath;
        console.log(`    reuse: ${finalPath} (already on disk)`);
      } else {
        try {
          const buffer = await generate(inline.prompt);
          const saved = savePng(buffer, slug, inline.id);
          finalPath = saved.absPath;
          finalUrl = saved.urlPath;
          console.log(`    saved: ${finalPath}`);
        } catch (err) {
          console.error(`    ERROR generating: ${err.message}`);
          fail++;
          continue;
        }
      }

      // Build the <img> tag — same shape as existing posts
      const imgDe = `<img src="${finalUrl}" alt="${escapeHtml(inline.altDe)}" loading="lazy" class="blog-inline-image" />`;
      const imgEn = `<img src="${finalUrl}" alt="${escapeHtml(inline.altEn)}" loading="lazy" class="blog-inline-image" />`;

      // Insert into DE content
      const deResult = insertImgAfterAnchor(contentDe, inline.anchorDe, imgDe);
      if (deResult.inserted) {
        contentDe = deResult.content;
        console.log(`    inserted after DE anchor`);
      } else {
        console.log(`    skip DE: ${deResult.reason}`);
      }

      // Insert into EN content
      if (contentEn) {
        const enResult = insertImgAfterAnchor(contentEn, inline.anchorEn, imgEn);
        if (enResult.inserted) {
          contentEn = enResult.content;
          console.log(`    inserted after EN anchor`);
        } else {
          console.log(`    skip EN: ${enResult.reason}`);
        }
      }

      // Insert into blog_images table (idempotent-ish: dup rows allowed but won't harm)
      const now = new Date().toISOString();
      insertImageRow.run({
        article_id: article.id,
        file_path: finalUrl,
        alt_text: inline.altDe,
        prompt: inline.prompt,
        position: inline.id,
        created_at: now,
      });
      ok++;
    }

    // Commit updated content
    if (contentDe !== article.content) {
      updateArticleContent.run(contentDe, article.id);
      console.log(`  DB: updated DE content`);
    }
    if (translation && contentEn !== translation.content) {
      updateTranslationContent.run(contentEn, translation.id);
      console.log(`  DB: updated EN translation content`);
    }
  }

  console.log(`\nDone. Inline images processed: ${ok}. Failed: ${fail}.`);
  db.close();
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function findExistingInline(filename) {
  // Walk data/blog-images and return existing file if present.
  // Keeps re-runs fast if Comfy would otherwise re-generate.
  if (!fs.existsSync(blogImagesRoot)) return null;
  const years = fs.readdirSync(blogImagesRoot);
  for (const y of years) {
    const yDir = path.join(blogImagesRoot, y);
    if (!fs.statSync(yDir).isDirectory()) continue;
    for (const m of fs.readdirSync(yDir)) {
      const mDir = path.join(yDir, m);
      if (!fs.statSync(mDir).isDirectory()) continue;
      for (const d of fs.readdirSync(mDir)) {
        const dDir = path.join(mDir, d);
        if (!fs.statSync(dDir).isDirectory()) continue;
        const full = path.join(dDir, filename);
        if (fs.existsSync(full)) {
          return {
            absPath: full,
            urlPath: `/blog-images/${y}/${m}/${d}/${filename}`,
          };
        }
      }
    }
  }
  return null;
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
