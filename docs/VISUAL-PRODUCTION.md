# Visual Production Engine

Phase 4 converts verified product evidence into real local marketing visual files.

## Output

The visual pack currently contains:

- hero visual
- benefits visual
- features visual
- comparison visual
- offer visual

Each output is a standalone SVG file.

SVG is used as the deterministic source format because it is local, free, inspectable, testable, and does not require a paid image API.

## Product imagery

When a verified product image source is available, the visual can incorporate that image.

When no source image exists, the engine does not fabricate a product image.

Instead the visual is marked:

`NEEDS_SOURCE`

## Evidence provenance

Every visual retains the evidence IDs supporting its copy.

Unknown evidence IDs cause visual QA to fail.

## Comparison graphics

Comparison copy is supplied by the evidence-backed Phase 3 comparison engine.

The renderer does not invent comparison winners.

The visual QA gate rejects unsupported winner/superiority language such as:

- best
- winner
- superior
- beats
- outperforms

## Rights

A publicly accessible product image is not automatically considered commercially licensed.

The visual engine preserves the source image rights state.

Possible states include:

- UNKNOWN_RIGHTS
- USER_PROVIDED
- APPROVED_FOR_DEMO
- APPROVED_FOR_COMMERCIAL_USE

Unknown rights generate a warning.

## Current rendering boundary

Phase 4 creates SVG source assets.

PNG/WebP conversion can be added later without changing the evidence-grounded visual model.

GIF/video generation remains separate because it requires genuine source footage or an explicitly approved slideshow workflow.

The application must not fabricate product demonstrations that were not present in source evidence.

## Next phase

Phase 5 will use these assets to render a complete local desktop/mobile product-page preview.
