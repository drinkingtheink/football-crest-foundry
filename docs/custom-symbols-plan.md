# Plan: Custom (user-uploaded) symbols

Status: **planned, not started.** Captured 2026-08-09.

Let users upload/paste an SVG and use it as a symbol on a crest, just like a
built-in icon.

## Decisions (locked)

- **Color model: single-fill / recolorable.** Extract path *geometry* only, drop
  colors. Behaves exactly like built-in symbols (recolor, stroke, flip, ring,
  SVG-export outlining). Preserving original multi-color art is explicitly a
  *separate future feature* ("place a logo/image element"), not this.
- **Scope: local-only first.** The "My Symbols" library lives in `localStorage`
  (no cloud sync yet). See "Portability" — the chosen architecture still makes
  the crests that *use* custom symbols self-contained.

## Why this is not trivial

The icon model is fixed: an icon is `{ id, label, group, paths: ['<d>', …],
viewBox?: [w,h] }` rendered with a **single fill** (the instance's color).
Everything downstream assumes it — palette remap, stroke, flip, ring, and the
SVG-export "create outlines." Resolution goes through `iconsById` (from
`src/data/icons.js`), used in `BadgeComposer` (`symPaths`, `symbolTransform`,
`iconVB`) and `App.vue` (sidebar preview/label/viewBox/supportsRing).

Two under-estimated concerns:

1. **Security.** SVG is an XSS vector (`<script>`, `onload=`, `<foreignObject>`,
   external `href`/`<image>`, CSS `url()`). Matters more because symbols get
   *shared*. **Path extraction sidesteps this** — we keep only `d` geometry, never
   render user markup. (A future full-color mode would need a real SVG sanitizer.)
2. **Portability.** A crest using a custom symbol must render for share
   recipients and on other devices, which don't have the uploaded symbol.

## Chosen architecture — embed geometry in the symbol instance

Rather than a global custom-symbol registry (which would need reactive merging
into `iconsById` everywhere and would break shares under local-only), **embed the
extracted geometry into the config symbol instance**:

```js
// a custom symbol instance in config.symbols[]
{ instanceId, iconId: 'custom:<uid>', color, x, y, size, rotation, flipH,
  strokeColor, strokeWidth, clipped,
  customPaths: ['<d>', …], customViewBox: [w, h], customLabel: 'My Logo' }
```

- **Rendering:** in `BadgeComposer`, `symPaths`/`symbolTransform`/`iconVB` use
  `sym.customPaths` / `sym.customViewBox` when present, else `iconsById[sym.iconId]`.
  Same conditional in `App.vue`'s sidebar preview/label/viewBox helpers. Custom
  symbols don't support ring (treat `supportsRing` as false).
- **Self-contained:** geometry travels inside the config, so saved/loaded/cloud/
  shared crests all render the custom symbol **for free** — portability comes
  along even though the *library* is local-only.
- **`loadConfig` guard (critical):** the existing "unknown iconId → swap for a
  random icon" logic must **skip symbols that have `customPaths`** (their id
  `custom:*` isn't in `_iconIdSet`, so without a guard they'd be discarded).

The `localStorage` "My Symbols" library is then just a convenience for the
picker (browse + re-add + delete); the crest itself carries the geometry.

## Component / file plan

1. `src/utils/svgImport.js` (pure) — `svgToSymbol(svgText) → { paths, viewBox } | { error }`:
   - `DOMParser` parse `image/svg+xml`; bail on `<parsererror>`.
   - Read root `viewBox` (or width/height); normalize so origin is `0,0`
     (translate paths by `-minX,-minY`); store `viewBox: [w,h]`.
   - Collect geometry: `path`, `rect`, `circle`, `ellipse`, `polygon`, `polyline`
     (skip `line` — no fill). Convert shapes → path `d`.
   - **Flatten transforms:** accumulate ancestor `transform` attrs down to each
     element and bake into the path via `svgpath` (`.transform(...)`), innermost
     first. (`svgpath` is already a devDependency.)
   - Ignore/strip unsafe/unsupported nodes: `script`, `foreignObject`, `image`,
     `use`, `text`, `style`. If nothing extractable → `{ error }`.
2. `src/composables/useCustomSymbols.js` — reactive, `localStorage`-backed
   (`crest-foundry:symbols`): `customSymbols` ref, `addFromSvg(svgText, label)`,
   `remove(id)`. Ids like `custom:<ts>-<rand>`.
3. `IconPicker.vue` — a **"My Symbols"** group: an upload/paste affordance (file
   input for `.svg` + a paste-markup box) and the saved custom symbols with a
   delete (✕). Clicking one emits the custom symbol data upward (new event, e.g.
   `add-custom`, carrying `paths`/`viewBox`/`label`) — the existing `add-icon`
   only passes an id.
4. `useBadgeConfig.js` — an `addCustomSymbol(def)` (or extend `addSymbol`) that
   creates an instance with `iconId: 'custom:<uid>'` + `customPaths`/
   `customViewBox`/`customLabel` and the usual defaults (color, x, y, size…).
   Plus the `loadConfig` swap guard above.
5. `App.vue` — handle `add-custom`; sidebar symbol row uses custom fields for
   preview paths / label / viewBox.
6. `BadgeComposer.vue` — `symPaths`/`symbolTransform`/`iconVB` prefer `sym.customPaths`/`customViewBox`.

## Input methods

Support both: **file upload** (`.svg`) and **paste SVG markup** (textarea).

## Edge cases / UX

- Dropping colors is by design (single-fill) — no warning needed.
- Warn only when **no geometry** could be extracted (pure text/image SVG).
- Cap stored size (reject absurdly large/complex SVGs, e.g. > ~256 KB or > N paths).
- Very detailed SVGs flatten to one fill — preview in the picker so users see the
  result before adding.
- Consider a light auto-`<title>`/filename → default label.

## Out of scope for v1 (future)

- **Cloud-synced** "My Symbols" library (Supabase) with management/dedup.
- **Full-color logo/image** element (preserve colors) — separate object + sanitizer.
- Per-crest **OG image** already works, and thanks to embedded geometry, shared
  crests with custom symbols will render — but a proper synced library is later.

## Legal / UGC

User uploads are user-generated content. Done for the **local-only** phase (low
exposure — uploads stay in the browser, not hosted/distributed):
- Terms of Use: added a **"Content you upload"** section (user keeps ownership;
  responsible for having the rights; grants a limited license to store/process +
  display when shared; no unlawful/infringing content; we may remove).
- An inline **"only upload SVGs you have the right to use" (+ Terms link)** note
  at the upload point in `MySymbols.vue`.

**Prerequisites for the cloud + sharing phase** (once we *host* and especially
*distribute* uploads between users):
- A proper **UGC license grant** + user **warranties & indemnification**.
- An **Acceptable Use / prohibited-content** policy.
- A **DMCA / notice-and-takedown** process + designated contact (the big one once
  symbols are publicly shareable).
- Basic **moderation / removal** tooling, and a **report** affordance.
- Privacy Policy: note that custom symbols are stored in the account (cloud).

## Related

- Icon model + import tooling: `CLAUDE.md` (Icons section), `scripts/import-game-icons.mjs`.
- Attribution/licensing posture: `src/components/AboutModal.vue`, and note that
  user uploads are the user's own responsibility (add a line to Terms when shipped).
