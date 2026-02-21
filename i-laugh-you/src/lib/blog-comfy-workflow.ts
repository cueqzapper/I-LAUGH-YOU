/**
 * ComfyUI z-image-turbo workflow for blog article image generation.
 * Based on: config/comfy/image_z_image_turbo_ILAUGHYOU-Blog-Articles.json
 * - Base model: z_image_turbo_bf16.safetensors
 * - CLIP: qwen_3_4b.safetensors (Lumina2)
 * - No LoRAs — raw model output, style controlled purely via prompt
 * - Sampler: euler, normal, 7 steps, CFG 1
 * - Resolution: 1200x1024
 */

export function createBlogImageWorkflow(prompt: string): Record<string, unknown> {
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
      inputs: {
        text: prompt,
        clip: ["39", 0],
      },
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
    "83": {
      inputs: {
        text: "",
        clip: ["39", 0],
      },
      class_type: "CLIPTextEncode",
    },
    "84": {
      inputs: {
        conditioning_to: ["42", 0],
        conditioning_from: ["83", 0],
      },
      class_type: "ConditioningConcat",
    },
    "94": {
      inputs: { filename_prefix: "blog", images: ["43", 0] },
      class_type: "SaveImage",
    },
    "118": {
      inputs: { width: 1536, height: 1024, batch_size: 1 },
      class_type: "EmptyLatentImage",
    },
  };
}
