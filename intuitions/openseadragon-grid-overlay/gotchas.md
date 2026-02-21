# Gotchas

- Event storms from OSD (`animation`, `pan`, `zoom`) can overschedule redraws. Prevention: dedupe scheduling with single RAF slot and source counters.
- Over-throttling redraws causes visual snapping/jumping. Prevention: use frame-coalescing (latest pending request), not hard drop under movement.
- High DPR overlay canvases increase work and memory. Prevention: cap overlay DPR and verify visual quality.
- Drawing outside visible bounds wastes cycles. Prevention: clamp viewport/image bounds before row/column loops.
- Missing final draw after throttled bursts leaves stale grid. Prevention: maintain trailing draw request.
