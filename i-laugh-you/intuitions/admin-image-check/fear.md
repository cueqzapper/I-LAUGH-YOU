# Fear — Admin Image Check

- fs.copyFileSync overwriting canonical path is destructive — original image is lost if no variant keeps the original file
- If ComfyUI is down, regenerate returns 502 and no variant is created — user sees error, no data corruption

Last updated: 2026-02-18
