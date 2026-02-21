# Fear

- Worst case: overlay appears detached from image during panning/zooming, breaking trust in piece selection.
- Worst case: sustained main-thread pressure causes stutter and delayed input response.
- Worst case: click-to-piece mapping diverges from visible grid due stale overlay state.

Protection mechanisms:
- Keep redraw pipeline deterministic and event-coalesced.
- Track queue delay + skipped reasons in benchmark telemetry.
- Ensure latest viewport state is always drawn after bursts.
