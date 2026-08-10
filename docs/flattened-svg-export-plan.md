# Plan: Mask-free ("production-ready") SVG export

Status: **planned, not started.** Captured 2026-08-10.

Export SVGs with **no clipPaths/masks** — every colored region a discrete,
selectable, correctly-styled path — so the file is editable and machine-ready in
Illustrator / Inkscape / RIPs without cleanup.

## Motivation (who this is for)

The mask matters only for the **vector** workflow, and only for some methods:

- **Non-issue:** raster/digital (DTG, stickers, mugs) — the **PNG export has no
  masks**. And every pro tool *renders* clipped SVGs fine.
- **Real friction:** screen-print **spot-color separations**, **vinyl cutting**,
  **laser/CNC engraving**, **embroidery digitizing** — these need discrete,
  trimmed, real-outline paths per color. A clip mask isn't that, so the shop must
  flatten it themselves (Pathfinder / Flatten Transparency) — extra labor, error,
  sometimes a cleanup fee or a bounce-back.

So this is a **"print-ready SVG" premium upgrade**, high value for the merch /
apparel segment ("Forge Your Club's Legacy **& Merch**"), low value for digital.
Not a bug fix.

## How clipping works today (the thing to remove)

One `<clipPath>` = the shield shape. The background is drawn as **full-viewBox
shapes** (solid rects, stripe rects, quartered rects, sunburst wedges, sash
bands, checkered squares) and `clip-path`'d to the shield. Overhanging symbols
are clipped the same way. So each visible colored region is really
`shape ∩ shield` — computed live by the clip, never a real path.

Relevant code: `BadgeComposer.vue` (`clipId`/`elementsClipId` clipPaths ~L585;
clipped groups ~L654/671; `bgFill(type)` builds the full-cover pieces ~L453).
Export pipeline: `exportBadge.js` → `buildCleanCrestSvg()` + `outlineTexts()`.

## Core operation

Bake each region into a real path = **boolean intersection** `(shape ∩ shield)`,
at export time, then delete the clipPath defs and `clip-path` attributes.

- **Tool: paper.js** (lazy-loaded on export only, like `opentype.js`). Its
  `intersect()` is **curve-preserving**, so the shield's béziers stay smooth —
  unlike polygon clippers (polygon-clipping / martinez / clipper) which flatten
  curves to line segments.
- **Pass:** in the export builder, replace each clipped `<g>` with a `<g>` of
  intersected `<path>`s, each keeping its own `fill`. Remove `<clipPath>` + all
  `clip-path` attrs.

## Phased plan

**Phase 0 — Spike (do first, ~1-2 hrs).** Wire paper.js and boolean *one* hard
case end-to-end (e.g. a striped shield). Open the result in Illustrator: confirm
paths are clean, curves smooth, no slivers/seams, fills correct. De-risks the
whole feature before committing.

**Phase 1 — Clip-free for the easy cases (low risk).**
- **solid / gradient / radial** backgrounds need *no* boolean — emit the **shield
  path filled** with the color/gradient, no clip.
- Symbols fully **inside** the shield → drop the clip, emit as-is.
- Removes clips for a big chunk of real designs with little risk.

**Phase 2 — Boolean the rest (the meat).**
- **Pattern backgrounds** (halved, quartered, striped, checkered, sash, saltire,
  sunburst): intersect each piece with the shield.
- **Overhanging symbols**: bake the symbol's transform into its path (`svgpath`),
  then intersect with the shield.
- Result: no masks anywhere.

## Risks / edge cases (eyes open)

- **Boolean robustness:** complex cases (48-ray sunburst, fine checkered) = many
  ops → slower export + occasional slivers/**hairline seams** between adjacent
  regions. Mitigate with subtract-vs-intersect for divisions, or a tiny overlap,
  or snap/round coordinates.
- **Path complexity** rises (each stripe becomes its own shield-shaped path).
- **Fill rules** (nonzero vs even-odd) must be preserved through the ops.
- **Bundle:** paper.js ~1 MB, but lazy-loaded on export (no initial-load hit).
- Text already outlines cleanly (`outlineTexts`); border stays a stroked path;
  `paint-order` flatten must still run *after* any new pass (see export notes).
- Keep the existing **auto-fit frame** (expands viewBox for out-of-bounds art).

## Decision gate

Worth building **iff** users order spot-color/cut/embroidery merch. If mostly
digital/DTG (raster), skip — PNG already covers that. Recommend deciding after
the Phase 0 spike proves output quality.

## Related

- Export pipeline + gotchas: `CLAUDE.md` (Phase 2 export), memory
  `export-lessons-learned` (paint-order/Illustrator, fonts, clipPath warning).
- Sibling plan: `docs/custom-symbols-plan.md`.
