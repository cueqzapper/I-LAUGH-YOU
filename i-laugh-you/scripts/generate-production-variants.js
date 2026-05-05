#!/usr/bin/env node
/**
 * Generate 20 variants for each of the 3 ProductionSection concepts
 * (60 images total) via ComfyUI z-image-turbo.
 *
 * Concepts (see CONCEPTS below):
 *   1. GEMALT   — monumental oil self-portrait in the atelier
 *   2. ZERLEGT  — the same painting dissected by a fine 24.236-cell grid
 *   3. DEINS    — a single framed fragment treasured on a home wall
 *
 * All three share a STYLE_BASE so the set reads cohesively.
 *
 * Each concept's 20 variants differ by seed only (rich prompts give plenty
 * of natural diversity with z-image-turbo).
 *
 * Output:
 *   public/images/production/variants/concept-1/v-01.png ... v-20.png
 *   public/images/production/variants/concept-2/...
 *   public/images/production/variants/concept-3/...
 *
 * Usage:
 *   node scripts/generate-production-variants.js
 *   COMFY_BASE_URL=https://comfy.catdone.com node scripts/generate-production-variants.js
 */

const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const COMFY_BASE_URL = (process.env.COMFY_BASE_URL || "https://comfy.catdone.com").replace(/\/$/, "");
const COMFY_TIMEOUT_MS = Number(process.env.COMFY_TIMEOUT || "1200") * 1000;
const VARIANTS_PER_CONCEPT = Number(process.env.VARIANTS || "20");

const repoRoot = path.resolve(__dirname, "..");
const variantsRoot = path.join(repoRoot, "public", "images", "production", "variants");

const STYLE_BASE =
  "editorial art magazine photography, warm ochre and deep magenta and soft pink palette, " +
  "clean minimal composition, soft directional light, 35mm film look, shallow depth of field, " +
  "sharp focus, hyper-realistic, high detail, cinematic mood, " +
  "no text, no letters, no numbers, no watermark, no signature";

const CONCEPTS = [
  {
    id: "concept-1",
    label: "GEMALT",
    prompt:
      "A monumental portrait-orientation oil self-portrait painting standing on a tall " +
      "wooden easel inside an artist's atelier, the huge canvas fully visible, dense " +
      "impasto oil brushstrokes forming an abstract human face in warm ochre, deep " +
      "magenta and soft pink tones, thick wet glossy paint texture catching raking " +
      "light, jars of turpentine and paint-streaked wooden brushes on a nearby side " +
      "table, natural skylight streaming from above, dust motes floating in the air, " +
      "polished concrete floor, reverent quiet atmosphere, centered hero composition, " +
      STYLE_BASE,
  },
  {
    id: "concept-2",
    label: "ZERLEGT",
    prompt:
      "A monumental abstract oil portrait painting seen straight head-on hanging on a " +
      "pale gallery wall, the entire painted surface evenly overlaid with a precise fine " +
      "white rectangular grid of thousands of tiny uniform cells subdividing the canvas, " +
      "warm ochre, deep magenta and soft pink impasto brushstrokes visible beneath every " +
      "cell, each cell slightly distinct in color and texture, subtle raking light " +
      "revealing three-dimensional paint relief beneath the geometric division, museum " +
      "framing, pristine white wall, centered straight-on composition, conceptual art, " +
      STYLE_BASE,
  },
  {
    id: "concept-3",
    label: "DEINS",
    prompt:
      "A single small fine-art framed print hanging perfectly centered on a pale warm " +
      "neutral wall inside a minimal modern living room, thin black solid wood frame " +
      "with cream-white matting, the print inside is a vivid abstract fragment in warm " +
      "ochre, deep magenta and soft pink impasto oil brushwork, a small engraved brass " +
      "plaque mounted just below the frame, soft directional window daylight falling " +
      "from the left, a linen sofa corner softly out of focus at the lower edge, warm " +
      "wooden floor, intimate quiet interior, centered composition, interior editorial, " +
      STYLE_BASE,
  },
];

function buildWorkflow(prompt, seed) {
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
      inputs: { width: 1024, height: 1024, batch_size: 1 },
      class_type: "EmptyLatentImage",
    },
    "save": {
      inputs: { filename_prefix: "ily-prod-var", images: ["43", 0] },
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

async function fetchHistoryImage(promptId) {
  const res = await fetch(`${COMFY_BASE_URL}/history/${promptId}`);
  if (!res.ok) return null;
  const history = await res.json();
  const entry = history[promptId];
  if (!entry?.outputs) return null;
  for (const node of Object.values(entry.outputs)) {
    if (node.images && node.images.length > 0) {
      const img = node.images[0];
      const url = `${COMFY_BASE_URL}/view?filename=${encodeURIComponent(
        img.filename
      )}&subfolder=${encodeURIComponent(img.subfolder || "")}&type=${encodeURIComponent(img.type || "output")}`;
      const imgRes = await fetch(url);
      if (!imgRes.ok) return null;
      return Buffer.from(await imgRes.arrayBuffer());
    }
  }
  return null;
}

async function waitForImage(promptId) {
  const deadline = Date.now() + COMFY_TIMEOUT_MS;
  let delay = 2000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(5000, delay + 500);
    const buf = await fetchHistoryImage(promptId);
    if (buf) return buf;
  }
  throw new Error(`Comfy timeout for prompt_id=${promptId}`);
}

async function main() {
  for (const concept of CONCEPTS) {
    fs.mkdirSync(path.join(variantsRoot, concept.id), { recursive: true });
  }

  console.log(`Generating ${CONCEPTS.length} concepts × ${VARIANTS_PER_CONCEPT} variants = ${CONCEPTS.length * VARIANTS_PER_CONCEPT} images`);
  console.log(`Comfy: ${COMFY_BASE_URL}`);
  console.log(`Output: ${variantsRoot}\n`);

  // Queue ALL prompts upfront so ComfyUI's scheduler pipelines them.
  const jobs = [];
  for (const concept of CONCEPTS) {
    for (let i = 0; i < VARIANTS_PER_CONCEPT; i++) {
      const seed = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
      const variantName = `v-${String(i + 1).padStart(2, "0")}.png`;
      const outPath = path.join(variantsRoot, concept.id, variantName);
      if (fs.existsSync(outPath) && process.env.SKIP_EXISTING === "1") {
        console.log(`[skip] ${concept.id}/${variantName} (exists)`);
        continue;
      }
      jobs.push({ concept, seed, variantName, outPath });
    }
  }

  console.log(`Queueing ${jobs.length} jobs...`);
  let queued = 0;
  for (const job of jobs) {
    const workflow = buildWorkflow(job.concept.prompt, job.seed);
    try {
      job.promptId = await queuePrompt(workflow);
      queued++;
      if (queued % 10 === 0) console.log(`   queued ${queued}/${jobs.length}`);
    } catch (err) {
      console.error(`   queue failed for ${job.concept.id}/${job.variantName}: ${err.message}`);
      job.failed = true;
    }
  }
  console.log(`All queued. Polling for results...\n`);

  let ok = 0;
  let fail = 0;
  for (const job of jobs) {
    if (job.failed) {
      fail++;
      continue;
    }
    try {
      const buf = await waitForImage(job.promptId);
      fs.writeFileSync(job.outPath, buf);
      ok++;
      console.log(`[${ok + fail}/${jobs.length}] ${job.concept.id}/${job.variantName} ✓`);
    } catch (err) {
      fail++;
      console.error(`[${ok + fail}/${jobs.length}] ${job.concept.id}/${job.variantName} FAIL: ${err.message}`);
    }
  }
  console.log(`\nDone. Success: ${ok}. Failed: ${fail}.`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
