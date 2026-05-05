#!/usr/bin/env node
/**
 * Generate the 4 ProductionSection step images via ComfyUI (z-image-turbo).
 *
 * Writes 1024x1024 PNGs to public/images/production/:
 *   step-1-painted.png
 *   step-2-digitized.png
 *   step-3-your-piece.png
 *   step-4-delivered.png
 *
 * The prompts share a consistent "editorial art magazine photography,
 * warm ochre + magenta + soft pink palette, clean neutral background,
 * overhead / centered composition, soft directional studio light" base
 * so the four images read as a cohesive set.
 *
 * Usage:
 *   node scripts/generate-production-images.js
 *   COMFY_BASE_URL=https://comfy.catdone.com node scripts/generate-production-images.js
 */

const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const COMFY_BASE_URL = (process.env.COMFY_BASE_URL || "https://comfy.catdone.com").replace(/\/$/, "");
const COMFY_TIMEOUT_MS = Number(process.env.COMFY_TIMEOUT || "900") * 1000;

const repoRoot = path.resolve(__dirname, "..");
const outDir = path.join(repoRoot, "public", "images", "production");

const STYLE_BASE =
  "editorial art magazine photography, clean pale neutral background, " +
  "centered composition, soft directional studio light, warm ochre and " +
  "deep magenta and soft pink palette, muted shadows, sharp focus, " +
  "hyper-realistic, high detail, 35mm film look, no text, no letters, no watermark";

const PROMPTS = [
  {
    file: "step-1-painted.png",
    prompt:
      "overhead flat-lay of a vibrant abstract oil painting in progress on a linen canvas, thick impasto brushstrokes in warm ochre, deep magenta and soft pink, a handful of paint-stained wooden brushes and a small palette beside the canvas, wet glossy paint texture, " +
      STYLE_BASE,
  },
  {
    file: "step-2-digitized.png",
    prompt:
      "overhead flat-lay of the same abstract oil painting being digitized, faint thin white rectangular grid lines overlaid evenly across the painting forming a fine geometric pixel division, warm ochre and deep magenta and soft pink brushstrokes visible beneath the grid, linen canvas edges showing, " +
      STYLE_BASE,
  },
  {
    file: "step-3-your-piece.png",
    prompt:
      "a single framed fine-art print hanging perfectly centered on a pale warm-neutral wall, thin black solid-wood frame with white matting, the print inside shows a warm ochre and deep magenta and soft pink abstract painting, a small engraved plaque reading a three-digit edition number mounted below the frame, gentle natural daylight, minimal interior, " +
      STYLE_BASE,
  },
  {
    file: "step-4-delivered.png",
    prompt:
      "a slim elegant art parcel resting on a pale neutral table, warm kraft paper wrapping tied with a soft pink satin ribbon, one corner of the wrapping gently peeled back revealing the edge of a framed print in warm ochre and deep magenta tones, thin black wooden frame visible, " +
      STYLE_BASE,
  },
];

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
      inputs: { width: 1024, height: 1024, batch_size: 1 },
      class_type: "EmptyLatentImage",
    },
    "save": {
      inputs: { filename_prefix: "ily-prod", images: ["43", 0] },
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

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  console.log(`Generating ${PROMPTS.length} production images via ${COMFY_BASE_URL}`);
  console.log(`Output: ${outDir}\n`);

  let ok = 0;
  let fail = 0;
  for (const entry of PROMPTS) {
    console.log(`[${entry.file}]`);
    console.log(`   prompt: ${entry.prompt.slice(0, 100)}...`);
    try {
      const buf = await generate(entry.prompt);
      const outPath = path.join(outDir, entry.file);
      fs.writeFileSync(outPath, buf);
      console.log(`   saved:  ${outPath}\n`);
      ok++;
    } catch (err) {
      console.error(`   ERROR:  ${err.message}\n`);
      fail++;
    }
  }
  console.log(`Done. Success: ${ok}. Failed: ${fail}.`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
