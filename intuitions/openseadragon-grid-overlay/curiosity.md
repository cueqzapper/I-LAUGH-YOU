# Curiosity

- Would a trailing-edge scheduler (pending source + single RAF) outperform hard FPS throttling for UX?
- Are `pan`+`zoom` handlers sufficient for smoothness, or should `animation` be sampled conditionally?
- What queue-delay threshold best correlates with user-visible jitter on target hardware?
- Could OffscreenCanvas help here, or is OSD/main-thread contention the dominant factor?
