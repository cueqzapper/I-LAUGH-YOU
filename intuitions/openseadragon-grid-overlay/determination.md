# Determination

- OpenSeadragon remains the rendering authority; grid overlay is only a visual projection.
- Grid coordinates must stay deterministic from `SOURCE_OFFSETS`, `PIECE_IMAGE_WIDTH`, and `PIECE_IMAGE_HEIGHT`.
- Grid rendering must never mutate viewport state (no pan/zoom side effects).
- Interaction quality requirement: overlay movement must feel locked to image movement during pan/zoom.
- Performance requirement: prioritize smooth interaction over redundant redraw frequency.
