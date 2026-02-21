# Fear — High-Impact Failure Scenarios

- localStorage quota exceeded: saveToStorage already has try/catch — degraded but safe
- Stale sofa placements referencing deleted/invalid image IDs: clampImageId in buildPreviewTile handles out-of-range IDs gracefully
- Drag & drop not supported on old mobile browsers: sofa still renders, just can't place images

Last updated: 2026-02-17
