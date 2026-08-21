<script setup>
import { computed, ref, reactive, watch, nextTick, onMounted, onUnmounted } from 'vue'
import BadgeComposer from './components/BadgeComposer.vue'
import LogoMark from './components/LogoMark.vue'
import IconPicker from './components/IconPicker.vue'
import MySymbols from './components/MySymbols.vue'
import TextEditor from './components/TextEditor.vue'
import ToastContainer from './components/ToastContainer.vue'
import ColorPicker from './components/ColorPicker.vue'
import ClubPicker from './components/ClubPicker.vue'
import AppBackground from './components/AppBackground.vue'
import SnapshotPanel from './components/SnapshotPanel.vue'
import AboutModal from './components/AboutModal.vue'
import AuthModal from './components/AuthModal.vue'
import TourGuide from './components/TourGuide.vue'
import { useBadgeConfig } from './composables/useBadgeConfig.js'
import { useAuth } from './composables/useAuth.js'
import { saveSnapshot, updateSnapshot, importLocalToCloud, shareDesign, unshareDesign, getSharedDesign } from './utils/snapshots.js'
import ShareModal from './components/ShareModal.vue'
import SharedView from './components/SharedView.vue'
import { bgOptions, imageBgTypes, patternTonedTypes, patternTones } from './data/backgrounds.js'
import { clubs } from './data/clubs.js'
import { shapes, shapesById } from './data/shapes.js'
import { icons, iconsById } from './data/icons.js'
import { crestLibrary } from './data/crestLibrary.js'
import { auroraBg, wavesBg, crisscrossBg, pinstripeBg, diamondsBg, dotsBg, gridBg, zigzagBg } from './utils/patterns.js'
import { randomFonts, loadFont } from './utils/fonts.js'
import { exportCrestPng, exportCrestSvg, crestFilename, copyCrestPngToClipboard, canCopyImageToClipboard } from './utils/exportBadge.js'
import { createSparkField } from './utils/particles.js'
import { useToast } from './composables/useToast.js'

const { addToast } = useToast()

const {
  config,
  initialClub,
  selectedSymbolId,
  selectedTextId,
  selection,
  isSelected,
  toggleSelection,
  setPaletteColor,
  addPaletteColor,
  removePaletteColor,
  movePaletteColor,
  setPalette,
  setShape,
  setNoShield,
  setBackgroundType,
  setStripeCount,
  setSashWidth,
  setSunburstRays,
  setGradientStop,
  addGradientStop,
  removeGradientStop,
  setGradientAngle,
  setBorderColor,
  setBorderWidth,
  addSymbol,
  addCustomSymbol,
  addRect,
  removeSymbol,
  updateSymbol,
  updateSymbolPosition,
  selectSymbol,
  addText,
  ensureDefaultTexts,
  resetTexts,
  removeText,
  updateText,
  updateTextPosition,
  selectText,
  pasteSymbol,
  pasteText,
  deselectAll,
  loadConfig,
} = useBadgeConfig()

const clipboard = ref(null)

const bgTypes = ['solid', 'gradient', 'radial', 'halved-v', 'halved-h', 'quartered', 'diagonal', 'chevron', 'sash', 'striped-v', 'striped-h', 'striped-diagonal', 'checkered', 'saltire', 'sunburst']
const stripeTypes = new Set(['striped-v', 'striped-h', 'striped-diagonal', 'checkered'])

// Auto-scroll sidebar to selected symbol row
const symRefs = {}
function setSymRef(el, instanceId) {
  if (el) symRefs[instanceId] = el
  else delete symRefs[instanceId]
}

watch(selectedSymbolId, async (id) => {
  if (!id) return
  await nextTick()
  setTimeout(() => symRefs[id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 120)
})

const appBg = ref(bgOptions[Math.floor(Math.random() * bgOptions.length)].id)
const patternTone = ref('dark')
const overlay = reactive({ color: config.palette[0] ?? '#000000', opacity: 0.7 })

// Viewport zoom for the crest — preview only (exports clone the SVG, untouched).
// Driven by the wheel when nothing is selected; see forwardScroll. Zoom feeds the
// SVG's intrinsic render size (not a CSS transform scale) so it stays vector-crisp
// instead of upscaling a cached/composited bitmap of the badge-tilt layer.
const CREST_BASE_SIZE = 380
const CREST_SHORT_SCALE = 0.9   // zoom out 10% on short (laptop) viewports so the whole stack fits
const shortViewport = ref(false)
const crestBaseSize = computed(() => shortViewport.value ? Math.round(CREST_BASE_SIZE * CREST_SHORT_SCALE) : CREST_BASE_SIZE)
const crestZoom = ref(1)
const CREST_ZOOM_MIN = 1
const CREST_ZOOM_MAX = 2.25
const crestRenderSize = computed(() => Math.round(crestBaseSize.value * crestZoom.value))

const activeClub = ref(initialClub)
// True while showing an unedited curated crest from the library (drives the badge).
const LIBRARY_CHANCE = 0.03
const isCurated = ref(false)
let curatedLoadPending = false // ignore the library-load's own config mutation
// Any edit to the crest drops the "curated" badge. The load itself batches into
// one watcher trigger, which we skip via the guard.
watch(config, () => {
  if (curatedLoadPending) { curatedLoadPending = false; return }
  if (isCurated.value) isCurated.value = false
}, { deep: true })
const activeClubModified = computed(() => {
  if (!activeClub.value) return false
  const original = activeClub.value.colors.map(c => c.hex.toLowerCase())
  if (original.length !== config.palette.length) return true
  return original.some((c, i) => c !== config.palette[i]?.toLowerCase())
})
// Adding/removing 2+ swatches from a club's palette makes it no longer that
// club — show "Custom". A single auto-appended neutral (withNeutral) stays under
// the threshold, so a freshly applied club is never flagged custom.
const isCustomPalette = computed(() => {
  if (!activeClub.value) return false
  return Math.abs(config.palette.length - activeClub.value.colors.length) >= 2
})

// Count of each iconId currently placed in the design, for the picker to flag
const placedIconCounts = computed(() => {
  const counts = {}
  for (const s of config.symbols) counts[s.iconId] = (counts[s.iconId] ?? 0) + 1
  return counts
})

// The gallery id of the currently-selected symbol, so IconPicker can reveal it.
const selectedIconId = computed(() => {
  const sym = selectedSymbolId.value && config.symbols.find(s => s.instanceId === selectedSymbolId.value)
  if (!sym) return null
  return sym.kind === 'rect' ? 'shape:rect' : sym.iconId
})

function applyClub(club) {
  setPalette(club.colors.map(c => c.hex))
  activeClub.value = club
}

// ── Palette drag-to-reorder ─────────────────────────────────────────────────
const paletteDragIndex = ref(null)
const paletteOverIndex = ref(null)
function onPaletteDragStart(i, e) {
  paletteDragIndex.value = i
  e.dataTransfer.effectAllowed = 'move'
}
function onPaletteDragOver(i) {
  if (paletteDragIndex.value !== null) paletteOverIndex.value = i
}
function onPaletteDrop(i) {
  movePaletteColor(paletteDragIndex.value, i)
  paletteDragIndex.value = null
  paletteOverIndex.value = null
}
function onPaletteDragEnd() {
  paletteDragIndex.value = null
  paletteOverIndex.value = null
}
function openColorInput(e) {
  e.currentTarget.querySelector('input.palette-input-overlay')?.click()
}
watch(() => config.palette[0], c => { if (c) overlay.color = c })

const auroraThumb    = computed(() => auroraBg(config.palette))
const wavesThumb     = computed(() => wavesBg(config.palette, patternTone.value))
const crisscrossThumb = computed(() => crisscrossBg(config.palette, patternTone.value))
const pinstripeThumb = computed(() => pinstripeBg(config.palette, patternTone.value))
const diamondsThumb  = computed(() => diamondsBg(config.palette, patternTone.value))
const dotsThumb      = computed(() => dotsBg(config.palette, patternTone.value))
const gridThumb      = computed(() => gridBg(config.palette, patternTone.value))
const zigzagThumb    = computed(() => zigzagBg(config.palette, patternTone.value))

const _ARROW_DELTA = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }

// Shift/⌘-click toggles membership; a plain click replaces the selection.
function onSelectSymbol(id, additive) { additive ? toggleSelection('symbol', id) : selectSymbol(id) }
function onSelectText(id, additive) { additive ? toggleSelection('text', id) : selectText(id) }

// Move one selected item by (dx, dy) — used by arrow-key nudge for the whole set.
function nudgeSelected(item, dx, dy) {
  if (item.type === 'symbol') {
    const sym = config.symbols.find(s => s.instanceId === item.id)
    if (sym) updateSymbolPosition(item.id, sym.x + dx, sym.y + dy)
  } else {
    const text = config.texts.find(t => t.id === item.id)
    if (!text) return
    if (text.arc) updateText(item.id, { arcX: (text.arcX ?? 100) + dx, arcY: (text.arcY ?? 120) + dy })
    else updateTextPosition(item.id, (text.x ?? 100) + dx, (text.y ?? 120) + dy)
  }
}

// ── Align selected elements to their combined bounding box ────────────────────
// Symbols align by their size box; straight text by its measured getBBox; arc
// text is excluded (its position is a circle centre, not a linear anchor).
const alignOps = [
  { edge: 'left',    title: 'Align left edges' },
  { edge: 'hcenter', title: 'Align horizontal centers' },
  { edge: 'right',   title: 'Align right edges' },
  { edge: 'top',     title: 'Align top edges' },
  { edge: 'vcenter', title: 'Align vertical centers' },
  { edge: 'bottom',  title: 'Align bottom edges' },
]

function isAlignable(s) {
  if (s.type === 'symbol') return true
  const t = config.texts.find(x => x.id === s.id)
  return !!t && !t.arc
}
const alignableCount = computed(() => selection.value.filter(isAlignable).length)

// Measure each selected (non-arc) element as a box with its anchor (ax/ay), its
// measured centre (cx/cy) and edges. Symbols use their size box; straight text a
// live getBBox. Shared by align + distribute.
function selectionBoxes() {
  const svg = badgeComposerRef.value?.svgRootEl
  if (!svg) return []
  const boxes = []
  for (const s of selection.value) {
    if (s.type === 'symbol') {
      const sym = config.symbols.find(x => x.instanceId === s.id)
      if (!sym) continue
      const hw = (sym.kind === 'rect' ? sym.w : sym.size) / 2
      const hh = (sym.kind === 'rect' ? sym.h : sym.size) / 2
      boxes.push({ type: 'symbol', id: s.id, ax: sym.x, ay: sym.y, cx: sym.x, cy: sym.y, hw, hh, left: sym.x - hw, right: sym.x + hw, top: sym.y - hh, bottom: sym.y + hh })
    } else {
      const t = config.texts.find(x => x.id === s.id)
      if (!t || t.arc) continue
      const el = svg.querySelector(`[data-text-id="${CSS.escape(s.id)}"]`)
      if (!el) continue
      const bb = el.getBBox()
      boxes.push({ type: 'text', id: s.id, ax: t.x, ay: t.y, cx: bb.x + bb.width / 2, cy: bb.y + bb.height / 2, hw: bb.width / 2, hh: bb.height / 2, left: bb.x, right: bb.x + bb.width, top: bb.y, bottom: bb.y + bb.height })
    }
  }
  return boxes
}

function moveBox(b, nx, ny) {
  if (b.type === 'symbol') updateSymbolPosition(b.id, nx, ny)
  else updateTextPosition(b.id, nx, ny)
}

function alignSelection(edge) {
  const boxes = selectionBoxes()
  if (boxes.length < 2) return

  const gLeft = Math.min(...boxes.map(b => b.left))
  const gRight = Math.max(...boxes.map(b => b.right))
  const gTop = Math.min(...boxes.map(b => b.top))
  const gBottom = Math.max(...boxes.map(b => b.bottom))
  const gCX = (gLeft + gRight) / 2, gCY = (gTop + gBottom) / 2

  for (const b of boxes) {
    let nx = b.ax, ny = b.ay
    if (edge === 'left')         nx = b.ax + (gLeft + b.hw - b.cx)
    else if (edge === 'right')   nx = b.ax + (gRight - b.hw - b.cx)
    else if (edge === 'hcenter') nx = b.ax + (gCX - b.cx)
    else if (edge === 'top')     ny = b.ay + (gTop + b.hh - b.cy)
    else if (edge === 'bottom')  ny = b.ay + (gBottom - b.hh - b.cy)
    else if (edge === 'vcenter') ny = b.ay + (gCY - b.cy)
    moveBox(b, nx, ny)
  }
}

// The shield's visual centre — the shape path's bbox centre (correct even for
// shapes not centred at y=120). Falls back to the viewBox centre in No-Shield mode.
function shieldCenter() {
  const pathEl = badgeComposerRef.value?.shapePathEl
  if (pathEl && !config.noShield) {
    const bb = pathEl.getBBox()
    return { cx: bb.x + bb.width / 2, cy: bb.y + bb.height / 2 }
  }
  return { cx: 100, cy: 120 }
}

// Move the whole selection so its bounding-box centre sits on the shield centre
// (rigid translate — relative layout preserved). Works for a single element too.
function centerOnShield() {
  const boxes = selectionBoxes()
  if (!boxes.length) return
  const { cx, cy } = shieldCenter()
  const gLeft = Math.min(...boxes.map(b => b.left))
  const gRight = Math.max(...boxes.map(b => b.right))
  const gTop = Math.min(...boxes.map(b => b.top))
  const gBottom = Math.max(...boxes.map(b => b.bottom))
  const dx = cx - (gLeft + gRight) / 2
  const dy = cy - (gTop + gBottom) / 2
  for (const b of boxes) moveBox(b, b.ax + dx, b.ay + dy)
}

// Snap each element (individually) onto one of the shield's middle axes: the
// vertical spine (x → cx) or the horizontal axis (y → cy). Unlike centerOnShield
// this keeps the other coordinate, so a vertical stack lines up on the spine
// without collapsing onto a single point.
function centerOnShieldAxis(axis) {
  const boxes = selectionBoxes()
  if (!boxes.length) return
  const { cx, cy } = shieldCenter()
  for (const b of boxes) {
    if (axis === 'v') moveBox(b, b.ax + (cx - b.cx), b.ay)
    else              moveBox(b, b.ax, b.ay + (cy - b.cy))
  }
}

const shieldAxisOps = [
  { axis: 'v', title: 'Center on shield’s vertical axis' },
  { axis: 'h', title: 'Center on shield’s horizontal axis' },
]

// Distribute even GAPS between elements along an axis (accounts for differing
// sizes). Endpoints hold; the middle elements are respaced so the empty space
// between adjacent edges is equal.
function distributeSelection(axis) {
  const boxes = selectionBoxes()
  if (boxes.length < 3) return
  const horiz = axis === 'h'

  boxes.sort((a, b) => (horiz ? a.left - b.left : a.top - b.top))
  const start = horiz ? boxes[0].left : boxes[0].top
  const end   = horiz ? boxes[boxes.length - 1].right : boxes[boxes.length - 1].bottom
  const sizeOf = b => (horiz ? b.right - b.left : b.bottom - b.top)
  const totalSize = boxes.reduce((s, b) => s + sizeOf(b), 0)
  const gap = (end - start - totalSize) / (boxes.length - 1)

  let cursor = start
  for (const b of boxes) {
    const size = sizeOf(b)
    const newCentre = cursor + size / 2
    if (horiz) moveBox(b, b.ax + (newCentre - b.cx), b.ay)
    else       moveBox(b, b.ax, b.ay + (newCentre - b.cy))
    cursor += size + gap
  }
}

const ALIGN_ICONS = {
  left:    '<line x1="2.5" y1="2" x2="2.5" y2="14" stroke="#e8c84a" stroke-width="1.4"/><rect x="2.5" y="4.4" width="9" height="2.2" rx="1" fill="currentColor"/><rect x="2.5" y="9.4" width="5.5" height="2.2" rx="1" fill="currentColor"/>',
  right:   '<line x1="13.5" y1="2" x2="13.5" y2="14" stroke="#e8c84a" stroke-width="1.4"/><rect x="4.5" y="4.4" width="9" height="2.2" rx="1" fill="currentColor"/><rect x="8" y="9.4" width="5.5" height="2.2" rx="1" fill="currentColor"/>',
  hcenter: '<line x1="8" y1="2" x2="8" y2="14" stroke="#e8c84a" stroke-width="1.4"/><rect x="3.5" y="4.4" width="9" height="2.2" rx="1" fill="currentColor"/><rect x="5.25" y="9.4" width="5.5" height="2.2" rx="1" fill="currentColor"/>',
  top:     '<line x1="2" y1="2.5" x2="14" y2="2.5" stroke="#e8c84a" stroke-width="1.4"/><rect x="4.4" y="2.5" width="2.2" height="9" rx="1" fill="currentColor"/><rect x="9.4" y="2.5" width="2.2" height="5.5" rx="1" fill="currentColor"/>',
  bottom:  '<line x1="2" y1="13.5" x2="14" y2="13.5" stroke="#e8c84a" stroke-width="1.4"/><rect x="4.4" y="4.5" width="2.2" height="9" rx="1" fill="currentColor"/><rect x="9.4" y="8" width="2.2" height="5.5" rx="1" fill="currentColor"/>',
  vcenter: '<line x1="2" y1="8" x2="14" y2="8" stroke="#e8c84a" stroke-width="1.4"/><rect x="4.4" y="3.5" width="2.2" height="9" rx="1" fill="currentColor"/><rect x="9.4" y="5.25" width="2.2" height="5.5" rx="1" fill="currentColor"/>',
}
function alignIcon(edge) { return `<svg viewBox="0 0 16 16" width="15" height="15">${ALIGN_ICONS[edge]}</svg>` }

const SHIELD_OUTLINE = '<path d="M8 1.6 3.2 3.3V7.8c0 3 2.4 4.9 4.8 6 2.4-1.1 4.8-3 4.8-6V3.3z" fill="none" stroke="#e8c84a" stroke-width="1.3" stroke-linejoin="round"/>'
const SHIELD_CENTER_ICON = SHIELD_OUTLINE + '<circle cx="8" cy="7.1" r="1.7" fill="currentColor"/>'
function shieldCenterIcon() { return `<svg viewBox="0 0 16 16" width="15" height="15">${SHIELD_CENTER_ICON}</svg>` }

const SHIELD_AXIS_ICONS = {
  v: SHIELD_OUTLINE + '<line x1="8" y1="2.2" x2="8" y2="12.6" stroke="currentColor" stroke-width="1.2" stroke-dasharray="1.5 1.3"/>',
  h: SHIELD_OUTLINE + '<line x1="3" y1="7.2" x2="13" y2="7.2" stroke="currentColor" stroke-width="1.2" stroke-dasharray="1.5 1.3"/>',
}
function shieldAxisIcon(axis) { return `<svg viewBox="0 0 16 16" width="15" height="15">${SHIELD_AXIS_ICONS[axis]}</svg>` }

const distributeOps = [
  { axis: 'h', title: 'Distribute horizontal spacing' },
  { axis: 'v', title: 'Distribute vertical spacing' },
]
const DIST_ICONS = {
  h: '<rect x="1.5" y="3" width="2" height="10" rx="1" fill="currentColor"/><rect x="7" y="3" width="2" height="10" rx="1" fill="currentColor"/><rect x="12.5" y="3" width="2" height="10" rx="1" fill="currentColor"/>',
  v: '<rect x="3" y="1.5" width="10" height="2" rx="1" fill="currentColor"/><rect x="3" y="7" width="10" height="2" rx="1" fill="currentColor"/><rect x="3" y="12.5" width="10" height="2" rx="1" fill="currentColor"/>',
}
function distIcon(axis) { return `<svg viewBox="0 0 16 16" width="15" height="15">${DIST_ICONS[axis]}</svg>` }

function onPickIcon(iconId) {
  if (iconId === 'shape:rect') { addRect(); return } // gallery rectangle tile
  const sel = selectedSymbolId.value && config.symbols.find(s => s.instanceId === selectedSymbolId.value)
  if (sel && sel.kind !== 'rect') {
    // swap to a built-in icon — clear any custom geometry from the previous one
    updateSymbol(selectedSymbolId.value, { iconId, customPaths: undefined, customViewBox: undefined, customLabel: undefined })
  } else {
    addSymbol(iconId)                                // nothing (or a rect) selected → add new
  }
}

// { id, label, paths, viewBox }. Mirror onPickIcon: swap the selected symbol in
// place (built-in↔custom or custom↔custom), otherwise add a new one.
function onAddCustom(cs) {
  const sel = selectedSymbolId.value && config.symbols.find(s => s.instanceId === selectedSymbolId.value)
  if (sel && sel.kind !== 'rect') {
    updateSymbol(selectedSymbolId.value, { iconId: cs.id, customPaths: cs.paths, customViewBox: cs.viewBox, customLabel: cs.label })
  } else {
    addCustomSymbol(cs)
  }
}

// Placed-symbols thumbnail: use the icon's own viewBox, and scale strokeWidth
// (authored in 100-unit space) to it so the preview matches the badge.
function symPreviewVB(sym) {
  const vb = sym.customViewBox || iconsById[sym.iconId]?.viewBox
  return vb ? `0 0 ${vb[0]} ${vb[1]}` : '0 0 100 100'
}
function symPreviewStroke(sym) {
  const vb = sym.customViewBox ?? iconsById[sym.iconId]?.viewBox ?? [100, 100]
  return sym.strokeWidth * Math.max(vb[0], vb[1]) / 100
}
// Scale a rectangle's w/h to fit the ~30px sidebar preview, keeping its ratio.
function rectPreview(sym) {
  const scale = 30 / (Math.max(sym.w, sym.h) || 1)
  return { w: sym.w * scale, h: sym.h * scale }
}

// ── Crest stage: pointer tilt ──────────────────────────────────────────────
const badgeTiltRef = ref(null)
const reduceMotion = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const tilt = reactive({ rx: 0, ry: 0 })
const isDraggingEl = ref(false)

// Searing-hot cursor glow — follows the pointer over the stage, but not over the
// crest itself (where the tilt takes over).
const hotCursor = reactive({ x: 0, y: 0 })
const overCrest = ref(false)

// Tilt is a hover-only affordance — flatten and suspend it while dragging so
// it doesn't fight precise alignment.
function onElDragStart() { isDraggingEl.value = true; tilt.rx = 0; tilt.ry = 0 }
function onElDragEnd() { isDraggingEl.value = false }

function onBadgeMove(e) {
  overCrest.value = true // over the crest → suppress the hot-cursor glow
  // Hold the crest flat while editing — tilt fights precise placement/resizing.
  if (reduceMotion || isDraggingEl.value || selection.value.length || !badgeTiltRef.value) return
  const r = badgeTiltRef.value.getBoundingClientRect()
  const px = (e.clientX - r.left) / r.width
  const py = (e.clientY - r.top) / r.height
  const MAX = 7 // degrees
  tilt.ry = (px - 0.5) * 2 * MAX
  tilt.rx = -(py - 0.5) * 2 * MAX
}
function onBadgeLeave() {
  tilt.rx = 0; tilt.ry = 0
  overCrest.value = false
}

// Flatten the crest the moment anything is selected (incl. via a sidebar click,
// where the badge isn't being hovered), so it isn't left tilted mid-edit.
watch(() => selection.value.length, (n) => { if (n) { tilt.rx = 0; tilt.ry = 0 } })

// ── Welding sparks ──────────────────────────────────────────────────────────
// While the crest is IDLE, a weld head sweeps once around the shield outline
// every WELD_CYCLE_MS, spraying a dense sputter of sparks from behind the seam
// — like welding, not fireworks. Fires on a timer regardless of hover.
// Idle = nothing selected/being edited and not mid-drag.
const WELD_LAP_MS = 1600       // duration of one full rotation around the outline
const WELD_EMIT = 20           // sparks emitted per frame at the weld head
const WELD_CYCLE_MS = 60000    // how often the idle spark circle fires
const weldCanvas = ref(null)
let weldField = null
let idleWeldTimer = null

function crestIdle() { return selection.value.length === 0 && !isDraggingEl.value }

// A one-shot weld lap around the outline — a flourish of sparks. Fired both by
// actions (export / copy / share) and by the idle cadence timer below.
let weldPulseRaf = null
let weldPulsePhase = 0
let weldPulseLastT = 0
function weldPulseTick(now) {
  const comp = badgeComposerRef.value
  const canvas = weldCanvas.value
  if (!comp?.outlinePointAt || !canvas || !weldField) { weldPulseRaf = null; return }
  const dt = Math.min(64, now - weldPulseLastT); weldPulseLastT = now
  weldPulsePhase += dt / WELD_LAP_MS
  const r = canvas.getBoundingClientRect()
  const p = comp.outlinePointAt(weldPulsePhase)
  if (p) weldField.weld(p.x - r.left, p.y - r.top, p.nx, p.ny, p.tx, p.ty, WELD_EMIT)
  if (weldPulsePhase >= 1) { weldPulseRaf = null; return }
  weldPulseRaf = requestAnimationFrame(weldPulseTick)
}
function pulseWeld() {
  if (reduceMotion || !weldField || !badgeComposerRef.value?.outlinePointAt || !weldCanvas.value) return
  weldPulsePhase = 0
  weldPulseLastT = performance.now()
  if (!weldPulseRaf) weldPulseRaf = requestAnimationFrame(weldPulseTick)
}

// Ambient idle flourish: fire a one-shot weld lap on a fixed cadence — hover or
// not — as long as the crest is idle and motion isn't reduced.
function startIdleWeld() {
  if (reduceMotion) return
  clearInterval(idleWeldTimer)
  idleWeldTimer = setInterval(() => { if (crestIdle()) pulseWeld() }, WELD_CYCLE_MS)
}

function onKeyDown(e) {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return

  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault()
    snapshotPanelRef.value?.startSave()
    return
  }

  if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
    if (selectedSymbolId.value) {
      const sym = config.symbols.find(s => s.instanceId === selectedSymbolId.value)
      if (sym) clipboard.value = { type: 'symbol', data: { ...sym } }
    } else if (selectedTextId.value) {
      const text = config.texts.find(t => t.id === selectedTextId.value)
      if (text) clipboard.value = { type: 'text', data: { ...text } }
    }
    return
  }

  if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
    if (!clipboard.value) return
    e.preventDefault()
    if (clipboard.value.type === 'symbol') pasteSymbol(clipboard.value.data)
    else pasteText(clipboard.value.data)
    return
  }

  if (e.key in _ARROW_DELTA) {
    e.preventDefault()
    const step = e.shiftKey ? 10 : 1
    const [dx, dy] = _ARROW_DELTA[e.key].map(v => v * step)
    selection.value.forEach(item => nudgeSelected(item, dx, dy))
    return
  }

  if (e.key === 'Escape') { deselectAll(); return }
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); randomizeAll(); return }
  if (e.key !== 'Delete' && e.key !== 'Backspace') return
  // copy the list first — removeSymbol/removeText mutate the selection
  ;[...selection.value].forEach(item => item.type === 'symbol' ? removeSymbol(item.id) : removeText(item.id))
}

const controlsPane    = ref(null)
const particleCanvas  = ref(null)
const badgeWrap       = ref(null)
const snapshotPanelRef = ref(null)

// The saved design currently being edited (set on load / after a save), so the
// next save can update it in place rather than spawn a copy. Cleared when a
// fresh crest is forged.
const activeDesign = ref(null)   // { id, name, source } | null

// Edit-session persistence: while you're editing a SAVED crest, keep the live
// working state (crest + scene) in localStorage so a refresh drops you back into
// that session. When you're not editing a saved crest (a forged/random crest,
// activeDesign === null), the key is cleared so refresh forges fresh, as before.
const SESSION_KEY = 'crest-foundry:session'
let sessionTimer = null

function persistSession() {
  clearTimeout(sessionTimer)
  sessionTimer = setTimeout(() => {
    if (!activeDesign.value) { try { localStorage.removeItem(SESSION_KEY) } catch {} return }
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        activeDesign: activeDesign.value,
        config: JSON.parse(JSON.stringify(config)),
        appBg: appBg.value,
        patternTone: patternTone.value,
        overlay: { color: overlay.color, opacity: overlay.opacity },
      }))
    } catch {}
  }, 400)
}

function restoreSession() {
  let saved = null
  try { saved = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') } catch { saved = null }
  if (!saved?.activeDesign || !saved.config) return false
  loadConfig(saved.config)
  loadConfigFonts(saved.config)
  activeDesign.value = saved.activeDesign
  if (saved.appBg) appBg.value = saved.appBg
  if (saved.patternTone) patternTone.value = saved.patternTone
  if (saved.overlay) { overlay.color = saved.overlay.color; overlay.opacity = saved.overlay.opacity }
  isCurated.value = false
  return true
}

watch([activeDesign, config, appBg, patternTone, overlay], persistSession, { deep: true })

async function doSaveSnapshot(name) {
  const svgEl = badgeWrap.value?.querySelector('svg')
  try {
    const saved = await saveSnapshot(name, config, svgEl)
    // A brand-new save becomes the active design — subsequent saves update it.
    activeDesign.value = { id: saved.id, name: saved.name, source: saved.source ?? 'local' }
    // Share → Save → Create link: if Share kicked off this save, open the link now.
    if (pendingShare.value) {
      pendingShare.value = false
      if (activeDesign.value.source === 'cloud') doShareDesign(activeDesign.value)
    }
    return saved
  } catch (e) {
    if (e.code === 'QUOTA') {
      addToast('Snapshot storage is full — delete a few snapshots and try again.', { type: 'tip', duration: 6000 })
      return false
    }
    addToast('Couldn’t save your crest — please try again.', { type: 'error' })
    return false
  }
}

async function doUpdateSnapshot(name) {
  const target = activeDesign.value
  if (!target) return doSaveSnapshot(name)
  const svgEl = badgeWrap.value?.querySelector('svg')
  try {
    const updated = await updateSnapshot(target.id, target.source, name, config, svgEl)
    activeDesign.value = { id: updated.id, name: updated.name, source: updated.source ?? target.source }
    addToast(`Updated “${updated.name}”`, { type: 'success', duration: 2500 })
    return updated
  } catch (e) {
    addToast('Couldn’t update your crest — please try again.', { type: 'error' })
    return false
  }
}

// --- Sharing ---
const shareModalOpen = ref(false)
const shareUrl = ref('')
const shareBusy = ref(false)
const sharingSnap = ref(null)
// Set when Share was clicked on an unsaved crest: create the link right after
// the save completes (Share → Save → Create link).
const pendingShare = ref(false)

async function doShareDesign(snap) {
  sharingSnap.value = snap
  shareUrl.value = ''
  shareBusy.value = true
  shareModalOpen.value = true
  try {
    const { url } = await shareDesign(snap.id)
    shareUrl.value = url
  } catch (e) {
    shareModalOpen.value = false
    addToast('Couldn’t create a share link — please try again.', { type: 'error' })
  } finally {
    shareBusy.value = false
  }
}

async function doRevokeShare() {
  const snap = sharingSnap.value
  if (!snap) return
  try {
    await unshareDesign(snap.id)
    addToast('Sharing turned off', { type: 'success', duration: 2500 })
    shareModalOpen.value = false
  } catch {
    addToast('Couldn’t stop sharing — please try again.', { type: 'error' })
  }
}

// --- Shared view (opening a ?c=<token> link) ---
const sharedActive  = ref(new URLSearchParams(location.search).has('c'))
// The mobile shim is dismissable ONLY on a share link (so a recipient can view
// the crest on their phone). Re-arms the moment we leave the shared view.
const gateDismissed = ref(false)
watch(sharedActive, (v) => { if (!v) gateDismissed.value = false })
const sharedLoading = ref(sharedActive.value)
const sharedError   = ref(false)
const sharedConfig  = ref(null)
const sharedName    = ref('')
// Like forging a crest, the shared page rolls its own random backdrop each load.
const sharedBg      = ref(bgOptions[Math.floor(Math.random() * bgOptions.length)].id)
const sharedTone    = ref(patternTones[Math.floor(Math.random() * patternTones.length)])
// Its own overlay state, tinted from the shared crest's palette (not the editor's).
const sharedOverlay = reactive({ color: '#000000', opacity: 0.7 })

onMounted(async () => {
  if (!sharedActive.value) { restoreSession(); maybeStartTour(); return }
  const token = new URLSearchParams(location.search).get('c')
  try {
    const d = await getSharedDesign(token)
    if (d) {
      sharedConfig.value = d.config
      sharedName.value = d.name
      sharedOverlay.color = d.config?.palette?.[0] ?? '#000000'
      loadConfigFonts(d.config)          // so the shared crest renders in its real fonts
      document.title = `${d.name} — Crest Foundry`
    } else {
      sharedError.value = true
    }
  } catch {
    sharedError.value = true
  } finally {
    sharedLoading.value = false
  }
})

function clearShareParam() {
  history.replaceState(null, '', location.pathname)
  document.title = 'Crest Foundry — Club Crest Creator'
}

function onRemixShared() {
  if (sharedConfig.value) {
    loadConfig(sharedConfig.value)
    loadConfigFonts(sharedConfig.value)
    activeDesign.value = null   // a remix is a fresh design, not an edit of the original
  }
  clearShareParam()
  sharedActive.value = false
}

function onCloseShared() {
  clearShareParam()
  sharedActive.value = false
}

function stepSharedBg(dir) {
  const idx = bgOptions.findIndex(o => o.id === sharedBg.value)
  sharedBg.value = bgOptions[(idx + dir + bgOptions.length) % bgOptions.length].id
}

const isPulsing      = ref(false)
const isBadgeActive  = ref(false)
let   sparkField     = null
let   pulseTimer     = null
let   burstTimer     = null

// Foundry sparks off the moving cursor — throttled, intermittent, speed-scaled.
let _lastSparkT = 0
let _lastSparkPos = null
function onStageMove(e) {
  if (reduceMotion || !sparkField) return
  const c = particleCanvas.value
  if (!c) return
  const cr = c.getBoundingClientRect()
  const x = e.clientX - cr.left
  const y = e.clientY - cr.top
  hotCursor.x = x; hotCursor.y = y // track the hot-cursor glow position
  const now = performance.now()
  let speed = 0
  if (_lastSparkPos) {
    const dt = Math.max(1, now - _lastSparkPos.t)
    speed = Math.hypot(x - _lastSparkPos.x, y - _lastSparkPos.y) / dt // px/ms
  }
  _lastSparkPos = { x, y, t: now }
  if (now - _lastSparkT < 50) return  // throttle
  if (speed < 0.06) return            // near-still → no sparks
  if (Math.random() < 0.45) return    // skip ~45% → intermittent
  _lastSparkT = now
  const n = speed > 0.5 ? 2 : 1
  sparkField.emit(x, y, n, Math.min(1.5, 0.65 + speed))
}

// Denser ember trail while dragging a symbol/text — like moving hot metal.
let _emberT = 0
function onDragEmber(clientX, clientY) {
  if (reduceMotion || !sparkField) return
  const c = particleCanvas.value
  if (!c) return
  const cr = c.getBoundingClientRect()
  const x = clientX - cr.left, y = clientY - cr.top
  sparkField.drag(x, y)                 // molten trail — every move, for a smooth line
  const now = performance.now()
  if (now - _emberT < 28) return        // throttle only the sparks thrown off it
  _emberT = now
  sparkField.emit(x, y, 2 + Math.floor(Math.random() * 2), 1)
}

// Intermittent embers drifting up from the forge glow at the base of the stage.
let emberTimer = null
function spitEmber() {
  const c = particleCanvas.value
  if (sparkField && c) {
    const w = c.width, h = c.height
    sparkField.float(w * (0.12 + Math.random() * 0.76), h - (8 + Math.random() * 34))
    if (Math.random() < 0.25) sparkField.float(w * (0.12 + Math.random() * 0.76), h - (8 + Math.random() * 34))
  }
  emberTimer = setTimeout(spitEmber, 500 + Math.random() * 1300)
}

function forwardScroll(e) {
  // Nothing selected: the wheel zooms the crest in the viewport. With a
  // selection, keep forwarding the scroll to the sidebar so its controls scroll.
  if (!selection.value.length) {
    const next = crestZoom.value * (1 - e.deltaY * 0.0015)
    crestZoom.value = Math.min(CREST_ZOOM_MAX, Math.max(CREST_ZOOM_MIN, next))
    return
  }
  controlsPane.value?.scrollBy({ top: e.deltaY, behavior: 'auto' })
}

function sizeCanvas() {
  for (const c of [particleCanvas.value, weldCanvas.value]) {
    if (!c) continue
    c.width  = c.offsetWidth
    c.height = c.offsetHeight
  }
}

function triggerEffects() {
  const c = particleCanvas.value
  const b = badgeWrap.value
  if (!c || !b) return

  // Badge center in canvas coordinates
  const cr = c.getBoundingClientRect()
  const br = b.getBoundingClientRect()
  const cx = br.left + br.width  / 2 - cr.left
  const cy = br.top  + br.height / 2 - cr.top

  sparkField?.burst(cx, cy)

  // Badge pulse
  isPulsing.value = false
  clearTimeout(pulseTimer)
  nextTick(() => {
    isPulsing.value = true
    pulseTimer = setTimeout(() => { isPulsing.value = false }, 400)
  })
}

// Watch only design-relevant fields — excludes x/y positions so drag
// events and range-slider scrubbing don't spam the particle burst.
const _designFingerprint = computed(() => JSON.stringify({
  shapeId:    config.shapeId,
  palette:    config.palette,
  background: config.background,
  border:     config.border,
  // fontFamily is intentionally excluded — hovering the font picker live-previews
  // fonts, and we don't want the forge burst/pulse firing on every hover.
  texts:   config.texts.map(({ id, content, fontWeight, fontSize, color, letterSpacing, arc, arcRx, arcRy }) =>
             ({ id, content, fontWeight, fontSize, color, letterSpacing, arc, arcRx, arcRy })),
  symbols: config.symbols.map(({ instanceId, iconId, color, size }) =>
             ({ instanceId, iconId, color, size })),
}))

watch(_designFingerprint, () => {
  clearTimeout(burstTimer)
  burstTimer = setTimeout(triggerEffects, 350)
})

const currentShapeFit = computed(() => shapesById[config.shapeId]?.arcFit ?? null)

function fitArcToShape(textId) {
  const fit = currentShapeFit.value
  if (!fit) return
  updateText(textId, { arcRx: fit.rx, arcRy: fit.ry, arcX: fit.cx, arcY: fit.cy })
}

function onDocumentClick(e) {
  if (!selection.value.length) return
  if (e.target.closest('svg')) return
  if (e.target.closest('.symbol-item, .text-item')) return
  if (e.target.closest('.fp-panel')) return // teleported font-picker panel — keep the text selected
  if (e.target.closest('.tour-root')) return // welcome tour selects a symbol to show its controls — don't fight it
  deselectAll()
}

// On phones the app is gated behind a shim; keep the crest beneath it lively by
// forging a fresh one every few seconds (skipped under reduced motion).
let mobileForgeTimer = null
let mobileMql = null
let shortMql = null
function updateShortViewport() { shortViewport.value = !!shortMql?.matches }
function updateMobileForge() {
  clearInterval(mobileForgeTimer)
  mobileForgeTimer = null
  if (mobileMql?.matches && !reduceMotion) {
    mobileForgeTimer = setInterval(() => randomizeAll(), 7000)
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('resize', sizeCanvas)
  document.addEventListener('click', onDocumentClick)
  mobileMql = window.matchMedia('(max-width: 768px)')
  mobileMql.addEventListener('change', updateMobileForge)
  updateMobileForge()
  shortMql = window.matchMedia('(max-height: 860px)')
  shortMql.addEventListener('change', updateShortViewport)
  updateShortViewport()
  nextTick(() => {
    sizeCanvas()
    if (particleCanvas.value) {
      sparkField = createSparkField(particleCanvas.value)
      if (!reduceMotion) spitEmber()
    }
    if (weldCanvas.value) weldField = createSparkField(weldCanvas.value)
    startIdleWeld()
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('resize', sizeCanvas)
  document.removeEventListener('click', onDocumentClick)
  mobileMql?.removeEventListener('change', updateMobileForge)
  shortMql?.removeEventListener('change', updateShortViewport)
  clearInterval(mobileForgeTimer)
  clearTimeout(sessionTimer)
  clearTimeout(emberTimer)
  clearInterval(idleWeldTimer)
  cancelAnimationFrame(weldPulseRaf)
  sparkField?.stop()
  weldField?.stop()
})

function onSymbolOutsideBounds(instanceId) {
  addToast('Symbol outside badge bounds', {
    type: 'tip',
    duration: 7000,
    action: { label: 'Go Free', fn: () => updateSymbol(instanceId, { clipped: false }) },
  })
}

function randomizeColors() {
  const club = clubs[Math.floor(Math.random() * clubs.length)]
  setPalette(club.colors.map(c => c.hex))
  activeClub.value = club
}

// A loaded config references fonts that may not be fetched yet — load them so
// text renders in its real face, not a wider system fallback.
function loadConfigFonts(cfg) {
  const families = [...new Set((cfg?.texts ?? []).map(t => t.fontFamily).filter(Boolean))]
  families.forEach(loadFont)
}

function onLoadSnapshot(snap) {
  loadConfig(snap.config)
  loadConfigFonts(snap.config)
  activeDesign.value = { id: snap.id, name: snap.name, source: snap.source ?? 'local' }
  isCurated.value = false // a loaded snapshot isn't the library's curated crest
}

// A saved design was deleted — if it was the one we're editing, stop tracking it.
function onSnapshotDeleted(id) {
  if (activeDesign.value?.id === id) activeDesign.value = null
}

function startOver() {
  // "Start Over" forges a completely fresh random crest, just like Space / the
  // Forge button — not a reset to the static default.
  randomizeAll()
}

function randomizeAll() {
  // A forged crest is a new design, not an edit of whatever was loaded.
  activeDesign.value = null
  const leavingCurated = isCurated.value
  // Small chance to surface a curated crest from the library instead of a
  // procedurally-generated one (loaded verbatim).
  if (crestLibrary.length && Math.random() < LIBRARY_CHANCE) {
    const pick = crestLibrary[Math.floor(Math.random() * crestLibrary.length)]
    curatedLoadPending = true
    loadConfig(pick.config)   // clears selection; missing icons swapped in loadConfig
    loadConfigFonts(pick.config)
    isCurated.value = true
    activeClub.value = null
    return
  }
  isCurated.value = false
  // Forging away from a curated crest: reset to the default club-name + monogram
  // so the curated entry's text (content, extra rows, arc) doesn't carry over.
  if (leavingCurated) resetTexts()

  const club     = clubs[Math.floor(Math.random() * clubs.length)]
  const shape    = shapes[Math.floor(Math.random() * shapes.length)]
  const bgType   = bgTypes[Math.floor(Math.random() * bgTypes.length)]
  const third    = club.colors[2]?.hex

  setPalette(club.colors.map(c => c.hex))
  setShape(shape.id)
  setBackgroundType(bgType)
  setStripeCount(Math.floor(Math.random() * 15) + 2)
  setBorderColor(third || '#ffffff')
  setBorderWidth(third ? Math.floor(Math.random() * 5) + 4 : 0)
  appBg.value = bgOptions[Math.floor(Math.random() * bgOptions.length)].id
  patternTone.value = patternTones[Math.floor(Math.random() * patternTones.length)]

  ;[...config.symbols].forEach(s => removeSymbol(s.instanceId))
  {
    addSymbol(icons[Math.floor(Math.random() * icons.length)].id)
    // Random symbols always take the palette's 3rd colour as their fill, with a
    // contrasting stroke so the shape never disappears against it.
    const fill = config.palette[2] ?? config.palette[config.palette.length - 1] ?? '#ffffff'
    const strokeColor = config.palette.find(c => c.toLowerCase() !== fill.toLowerCase())
      ?? (fill.toLowerCase() === '#000000' ? '#ffffff' : '#000000')
    updateSymbol(selectedSymbolId.value, {
      color: fill,
      size: 90 + Math.floor(Math.random() * 45), // bolder than a manual picker-add (default 72)
      strokeWidth: 3,
      strokeColor,
    })
  }

  // If the user forged after deleting every text, bring the defaults back so the
  // crest still gets its name + monogram styled below.
  ensureDefaultTexts()

  const nameFont = randomFonts[Math.floor(Math.random() * randomFonts.length)].family
  const monogramFont = randomFonts[Math.floor(Math.random() * randomFonts.length)].family
  loadFont(nameFont)
  loadFont(monogramFont)

  // Intermittently outline the (white) crest text with a bold contrasting edge,
  // like a screen-printed kit. Otherwise clear any stroke left by a prior forge.
  let textStroke = { strokeWidth: 0 }
  if (Math.random() < 0.4) {
    const lum = hex => {
      const h = hex.replace('#', '')
      return 0.299 * parseInt(h.slice(0, 2), 16) + 0.587 * parseInt(h.slice(2, 4), 16) + 0.114 * parseInt(h.slice(4, 6), 16)
    }
    const strokeColor = [...config.palette].sort((a, b) => lum(a) - lum(b))[0] || '#000000'
    textStroke = { strokeColor, strokeWidth: Math.round((1.25 + Math.random() * 1.75) / 0.25) * 0.25 }
  }
  updateText('club-name', { y: 55, fontFamily: nameFont, ...textStroke })
  updateText('monogram', { y: 185, fontFamily: monogramFont, ...textStroke })
  activeClub.value = club
  // A freshly forged crest shows what it *is* — nothing selected, no glow.
  deselectAll()
}

const showScene = ref(true)
const showAbout = ref(false)
const showAuth = ref(false)
const { isSignedIn, email: authEmail, signOut, isSupabaseConfigured } = useAuth()

// --- First-run welcome tour ---
const ONBOARDED_KEY = 'crest-foundry:onboarded'
const showWelcome = ref(false)
const symbolsDemo = ref(false)
// While the tour showcases the Placed Symbols panel, keep the first symbol
// selected so its expanded controls are on display; deselect when we move on.
let tourSelectedForStep = false
function onTourStep(target) {
  symbolsDemo.value = target === 'symbols'
  if (target === 'placed' && config.symbols.length) {
    selectSymbol(config.symbols[0].instanceId)
    tourSelectedForStep = true
  } else if (tourSelectedForStep) {
    deselectAll()
    tourSelectedForStep = false
  }
}
const tourSteps = [
  {
    logo: true,
    title: 'Welcome to Crest Foundry',
    body: 'Forge a crest for any club — football, scholastic, recreational, social, role-playing, and more. Let’s take a quick lap around the shop.',
  },
  {
    target: 'forge',
    placement: 'bottom',
    title: 'Forge a Random Crest',
    body: 'Stuck for ideas? Hit <strong>Forge Random Crest</strong> for an instant new design — shape, palette, and symbols all at once. (Tap <strong>Space</strong> anytime to reforge.)',
  },
  {
    target: 'crest',
    placement: 'left',
    title: 'Make It Yours',
    body: '<strong>Drag</strong> symbols and text right on the crest to arrange them. Arrow keys nudge; <strong>Shift+Arrow</strong> jumps 10px. Copy &amp; paste with <strong>⌘C / ⌘V</strong>.',
  },
  {
    target: 'colors',
    placement: 'left',
    title: 'Club Colors',
    body: 'Pick a real club’s palette, or hit <strong>Recast Colors</strong> to roll a fresh one — or <strong>click any swatch</strong> to choose your own. Every color updates across the whole crest.',
  },
  {
    target: 'shape',
    placement: 'left',
    title: 'Pick a Shield Shape',
    body: 'Start with the <strong>silhouette</strong> — from a classic English shield to a rounded badge. It frames everything else.',
  },
  {
    target: 'symbols',
    placement: 'left',
    title: 'Add Heraldic Symbols',
    body: 'Drop in <strong>symbols</strong> from the gallery — lions, crowns, stars, and hundreds more. Add as many as you like, then drag them onto the crest.',
  },
  {
    target: 'placed',
    placement: 'left',
    title: 'Tune Symbols & Text',
    body: 'Tune each symbol and text block — <strong>color</strong>, <strong>size</strong>, <strong>rotation</strong>, <strong>flip</strong>, bounds, and an <strong>outline</strong>. Select one to reveal its controls.',
  },
  {
    target: 'export',
    placement: 'top',
    title: 'Export, Print & Merch',
    body: 'Download a transparent <strong>PNG</strong> or a vector <strong>SVG</strong> (fonts outlined) — both are <strong>print- &amp; merch-ready</strong> for stickers, patches, or apparel.',
  },
  {
    target: 'account',
    placement: 'bottom',
    title: 'Save & Share',
    body: 'Sign in to save your crests to the cloud, sync them across devices, and share them with a link. Ready? Let’s forge.',
  },
]

function finishTour() {
  showWelcome.value = false
  try { localStorage.setItem(ONBOARDED_KEY, '1') } catch {}
}
function replayTour() {
  showAbout.value = false
  showWelcome.value = true
}
function maybeStartTour() {
  let seen = false
  try { seen = !!localStorage.getItem(ONBOARDED_KEY) } catch {}
  if (seen) return
  setTimeout(() => { showWelcome.value = true }, 650)
}

async function handleAccountClick() {
  if (isSignedIn.value) {
    await signOut()
    addToast('Signed out', { type: 'success', duration: 2500 })
  } else {
    showAuth.value = true
  }
}

// Toolbar Share: links are backed by a cloud design, so a crest must be signed
// in + saved before it can be shared. Route the user to whichever step is next.
function requestShare() {
  // Uploaded "My Symbol" art is unmoderated user content; sharing would publish
  // it to anyone with the link. Block it until UGC moderation exists.
  if (config.symbols.some(s => s.customPaths)) {
    addToast('Crests with an uploaded “My Symbol” can’t be shared yet. Remove it or swap in a built-in symbol to share.', { type: 'tip', duration: 5500 })
    return
  }
  if (!isSupabaseConfigured || !isSignedIn.value) {
    addToast('Sign in to share your crest with a link.', { type: 'tip', duration: 4500 })
    showAuth.value = true
    return
  }
  pulseWeld()
  const design = activeDesign.value
  if (design?.source === 'cloud') {
    doShareDesign(design)
    return
  }
  // Unsaved crest: save first, then create the link automatically.
  pendingShare.value = true
  snapshotPanelRef.value?.startSave({ share: true })
}

// Signing in/out swaps the snapshot list between cloud and localStorage.
// On first sign-in, migrate this browser's local designs into the account.
watch(isSignedIn, async (signedIn) => {
  if (signedIn) {
    try {
      const { imported } = await importLocalToCloud()
      if (imported > 0) {
        addToast(`Imported ${imported} saved ${imported === 1 ? 'design' : 'designs'} to your account`, { type: 'success', duration: 4000 })
      }
    } catch {}
  }
  snapshotPanelRef.value?.refresh()
})

const badgeComposerRef = ref(null)
const isExporting = ref(false)

async function exportCrest(format) {
  const svgEl = badgeComposerRef.value?.svgRootEl
  if (!svgEl || isExporting.value) return
  isExporting.value = true
  pulseWeld()
  try {
    const opts = { texts: config.texts, filename: crestFilename(config.texts, format) }
    if (format === 'svg') await exportCrestSvg(svgEl, opts)
    else await exportCrestPng(svgEl, opts)
    const msg = format === 'svg'
      ? 'SVG saved — vector, fonts outlined. Ready for any print or merch shop.'
      : 'PNG saved — transparent & print-ready. Straight to stickers or merch.'
    addToast(msg, { type: 'tip', duration: 3400 })
  } catch (e) {
    addToast('Export failed — please try again', { type: 'tip', duration: 4000 })
  } finally {
    isExporting.value = false
  }
}
const exportPng = () => exportCrest('png')
const exportSvg = () => exportCrest('svg')

const canCopyImage = canCopyImageToClipboard()
const isCopying = ref(false)

async function copyCrest() {
  const svgEl = badgeComposerRef.value?.svgRootEl
  if (!svgEl || isCopying.value) return
  isCopying.value = true
  pulseWeld()
  try {
    await copyCrestPngToClipboard(svgEl, { texts: config.texts })
    addToast('Copied to clipboard', { type: 'tip', duration: 2500 })
  } catch (e) {
    addToast(e?.message || 'Copy failed — please try again', { type: 'tip', duration: 4000 })
  } finally {
    isCopying.value = false
  }
}

function stepBg(dir) {
  const idx = bgOptions.findIndex(o => o.id === appBg.value)
  appBg.value = bgOptions[(idx + dir + bgOptions.length) % bgOptions.length].id
}
</script>

<template>
  <div class="app">
    <div v-show="!(sharedActive && gateDismissed)" class="mobile-gate">
      <span class="mobile-gate-logo-wrap" aria-hidden="true">
        <LogoMark class="mobile-gate-logo" />
        <span class="gate-embers" aria-hidden="true">
          <i class="gember g1" /><i class="gember g2" /><i class="gember g3" /><i class="gember g4" /><i class="gember g5" /><i class="gember g6" /><i class="gember g7" /><i class="gember g8" /><i class="gember g9" /><i class="gember g10" /><i class="gember g11" /><i class="gember g12" />
        </span>
      </span>
      <p class="logo mobile-gate-wordmark" aria-hidden="true"><span class="logo-title">Crest Foundry<i class="logo-ember e1" /><i class="logo-ember e2" /><i class="logo-ember e3" /><i class="logo-ember e4" /><i class="logo-ember e5" /></span></p>
      <p class="logo-byline mobile-gate-byline">Forge Your Club's Legacy</p>
      <p class="mobile-gate-msg">The Foundry works best on larger screens. For now. — Thx</p>
      <button v-if="sharedActive" class="mobile-gate-dismiss" @click="gateDismissed = true">View shared crest anyway</button>
    </div>
    <AppBackground :type="appBg" :tone="patternTone" />
    <div
      v-if="imageBgTypes.has(appBg)"
      class="app-overlay"
      :style="{ background: overlay.color, opacity: overlay.opacity }"
    />
    <ToastContainer />
    <SharedView
      v-if="sharedActive"
      :config="sharedConfig"
      :name="sharedName"
      :loading="sharedLoading"
      :error="sharedError"
      :bg-type="sharedBg"
      :tone="sharedTone"
      :overlay="imageBgTypes.has(sharedBg) ? sharedOverlay : null"
      :palette="sharedConfig?.palette || []"
      @remix="onRemixShared"
      @close="onCloseShared"
      @step-bg="stepSharedBg"
      @set-bg="sharedBg = $event"
      @set-tone="sharedTone = $event"
    />
    <main class="app-body">
      <!-- Preview -->
      <section class="preview-pane" @wheel.prevent="forwardScroll" @mousemove="onStageMove" @mouseenter="isBadgeActive = true" @mouseleave="isBadgeActive = false">
        <!-- Welding sparks canvas — sits BEHIND the crest -->
        <canvas ref="weldCanvas" class="weld-canvas" />
        <canvas ref="particleCanvas" class="particle-canvas" />
        <!-- Searing-hot cursor glow — shown over the stage, off when over the crest -->
        <div
          v-show="isBadgeActive && !overCrest && !reduceMotion"
          class="hot-cursor"
          :style="{ left: hotCursor.x + 'px', top: hotCursor.y + 'px' }"
        />
        <!-- Warm forge glow at the base of the stage (behind the badge, above the background) -->
        <div class="forge-glow" />

        <p class="drag-hint hud-pill">Drag or arrow-key symbols &amp; text &nbsp;·&nbsp; Shift+Arrow = 10px &nbsp;·&nbsp; ⌘C / ⌘V to copy &amp; paste &nbsp;·&nbsp; Space to forge &nbsp;·&nbsp; ⌘S to snapshot</p>

        <!-- Curated crest badge — shown when a library crest was forged -->
        <Transition name="curated-fade">
          <div v-if="isCurated" class="curated-badge" title="A curated crest from the library">
            <span class="curated-star">✦</span> Curated Entry
          </div>
        </Transition>

        <button
          class="bg-arrow bg-arrow-left"
          :title="`← ${bgOptions[(bgOptions.findIndex(o => o.id === appBg) - 1 + bgOptions.length) % bgOptions.length].label}`"
          @click="stepBg(-1)"
        >‹</button>
        <button
          class="bg-arrow bg-arrow-right"
          :title="`${bgOptions[(bgOptions.findIndex(o => o.id === appBg) + 1) % bgOptions.length].label} →`"
          @click="stepBg(1)"
        >›</button>

        <div class="badge-float-wrap" :class="{ active: isBadgeActive }">
        <!-- Align toolbar — anchored just above the crest. Shield-center at 1+; align at 2+; distribute at 3+ -->
        <Transition name="align-fade">
          <div v-if="alignableCount >= 1" class="align-bar">
            <button
              class="align-btn"
              data-tip="Center on shield"
              aria-label="Center on shield"
              @click="centerOnShield"
              v-html="shieldCenterIcon()"
            />
            <button
              v-for="op in shieldAxisOps"
              :key="op.axis"
              class="align-btn"
              :data-tip="op.title"
              :aria-label="op.title"
              @click="centerOnShieldAxis(op.axis)"
              v-html="shieldAxisIcon(op.axis)"
            />
            <template v-if="alignableCount >= 2">
              <span class="align-sep" />
              <button
                v-for="op in alignOps"
                :key="op.edge"
                class="align-btn"
                :data-tip="op.title"
                :aria-label="op.title"
                @click="alignSelection(op.edge)"
                v-html="alignIcon(op.edge)"
              />
            </template>
            <template v-if="alignableCount >= 3">
              <span class="align-sep" />
              <button
                v-for="op in distributeOps"
                :key="op.axis"
                class="align-btn"
                :data-tip="op.title"
                :aria-label="op.title"
                @click="distributeSelection(op.axis)"
                v-html="distIcon(op.axis)"
              />
            </template>
          </div>
        </Transition>
        <div
          ref="badgeTiltRef"
          class="badge-tilt"
          :style="{ transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)` }"
          @mousemove="onBadgeMove"
          @mouseleave="onBadgeLeave"
        >
        <div ref="badgeWrap" data-tour="crest" :class="['badge-wrap', { pulsing: isPulsing }]">
          <BadgeComposer
            ref="badgeComposerRef"
            :config="config"
            :selected-symbol-id="selectedSymbolId"
            :selection="selection"
            :size="crestRenderSize"
            uid="main"
            @update-text="updateText"
            @update-text-position="updateTextPosition"
            @update-symbol-position="updateSymbolPosition"
            @update-symbol="updateSymbol"
            @select-symbol="onSelectSymbol"
            @select-text="onSelectText"
            @deselect="deselectAll"
            @symbol-outside-bounds="onSymbolOutsideBounds"
            @ember="onDragEmber"
            @drag-start="onElDragStart"
            @drag-end="onElDragEnd"
          />
        </div>
        </div>
        </div>
        <div class="scene-wrap">
          <div class="scene-actions" data-tour="export">
            <button class="start-over-btn" @click="startOver" title="Clear the current design and start fresh">
              ↺ Reforge
            </button>
            <button class="swap-colors-btn" @click="randomizeColors" title="Recast the palette">
              ⇄ Recast
            </button>
            <button class="export-png-btn" :disabled="isExporting" @click="exportPng" title="Download a transparent, print-ready PNG — perfect for stickers & merch">
              {{ isExporting ? '…' : '⬇ PNG' }}
            </button>
            <button class="export-png-btn" :disabled="isExporting" @click="exportSvg" title="Download a self-contained vector SVG (fonts outlined) — drops straight into any print or merch shop">
              {{ isExporting ? '…' : '⬇ SVG' }}
            </button>
            <button v-if="canCopyImage" class="export-png-btn" :disabled="isCopying" @click="copyCrest" title="Copy this crest to the clipboard as a PNG">
              {{ isCopying ? '…' : '⧉ Copy' }}
            </button>
            <button class="share-crest-btn" @click="requestShare" title="Share this crest with a link">
              ⤴ Share
            </button>
            <button class="scene-toggle" @click="showScene = !showScene" title="Toggle scene controls">
              {{ showScene ? '▲ scene' : '▼ scene' }}
            </button>
          </div>

          <p class="print-hint hud-pill">✦ Every export is print- &amp; merch-ready — take your PNG or SVG straight to a sticker or apparel shop. <a href="/print.html" target="_blank" rel="noopener">How to print →</a></p>

          <Transition name="scene-fade">
          <div v-show="showScene" class="scene-controls">
            <div class="bg-picker hud-pill">
              <button
                v-for="opt in bgOptions"
                :key="opt.id"
                class="bg-opt"
                :class="{ active: appBg === opt.id }"
                :title="opt.label"
                :style="opt.id === 'aurora' ? auroraThumb : opt.id === 'waves' ? wavesThumb : opt.id === 'crisscross' ? crisscrossThumb : opt.id === 'pinstripe' ? pinstripeThumb : opt.id === 'diamonds' ? diamondsThumb : opt.id === 'dots' ? dotsThumb : opt.id === 'grid' ? gridThumb : opt.id === 'zigzag' ? zigzagThumb : {}"
                @click="appBg = opt.id"
              >
                <img v-if="opt.thumb" :src="opt.thumb" class="bg-opt-thumb" />
                <span v-else-if="opt.id === 'bokeh'"    class="bg-opt-bokeh" />
                <span v-else-if="opt.id === 'none'"     class="bg-opt-none" />
              </button>
            </div>

            <div class="overlay-controls hud-pill" :style="{ visibility: (imageBgTypes.has(appBg) || patternTonedTypes.has(appBg)) ? 'visible' : 'hidden' }">
              <template v-if="imageBgTypes.has(appBg)">
                <input
                  type="color"
                  :value="overlay.color"
                  class="overlay-color"
                  title="Overlay color"
                  @input="overlay.color = $event.target.value"
                />
                <div class="overlay-swatches">
                  <button
                    v-for="(color, i) in config.palette"
                    :key="i"
                    class="overlay-swatch"
                    :class="{ active: overlay.color.toLowerCase() === color.toLowerCase() }"
                    :style="{ background: color }"
                    :title="`Set overlay to club color ${color}`"
                    @click="overlay.color = color"
                  />
                </div>
                <input
                  type="range" min="0" max="1" step="0.05"
                  :value="overlay.opacity"
                  class="overlay-opacity"
                  @input="overlay.opacity = Number($event.target.value)"
                />
                <span class="overlay-label">overlay</span>
              </template>
              <template v-else-if="patternTonedTypes.has(appBg)">
                <div class="tone-btns">
                  <button
                    v-for="t in patternTones"
                    :key="t"
                    class="tone-btn"
                    :class="{ active: patternTone === t }"
                    @click="patternTone = t"
                  >{{ t }}</button>
                </div>
                <span class="overlay-label">tone</span>
              </template>
            </div>
          </div>
          </Transition>
        </div>
      </section>

      <!-- Controls -->
      <aside class="controls-pane" ref="controlsPane">

        <div class="logo-row">
          <div class="logo-block">
            <LogoMark class="logo-mark-inline" />
            <div class="logo-text">
              <p class="logo"><span class="logo-title">Crest Foundry<i class="logo-ember e1" /><i class="logo-ember e2" /><i class="logo-ember e3" /><i class="logo-ember e4" /><i class="logo-ember e5" /></span></p>
              <p class="logo-byline">Forge Your Club's Legacy</p>
            </div>
          </div>
          <div class="logo-actions">
            <button
              v-if="isSupabaseConfigured"
              data-tour="account"
              class="account-btn"
              :class="{ 'is-in': isSignedIn }"
              :title="isSignedIn ? `Signed in as ${authEmail} — click to sign out` : 'Sign in to save crests to the cloud'"
              @click="handleAccountClick"
            >{{ isSignedIn ? '⏻ Sign out' : '⇲ Sign in' }}</button>
            <button class="about-btn" title="About &amp; credits" @click="showAbout = true">ⓘ</button>
          </div>
        </div>

        <div class="forge-block">
        <div class="forge-btn-wrap">
          <span class="forge-btn-glow" aria-hidden="true"></span>
          <span class="forge-btn-embers" aria-hidden="true">
            <i class="fember f1" /><i class="fember f2" /><i class="fember f3" /><i class="fember f4" /><i class="fember f5" /><i class="fember f6" /><i class="fember f7" /><i class="fember f8" /><i class="fember f9" /><i class="fember f10" /><i class="fember f11" /><i class="fember f12" /><i class="fember f13" /><i class="fember f14" /><i class="fember f15" /><i class="fember f16" />
          </span>
          <button class="randomize-btn" data-tour="forge" title="Forge a new crest" @click="randomizeAll">
            <svg class="randomize-bolt" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M13 2 3 14h6l-1 8 10-12h-6z"/></svg>
            <span class="randomize-label">Forge Random Crest</span>
          </button>
        </div>

        <!-- Shield / No Shield mode -->
        <div class="mode-switch" role="group" aria-label="Shield mode">
          <button
            class="mode-opt"
            :class="{ active: !config.noShield }"
            @click="setNoShield(false)"
          >Shield</button>
          <button
            class="mode-opt"
            :class="{ active: config.noShield }"
            @click="setNoShield(true)"
          >No Shield</button>
        </div>
        </div>

        <!-- Club Colors / Palette -->
        <div class="control-group" data-tour="colors">
          <h3 class="control-label">Club Colors</h3>
          <ClubPicker @apply="applyClub" />
          <button class="random-colors-btn" @click="randomizeColors" title="Recast with a random club's colors">⚡ Recast Colors</button>
          <div v-if="activeClub" class="active-club">
            <span class="active-club-dot" />
            <span class="active-club-label">Showing</span>
            <span class="active-club-name">{{ isCustomPalette ? 'Custom' : activeClub.name }}</span>
            <span v-if="!isCustomPalette && activeClubModified" class="modified-flag">modified</span>
          </div>
          <div class="palette-editor" style="margin-top: 10px;">
            <div
              v-for="(color, i) in config.palette"
              :key="i"
              class="palette-slot"
              :class="{ dragging: paletteDragIndex === i, 'drag-over': paletteOverIndex === i && paletteDragIndex !== i }"
              :style="{ background: color }"
              :title="`${color} — drag to reorder`"
              draggable="true"
              @dragstart="onPaletteDragStart(i, $event)"
              @dragover.prevent="onPaletteDragOver(i)"
              @drop.prevent="onPaletteDrop(i)"
              @dragend="onPaletteDragEnd"
              @click="openColorInput"
            >
              <input
                type="color"
                :value="color"
                class="palette-input-overlay"
                @input="setPaletteColor(i, $event.target.value)"
                @click.stop
              />
              <button
                class="palette-remove"
                title="Remove color"
                draggable="false"
                @click.stop="removePaletteColor(i)"
              >×</button>
            </div>
            <button
              v-if="config.palette.length < 6"
              class="palette-add"
              title="Add color"
              @click="addPaletteColor"
            >+</button>
          </div>
          <p class="palette-hint">Click to change · drag to reorder · hover to remove · up to 6 colors</p>
        </div>

        <!-- Shape -->
        <div class="control-group" data-tour="shape" :class="{ 'group-disabled': config.noShield }">
          <h3 class="control-label">Shape</h3>
          <div class="shape-grid">
            <button
              v-for="s in shapes"
              :key="s.id"
              class="shape-btn"
              :class="{ active: config.shapeId === s.id }"
              @click="setShape(s.id)"
              :title="s.label"
            >
              <svg viewBox="0 0 200 240" width="40" height="48">
                <path :d="s.path" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Background -->
        <div class="control-group" :class="{ 'group-disabled': config.noShield }">
          <h3 class="control-label">Background</h3>
          <div class="bg-type-grid">
            <button
              v-for="t in bgTypes"
              :key="t"
              class="bg-type-btn"
              :class="{ active: config.background.type === t }"
              @click="setBackgroundType(t)"
            >{{ t }}</button>
          </div>

          <!-- Gradient stops editor (gradient / radial types) -->
          <div v-if="config.background.type === 'gradient' || config.background.type === 'radial'" class="gradient-editor">
            <span class="color-label">Gradient stops</span>
            <div class="palette-editor" style="margin-top: 8px;">
              <div
                v-for="(color, i) in config.background.gradient"
                :key="i"
                class="palette-slot"
                :style="{ background: color }"
                :title="color"
                @click="openColorInput"
              >
                <input
                  type="color"
                  :value="color"
                  class="palette-input-overlay"
                  @input="setGradientStop(i, $event.target.value)"
                  @click.stop
                />
                <button
                  v-if="config.background.gradient.length > 2"
                  class="palette-remove"
                  title="Remove stop"
                  @click.stop="removeGradientStop(i)"
                >×</button>
              </div>
              <button
                v-if="config.background.gradient.length < 5"
                class="palette-add"
                title="Add stop"
                @click="addGradientStop"
              >+</button>
            </div>
            <div v-if="config.background.type === 'gradient'" class="range-row" style="margin-top: 8px;">
              <label>
                Angle <em>{{ config.background.gradientAngle }}°</em>
                <input
                  type="range" min="0" max="360" step="15"
                  :value="config.background.gradientAngle"
                  @input="setGradientAngle($event.target.value)"
                />
              </label>
            </div>
            <p class="palette-hint">2–5 stops · click to change · hover to remove</p>
          </div>

          <div v-if="stripeTypes.has(config.background.type)" class="stripe-count-row">
            <span class="color-label">{{ config.background.type === 'checkered' ? 'Columns' : 'Stripes' }}</span>
            <div class="stripe-stepper">
              <button class="stepper-btn" @click="setStripeCount(config.background.stripeCount - 1)">−</button>
              <span class="stepper-val">{{ config.background.stripeCount }}</span>
              <button class="stepper-btn" @click="setStripeCount(config.background.stripeCount + 1)">+</button>
            </div>
          </div>
          <div v-if="config.background.type === 'sunburst'" class="stripe-count-row">
            <span class="color-label">Rays</span>
            <div class="stripe-stepper">
              <button class="stepper-btn" @click="setSunburstRays(config.background.sunburstRays - 2)">−</button>
              <span class="stepper-val">{{ config.background.sunburstRays }}</span>
              <button class="stepper-btn" @click="setSunburstRays(config.background.sunburstRays + 2)">+</button>
            </div>
          </div>
          <div v-if="config.background.type === 'sash'" class="range-row">
            <label>
              Thickness
              <input
                type="range" min="68" max="280" step="4"
                :value="config.background.sashWidth"
                @input="setSashWidth(Number($event.target.value))"
              />
              <span>{{ config.background.sashWidth }}</span>
            </label>
          </div>
        </div>

        <!-- Border -->
        <div class="control-group" :class="{ 'group-disabled': config.noShield }">
          <h3 class="control-label">Border</h3>
          <div class="bg-color-row" style="margin-bottom: 10px">
            <span class="color-label">Color</span>
            <ColorPicker :value="config.border.color" @change="setBorderColor($event)" />
          </div>
          <div class="range-row">
            <label>
              Thickness
              <input
                type="range" min="0" max="12" step="0.5"
                :value="config.border.width"
                @input="setBorderWidth($event.target.value)"
              />
              <span>{{ config.border.width }}</span>
            </label>
          </div>
        </div>

        <!-- Text -->
        <div class="control-group">
          <h3 class="control-label">Text</h3>
          <TextEditor
            :texts="config.texts"
            :selected-text-id="selectedTextId"
            :selected-text-ids="selection.filter(s => s.type === 'text').map(s => s.id)"
            :shape-fit="currentShapeFit"
            @add-text="addText"
            @remove-text="removeText"
            @update-text="updateText"
            @select-text="onSelectText"
            @fit-arc="fitArcToShape"
          />
        </div>

        <!-- Symbol Gallery -->
        <div class="control-group" data-tour="symbols">
          <h3 class="control-label">Add Symbol</h3>
          <IconPicker :placed-counts="placedIconCounts" :selected-icon-id="selectedIconId" :demo="symbolsDemo" @add-icon="onPickIcon" />
        </div>

        <!-- Custom (user-uploaded) symbols — own browse menu, flat list -->
        <div class="control-group">
          <h3 class="control-label">My Symbols</h3>
          <MySymbols @add-custom="onAddCustom" />
        </div>

        <!-- Placed Symbols -->
        <div v-if="config.symbols.length" class="control-group" data-tour="placed">
          <h3 class="control-label">Placed Symbols</h3>
          <div class="symbol-list">
            <div
              v-for="sym in config.symbols"
              :key="sym.instanceId"
              :ref="el => setSymRef(el, sym.instanceId)"
              class="symbol-item"
              :class="{ selected: isSelected('symbol', sym.instanceId) }"
              @click="onSelectSymbol(sym.instanceId, $event.shiftKey || $event.metaKey)"
            >
              <div class="sym-row">
                <svg v-if="sym.kind === 'rect'" viewBox="0 0 40 40" width="28" height="28" class="sym-preview">
                  <rect
                    :x="20 - rectPreview(sym).w / 2"
                    :y="20 - rectPreview(sym).h / 2"
                    :width="rectPreview(sym).w"
                    :height="rectPreview(sym).h"
                    :fill="sym.color"
                    :stroke="sym.strokeWidth > 0 ? sym.strokeColor : 'none'"
                    stroke-width="2"
                    paint-order="stroke fill"
                  />
                </svg>
                <svg v-else :viewBox="symPreviewVB(sym)" width="28" height="28" class="sym-preview">
                  <path
                    v-for="(p, i) in (sym.customPaths || iconsById[sym.iconId]?.paths)"
                    :key="i"
                    :d="p"
                    :fill="sym.color"
                    :stroke="sym.strokeWidth > 0 ? sym.strokeColor : 'none'"
                    :stroke-width="symPreviewStroke(sym)"
                    paint-order="stroke fill"
                  />
                </svg>

                <span class="sym-label">{{ sym.kind === 'rect' ? 'Rectangle' : (sym.customLabel || iconsById[sym.iconId]?.label) }}</span>

                <div class="sym-controls">
                  <ColorPicker
                    :value="sym.color"
                    @click.stop
                    @change="updateSymbol(sym.instanceId, { color: $event })"
                  />
                  <button
                    class="sym-remove"
                    title="Remove"
                    @click.stop="removeSymbol(sym.instanceId)"
                  >×</button>
                </div>
              </div>

              <!-- Expanded controls, visible when this row is selected -->
              <Transition name="panel-fade">
              <div v-if="selectedSymbolId === sym.instanceId" class="sym-expanded" @click.stop>
                <template v-if="sym.kind === 'rect'">
                  <label class="sym-field">
                    Width
                    <input
                      type="range" min="6" max="200"
                      :value="sym.w"
                      @input="updateSymbol(sym.instanceId, { w: Number($event.target.value) })"
                    />
                    <span>{{ sym.w }}</span>
                  </label>
                  <label class="sym-field">
                    Height
                    <input
                      type="range" min="6" max="240"
                      :value="sym.h"
                      @input="updateSymbol(sym.instanceId, { h: Number($event.target.value) })"
                    />
                    <span>{{ sym.h }}</span>
                  </label>
                </template>
                <label v-else class="sym-field">
                  Size
                  <input
                    type="range" min="20" max="240"
                    :value="sym.size"
                    @input="updateSymbol(sym.instanceId, { size: Number($event.target.value) })"
                  />
                  <span>{{ sym.size }}</span>
                </label>
                <div class="sym-field">
                  <span>Rotation</span>
                  <input
                    type="range" min="-180" max="180"
                    :value="sym.rotation ?? 0"
                    @input="updateSymbol(sym.instanceId, { rotation: Number($event.target.value) })"
                  />
                  <button
                    class="rotation-reset"
                    title="Reset rotation to 0°"
                    @click.stop="updateSymbol(sym.instanceId, { rotation: 0 })"
                  >⟲</button>
                  <span>{{ sym.rotation ?? 0 }}°</span>
                </div>
                <label v-if="iconsById[sym.iconId]?.supportsRing" class="sym-field">
                  Thickness
                  <input
                    type="range" min="2" max="44"
                    :value="sym.ringThickness ?? iconsById[sym.iconId]?.defaultRingThickness ?? 44"
                    @input="updateSymbol(sym.instanceId, { ringThickness: Number($event.target.value) })"
                  />
                  <span>{{ sym.ringThickness ?? iconsById[sym.iconId]?.defaultRingThickness ?? 44 }}</span>
                </label>
                <div class="sym-field sym-clip-row">
                  <span>Bounds</span>
                  <button
                    class="sym-clip-toggle"
                    :class="{ free: sym.clipped === false }"
                    @click.stop="updateSymbol(sym.instanceId, { clipped: sym.clipped === false ? true : false })"
                    :title="sym.clipped === false ? 'Click to clip to badge shape' : 'Click to allow outside badge bounds'"
                  >{{ sym.clipped === false ? 'Free' : 'Clipped' }}</button>
                </div>
                <div v-if="sym.kind !== 'rect'" class="sym-field sym-clip-row">
                  <span>Flip</span>
                  <button
                    class="sym-clip-toggle"
                    :class="{ free: sym.flipH }"
                    @click.stop="updateSymbol(sym.instanceId, { flipH: !sym.flipH })"
                    title="Flip symbol horizontally"
                  >{{ sym.flipH ? 'Flipped ⇋' : 'Normal ⇋' }}</button>
                </div>
                <div class="sym-field sym-stroke-row">
                  <span>Border</span>
                  <ColorPicker
                    :value="sym.strokeColor || '#000000'"
                    @change="updateSymbol(sym.instanceId, { strokeColor: $event })"
                  />
                  <input
                    type="range" min="0" max="20" step="0.5"
                    :value="sym.strokeWidth || 0"
                    class="sym-stroke-range"
                    @input="updateSymbol(sym.instanceId, { strokeWidth: Number($event.target.value) })"
                  />
                  <span>{{ sym.strokeWidth || 0 }}</span>
                </div>
              </div>
              </Transition>
            </div>
          </div>
        </div>

        <!-- Snapshots -->
        <div class="control-group">
          <h3 class="control-label">Snapshots</h3>
          <SnapshotPanel
            ref="snapshotPanelRef"
            :save-fn="doSaveSnapshot"
            :update-fn="doUpdateSnapshot"
            :active-design="activeDesign"
            :texts="config.texts"
            @load="onLoadSnapshot"
            @deleted="onSnapshotDeleted"
            @share="doShareDesign"
          />
        </div>

      </aside>
    </main>

    <ShareModal
      :open="shareModalOpen"
      :url="shareUrl"
      :busy="shareBusy"
      @close="shareModalOpen = false"
      @revoke="doRevokeShare"
    />
    <AboutModal :open="showAbout" @close="showAbout = false" @replay-tour="replayTour" />
    <AuthModal :open="showAuth" @close="showAuth = false" />
    <TourGuide :open="showWelcome" :steps="tourSteps" @close="finishTour" @finish="finishTour" @step="onTourStep" />
  </div>
</template>

<style>
.app {
  display: flex;
  height: 100vh;
  overflow: hidden;
  color: #e8e8ec;
  font-family: system-ui, sans-serif;
}

.mobile-gate {
  display: none;
}
@media (max-width: 768px) {
  .mobile-gate {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 18px;
    padding: 32px;
    text-align: center;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(6px) saturate(1.9);
    -webkit-backdrop-filter: blur(6px) saturate(1.9);
  }
  /* Hide the controls/admin panel entirely; let the crest sit centered behind the shim */
  .controls-pane { display: none !important; }
  .preview-pane {
    justify-content: center !important;
    padding: 24px !important;
    gap: 0 !important;
  }
  .preview-pane .scene-wrap,
  .preview-pane .bg-arrow,
  .preview-pane .align-bar { display: none !important; }
  .mobile-gate-logo-wrap {
    position: relative;
    display: inline-flex;
    line-height: 0;
  }
  .app .mobile-gate .mobile-gate-logo {
    width: min(40vw, 190px);
    height: auto;
    aspect-ratio: 543.67 / 627.4;
  }
  /* Embers drifting up off the logo — same treatment as the modal headers */
  .gate-embers {
    position: absolute;
    top: 8%;
    left: 8%;
    right: 8%;
    height: 1px;
    pointer-events: none;
  }
  .gate-embers .gember {
    position: absolute;
    top: 0;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: #ffe0a0;
    box-shadow: 0 0 5px 1px rgba(255, 140, 40, 0.9);
    opacity: 0;
    animation: gate-ember-rise 3.4s ease-out infinite;
  }
  .gate-embers .gember:nth-child(3n) {
    width: 4px;
    height: 4px;
    background: #fff1c6;
    box-shadow: 0 0 9px 1.5px rgba(255, 155, 50, 1);
  }
  .gate-embers .g1  { left: 6%;  --dx: -7px; animation-duration: 3.2s; animation-delay: -0.2s; }
  .gate-embers .g2  { left: 15%; --dx: 5px;  animation-duration: 4.1s; animation-delay: -1.4s; }
  .gate-embers .g3  { left: 24%; --dx: -4px; animation-duration: 3.6s; animation-delay: -2.7s; }
  .gate-embers .g4  { left: 33%; --dx: 8px;  animation-duration: 4.4s; animation-delay: -0.8s; }
  .gate-embers .g5  { left: 42%; --dx: -3px; animation-duration: 3.9s; animation-delay: -2.1s; }
  .gate-embers .g6  { left: 50%; --dx: 6px;  animation-duration: 3.4s; animation-delay: -3.3s; }
  .gate-embers .g7  { left: 58%; --dx: -8px; animation-duration: 4.6s; animation-delay: -1.1s; }
  .gate-embers .g8  { left: 67%; --dx: 3px;  animation-duration: 3.7s; animation-delay: -2.5s; }
  .gate-embers .g9  { left: 76%; --dx: -5px; animation-duration: 4.2s; animation-delay: -0.5s; }
  .gate-embers .g10 { left: 85%; --dx: 7px;  animation-duration: 3.5s; animation-delay: -1.9s; }
  .gate-embers .g11 { left: 92%; --dx: -4px; animation-duration: 4.5s; animation-delay: -3.0s; }
  .gate-embers .g12 { left: 30%; --dx: 5px;  animation-duration: 3.6s; animation-delay: -3.5s; }
  @keyframes gate-ember-rise {
    0%   { transform: translate(0, 0) scale(1);               opacity: 0; }
    8%   { opacity: 1; }
    55%  { opacity: 0.5; }
    100% { transform: translate(var(--dx), -70px) scale(0.25); opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .gate-embers { display: none; }
  }
  .mobile-gate-wordmark {
    font-size: clamp(28px, 8vw, 40px);
    line-height: 1;
    text-align: center;
  }
  .mobile-gate-byline {
    margin-top: -26px;
    font-size: clamp(12px, 3.4vw, 15px);
    text-align: center;
  }
  .mobile-gate-msg {
    margin: 0;
    max-width: 22ch;
    color: #e8e8ec;
    font-family: 'EB Garamond', Georgia, serif;
    font-size: 1.35rem;
    line-height: 1.45;
    letter-spacing: 0.01em;
  }
  .mobile-gate-dismiss {
    margin-top: 6px;
    padding: 10px 20px;
    background: transparent;
    border: 1px solid #e8c84a;
    border-radius: 8px;
    color: #e8c84a;
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .mobile-gate-dismiss:active {
    background: #e8c84a;
    color: #111;
  }
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
  z-index: 1;
}

.logo-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 8px;
  padding-bottom: 16px;
  border-bottom: 1px solid #2a2a35;
}

.logo-block {
  display: flex;
  align-items: center;
  gap: 9px;
}
.logo-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.logo-byline {
  margin: 0;
  font-size: 10px;
  font-style: italic;
  color: #888;
  letter-spacing: 0.02em;
}

/* Embers drifting up off the "Crest Foundry" logotype */
.logo-title {
  position: relative;
  display: inline-block;
}
.logo-ember {
  position: absolute;
  bottom: 3px;
  width: 2.5px;
  height: 2.5px;
  border-radius: 50%;
  background: #ffd98a;
  box-shadow: 0 0 5px 1px rgba(255, 140, 40, 0.85);
  opacity: 0;
  pointer-events: none;
  animation: logo-ember-rise 3.4s ease-out infinite;
}
.logo-ember.e1 { left: 12%; --dx: -3px; animation-duration: 3.6s; animation-delay: -0.3s; }
.logo-ember.e2 { left: 33%; --dx: 4px;  animation-duration: 4.4s; animation-delay: -1.7s; }
.logo-ember.e3 { left: 52%; --dx: -2px; animation-duration: 3.9s; animation-delay: -2.9s; }
.logo-ember.e4 { left: 71%; --dx: 5px;  animation-duration: 4.7s; animation-delay: -1.0s; }
.logo-ember.e5 { left: 89%; --dx: -4px; animation-duration: 4.1s; animation-delay: -3.3s; }
@keyframes logo-ember-rise {
  0%   { transform: translate(0, 0) scale(1);            opacity: 0; }
  8%   { opacity: 0.95; }
  55%  { opacity: 0.5; }
  100% { transform: translate(var(--dx), -22px) scale(0.35); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .logo-ember { display: none; }
}

.mode-switch {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: #13131a;
  border: 1px solid #2a2a35;
  border-radius: 8px;
}
.mode-opt {
  flex: 1;
  padding: 7px 0;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: #888;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.mode-opt:hover { color: #ccc; }
.mode-opt.active {
  background: #e8c84a;
  color: #111;
}

.group-disabled {
  opacity: 0.4;
  pointer-events: none;
}

.logo {
  font-family: 'Yeseva One', Georgia, serif;
  font-size: 23px;
  font-weight: 400;
  letter-spacing: 0.3px;
  line-height: 1.05;
  color: #e8c84a;
  margin: 0;
}

.logo-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.about-btn {
  background: none;
  border: 1px solid #3a3a4a;
  border-radius: 6px;
  color: #888;
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
  padding: 3px 7px;
  transition: border-color 0.15s, color 0.15s;
}
.about-btn:hover {
  border-color: #e8c84a;
  color: #e8c84a;
}

.account-btn {
  background: none;
  border: 1px solid #3a3a4a;
  border-radius: 6px;
  color: #888;
  cursor: pointer;
  font-size: 11px;
  line-height: 1;
  padding: 5px 8px;
  white-space: nowrap;
  transition: border-color 0.15s, color 0.15s;
}
.account-btn:hover {
  border-color: #e8c84a;
  color: #e8c84a;
}
.account-btn.is-in {
  border-color: rgba(232, 200, 74, 0.4);
  color: #e8c84a;
}
.account-btn.is-in:hover {
  border-color: #e05555;
  color: #e05555;
}

.forge-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: -16px;
}

.randomize-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 9px 14px;
  background:
    linear-gradient(180deg, rgba(232, 200, 74, 0.14), rgba(232, 200, 74, 0.05)),
    #16161d;
  border: 1px solid rgba(232, 200, 74, 0.4);
  border-radius: 8px;
  color: #f3dd82;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s, color 0.2s, box-shadow 0.2s, transform 0.06s;
}
.randomize-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -60%;
  width: 45%;
  height: 100%;
  background: linear-gradient(100deg, transparent, rgba(255, 240, 200, 0.35), transparent);
  transform: skewX(-18deg);
  opacity: 0;
  pointer-events: none;
}
.randomize-btn:hover {
  border-color: #e8c84a;
  color: #fff2c4;
  box-shadow: 0 0 16px rgba(232, 200, 74, 0.28), inset 0 0 12px rgba(232, 200, 74, 0.1);
}
.randomize-btn:hover::before {
  animation: forge-sheen 0.7s ease-out;
}
.randomize-btn:active { transform: translateY(1px); }
.randomize-btn:hover .randomize-bolt {
  transform: rotate(-12deg) scale(1.15);
  filter: drop-shadow(0 0 7px var(--accent-warm-glow));
}
.randomize-bolt {
  display: inline-block;
  fill: var(--accent-warm);
  filter: drop-shadow(0 0 4px var(--accent-warm-soft));
  transition: transform 0.2s, filter 0.2s;
}
@keyframes forge-sheen {
  0%   { opacity: 0; left: -60%; }
  15%  { opacity: 1; }
  100% { opacity: 0; left: 130%; }
}

/* Foundry-modal treatment: a molten rim glowing along the top edge with
   embers pouring off it, radiating heat. The button keeps overflow:hidden
   for its sheen, so the emitters live on this un-clipped wrapper instead. */
.forge-btn-wrap {
  position: relative;
}
.forge-btn-glow {
  position: absolute;
  top: -1px;
  left: 6%;
  right: 6%;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, transparent, rgba(255, 150, 45, 0.85) 20%, rgba(255, 190, 80, 0.95) 50%, rgba(255, 150, 45, 0.85) 80%, transparent);
  filter: blur(2px);
  pointer-events: none;
  z-index: 2;
  animation: forge-btn-rim 3.2s ease-in-out infinite;
}
@keyframes forge-btn-rim {
  0%, 100% { opacity: 0.5; }
  50%      { opacity: 1; }
}

.forge-btn-embers {
  position: absolute;
  top: -2px;
  left: 6%;
  right: 6%;
  height: 1px;
  pointer-events: none;
  z-index: 2;
}
.forge-btn-embers .fember {
  position: absolute;
  top: 0;
  width: 2.5px;
  height: 2.5px;
  border-radius: 50%;
  background: #ffe0a0;
  box-shadow: 0 0 5px 1px rgba(255, 140, 40, 0.9);
  opacity: 0;
  animation: forge-btn-ember-rise 3.4s ease-out infinite;
}
.forge-btn-embers .fember:nth-child(3n) {
  width: 3.5px;
  height: 3.5px;
  background: #fff1c6;
  box-shadow: 0 0 8px 1.5px rgba(255, 155, 50, 1);
}
.forge-btn-embers .f1  { left: 3%;  --dx: -5px; animation-duration: 3.2s; animation-delay: -0.2s; }
.forge-btn-embers .f2  { left: 10%; --dx: 3px;  animation-duration: 4.1s; animation-delay: -1.4s; }
.forge-btn-embers .f3  { left: 17%; --dx: -3px; animation-duration: 3.6s; animation-delay: -2.7s; }
.forge-btn-embers .f4  { left: 24%; --dx: 6px;  animation-duration: 4.4s; animation-delay: -0.8s; }
.forge-btn-embers .f5  { left: 31%; --dx: -2px; animation-duration: 3.9s; animation-delay: -2.1s; }
.forge-btn-embers .f6  { left: 38%; --dx: 4px;  animation-duration: 3.4s; animation-delay: -3.3s; }
.forge-btn-embers .f7  { left: 45%; --dx: -6px; animation-duration: 4.6s; animation-delay: -1.1s; }
.forge-btn-embers .f8  { left: 52%; --dx: 2px;  animation-duration: 3.7s; animation-delay: -2.5s; }
.forge-btn-embers .f9  { left: 59%; --dx: -4px; animation-duration: 4.2s; animation-delay: -0.5s; }
.forge-btn-embers .f10 { left: 66%; --dx: 5px;  animation-duration: 3.5s; animation-delay: -1.9s; }
.forge-btn-embers .f11 { left: 73%; --dx: -3px; animation-duration: 4.5s; animation-delay: -3.0s; }
.forge-btn-embers .f12 { left: 80%; --dx: 3px;  animation-duration: 3.8s; animation-delay: -0.9s; }
.forge-btn-embers .f13 { left: 87%; --dx: -5px; animation-duration: 4.0s; animation-delay: -2.3s; }
.forge-btn-embers .f14 { left: 92%; --dx: 4px;  animation-duration: 3.3s; animation-delay: -1.6s; }
.forge-btn-embers .f15 { left: 97%; --dx: -2px; animation-duration: 4.3s; animation-delay: -0.3s; }
.forge-btn-embers .f16 { left: 6%;  --dx: 5px;  animation-duration: 3.6s; animation-delay: -3.5s; }
@keyframes forge-btn-ember-rise {
  0%   { transform: translate(0, 0) scale(1);               opacity: 0; }
  8%   { opacity: 1; }
  55%  { opacity: 0.5; }
  100% { transform: translate(var(--dx), -30px) scale(0.25); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .randomize-btn::before { display: none; }
  .randomize-bolt { transition: none; }
  .forge-btn-embers { display: none; }
  .forge-btn-glow { animation: none; opacity: 0.7; }
}

.preview-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 40px;
  overflow: hidden;
  position: relative;
}

/* On short (laptop) screens the crest is zoomed out 10% (see CREST_SHORT_SCALE)
   so the whole stack fits while staying vertically centred — rather than shoving
   the crest up. Spacing is trimmed a touch to leave room for the controls below. */
@media (max-height: 860px) {
  .preview-pane {
    gap: 12px;
    padding: 28px 40px 20px;
  }
}
@media (max-height: 740px) {
  .preview-pane {
    gap: 8px;
    padding: 16px 40px 14px;
  }
}

.particle-canvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
  width: 100%;
  height: 100%;
}

/* Welding sparks sit behind the crest (below .badge-float-wrap's z-index) */
.weld-canvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  width: 100%;
  height: 100%;
}

/* Searing-hot cursor glow that trails the pointer over the stage */
.hot-cursor {
  position: absolute;
  z-index: 4;
  width: 54px;
  height: 54px;
  margin: -27px 0 0 -27px;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(circle,
    rgba(255, 172, 62, 0.55) 0%,
    rgba(255, 120, 26, 0.30) 34%,
    rgba(255, 90, 10, 0) 70%);
  mix-blend-mode: screen;
  filter: blur(3px);
  animation: hot-cursor-pulse 1.6s ease-in-out infinite;
  will-change: left, top;
}
@keyframes hot-cursor-pulse {
  0%, 100% { opacity: 0.82; transform: scale(0.94); }
  50%      { opacity: 1;    transform: scale(1.06); }
}

/* Warm coal-glow at the base of the crest stage — subtle, breathing */
.forge-glow {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 180px;
  pointer-events: none;
  background:
    radial-gradient(70% 85% at 32% 118%, rgba(255, 145, 48, 0.42), transparent 60%),
    radial-gradient(70% 85% at 68% 122%, rgba(255, 88, 20, 0.42), transparent 60%),
    radial-gradient(150% 115% at 50% 128%, rgba(255, 120, 30, 0.34), transparent 64%);
  filter: blur(7px);
  animation: forge-breathe 5s ease-in-out infinite;
}
@keyframes forge-breathe {
  0%, 100% { opacity: 0.6; }
  50%      { opacity: 1; }
}

/* Align toolbar */
.curated-badge {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(12, 12, 20, 0.7);
  border: 1px solid var(--accent-warm-soft);
  color: #e8d9c8;
  font-size: 10px;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  pointer-events: none;
}
.curated-star { color: var(--accent-warm); text-shadow: 0 0 6px var(--accent-warm-glow); }
.curated-fade-enter-active, .curated-fade-leave-active { transition: opacity 0.3s ease; }
.curated-fade-enter-from, .curated-fade-leave-to { opacity: 0; }

.align-bar {
  position: absolute;
  bottom: calc(100% + 52px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 6;
  display: flex;
  gap: 3px;
  padding: 4px;
  border-radius: 9px;
  background: rgba(12, 12, 20, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.09);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}
.align-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #cfcfd6;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.align-btn:hover { background: rgba(232, 200, 74, 0.14); color: #fff; }
.align-btn :deep(svg) { display: block; }

/* Styled tooltip (below the button, so it never clips off the pane top) */
.align-btn::after {
  content: attr(data-tip);
  position: absolute;
  top: calc(100% + 7px);
  left: 50%;
  transform: translateX(-50%) translateY(-3px);
  background: #0f0f13;
  border: 1px solid #3a3a48;
  border-radius: 4px;
  color: #e8e8ec;
  font-size: 11px;
  font-family: system-ui, sans-serif;
  letter-spacing: 0;
  text-transform: none;
  padding: 3px 8px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.12s ease, transform 0.12s ease;
  z-index: 20;
}
.align-btn:hover::after {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
.align-sep {
  width: 1px;
  align-self: stretch;
  margin: 2px 2px;
  background: rgba(255, 255, 255, 0.12);
}

.align-fade-enter-active,
.align-fade-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.align-fade-enter-from,
.align-fade-leave-to { opacity: 0; transform: translate(-50%, -6px); }

.bg-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  font-size: 28px;
  line-height: 1;
  padding: 10px 14px;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  user-select: none;
  z-index: 6;
}
.bg-arrow:hover {
  background: rgba(0, 0, 0, 0.6);
  border-color: rgba(255, 255, 255, 0.28);
  color: #fff;
}
.bg-arrow-left  { left: 14px; }
.bg-arrow-right { right: 14px; }

@keyframes badge-float {
  from { transform: translateY(0); }
  to   { transform: translateY(-5px); }
}

@keyframes badge-pulse {
  0%   { transform: scale(1);    filter: drop-shadow(0 0 0px  rgba(232,200,74,0));    }
  30%  { transform: scale(1.015); filter: drop-shadow(0 0 9px rgba(232,200,74,0.38)); }
  100% { transform: scale(1);    filter: drop-shadow(0 0 0px  rgba(232,200,74,0));    }
}

.badge-float-wrap {
  position: relative;
  z-index: 3;
  perspective: 1100px;
  animation: badge-float 3.4s ease-in-out infinite alternate;
}
.badge-float-wrap.active {
  animation-play-state: paused;
}

/* Pointer-driven 3D tilt layer */
.badge-tilt {
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.2s ease-out;
  will-change: transform;
}

.badge-wrap {
  display: inline-flex;
}
.badge-wrap.pulsing {
  animation: badge-pulse 0.35s ease-out forwards;
}

@media (prefers-reduced-motion: reduce) {
  .badge-float-wrap { animation: none; }
  .badge-tilt { transition: none; }
  .badge-wrap.pulsing { animation: none; }
  .forge-glow { animation: none; opacity: 0.8; }
}

.hud-pill {
  background: rgba(0, 0, 0, 0.5);
  border-radius: 6px;
  padding: 5px 8px;
}

.scene-wrap {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.scene-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.start-over-btn,
.swap-colors-btn,
.export-png-btn,
.share-crest-btn,
.scene-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  color: #cdb24a;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(232, 200, 74, 0.4);
  border-radius: 6px;
  padding: 5px 9px;
  cursor: pointer;
  letter-spacing: 0.03em;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.start-over-btn:hover,
.swap-colors-btn:hover,
.export-png-btn:hover,
.share-crest-btn:hover,
.scene-toggle:hover {
  color: #111;
  background: rgba(232, 200, 74, 0.9);
  border-color: #e8c84a;
}
.export-png-btn:disabled {
  opacity: 0.55;
  cursor: default;
  color: #cdb24a;
  background: rgba(0, 0, 0, 0.5);
  border-color: rgba(232, 200, 74, 0.4);
}

.scene-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.drag-hint {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 6;
  font-size: 12px;
  color: #b9b6b6;
  margin: 0;
  text-align: center;
}
.print-hint { font-size: 11.5px; color: #cbb37a; margin: 0; text-align: center; max-width: 520px; }
.print-hint a { color: #e8c84a; text-decoration: none; border-bottom: 1px solid rgba(232, 200, 74, 0.4); white-space: nowrap; }
.print-hint a:hover { border-bottom-color: #e8c84a; }

.app-overlay {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.bg-picker {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: nowrap;
  justify-content: flex-start;
  overflow-x: auto;
  overflow-y: hidden;
  /* room so hover-scale and the active glow aren't clipped by overflow */
  padding: 6px;
  scrollbar-width: thin;
  scrollbar-color: #3a3a48 transparent;
}
.bg-picker::-webkit-scrollbar {
  height: 8px;
}
.bg-picker::-webkit-scrollbar-track {
  background: transparent;
}
.bg-picker::-webkit-scrollbar-thumb {
  background: #2f2f3b;
  border-radius: 6px;
  border: 2px solid transparent;
  background-clip: content-box;
}
.bg-picker::-webkit-scrollbar-thumb:hover {
  background: var(--accent-warm);
  background-clip: content-box;
}

.bg-opt {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: 2px solid transparent;
  padding: 0;
  cursor: pointer;
  overflow: hidden;
  background: #1a1a24;
  transition: border-color 0.15s, transform 0.1s;
  flex-shrink: 0;
}
.bg-opt:hover   { transform: scale(1.1); border-color: rgba(255,255,255,0.3); }
.bg-opt.active  { border-color: var(--accent-warm); box-shadow: 0 0 8px var(--accent-warm-glow); }

.bg-opt-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.bg-opt-none {
  display: block;
  width: 100%;
  height: 100%;
  background: #07070e;
}

.bg-opt-bokeh {
  display: block;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 30% 40%, rgba(100,120,255,0.6) 0%, transparent 60%),
              radial-gradient(circle at 70% 60%, rgba(255,100,150,0.5) 0%, transparent 55%),
              radial-gradient(circle at 50% 30%, rgba(255,200,80,0.4) 0%, transparent 50%),
              #07070e;
}

.overlay-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  /* Reserve a constant row height so .scene-controls doesn't jump as the
     background sub-menu (image overlay / pattern tone / none) changes. */
  min-height: 34px;
}

.overlay-color {
  width: 24px;
  height: 24px;
  padding: 1px;
  border: 1px solid #3a3a48;
  border-radius: 4px;
  background: #1e1e28;
  cursor: pointer;
  flex-shrink: 0;
}

.overlay-swatches {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.overlay-swatch {
  width: 16px;
  height: 16px;
  padding: 0;
  border: 1px solid #3a3a48;
  border-radius: 3px;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
}

.overlay-swatch:hover { transform: scale(1.15); }

.overlay-swatch.active {
  border-color: #e8c84a;
  box-shadow: 0 0 0 1px #e8c84a;
}

.overlay-opacity {
  flex: 1;
  accent-color: var(--accent-warm);
}

.overlay-label {
  font-size: 10px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  flex-shrink: 0;
}

.tone-btns {
  flex: 1;
  display: flex;
  gap: 4px;
}
.tone-btn {
  flex: 1;
  padding: 4px 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.03);
  color: #999;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.tone-btn:hover { border-color: rgba(232, 200, 74, 0.5); color: #ccc; }
.tone-btn.active {
  border-color: #e8c84a;
  color: #e8c84a;
  background: rgba(232, 200, 74, 0.08);
}

.controls-pane {
  width: 300px;
  border-left: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(10, 10, 18, 0.82);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  overflow-y: auto;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

@media (min-width: 1440px) {
  .controls-pane { width: 360px; }
}

@media (min-width: 1920px) {
  .controls-pane { width: 420px; }
}

.control-group {}

.control-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #e8d06a;
  text-shadow:
    0 0 4px rgba(232, 208, 106, 0.95),
    0 0 12px rgba(232, 200, 74, 0.5),
    0 0 24px rgba(232, 200, 74, 0.2);
  margin: 0 0 10px;
}

.shape-grid { display: flex; flex-wrap: wrap; gap: 6px; }

.shape-btn {
  background: #1e1e28;
  border: 2px solid #2a2a35;
  border-radius: 6px;
  padding: 4px;
  cursor: pointer;
  color: #556;
  transition: border-color 0.15s, color 0.15s;
}
.shape-btn:hover  { border-color: #555; color: #aaa; }
.shape-btn:active { transform: scale(0.93); }
.shape-btn.active { border-color: #e8c84a; color: #e8c84a; }

.bg-type-grid { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 12px; }

.bg-type-btn {
  background: #1e1e28;
  border: 1px solid #2a2a35;
  border-radius: 4px;
  color: #aaa;
  font-size: 11px;
  padding: 4px 8px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.bg-type-btn:hover  { border-color: #555; color: #ddd; }
.bg-type-btn:active { transform: scale(0.93); }
.bg-type-btn.active { border-color: #e8c84a; color: #e8c84a; }

/* Club Colors palette editor */
.palette-editor {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.palette-slot {
  position: relative;
  width: 52px;
  height: 52px;
  border-radius: 6px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: background 0.35s ease, border-color 0.15s, transform 0.1s;
  flex: 1;
}

.palette-slot:hover {
  border-color: rgba(255, 255, 255, 0.4);
  transform: scale(1.04);
}

.palette-input-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 1;
  pointer-events: none;
}

.palette-slot.dragging {
  opacity: 0.4;
}
.palette-slot.drag-over {
  border-color: #e8c84a;
  transform: translateY(-2px);
}

.palette-remove {
  position: absolute;
  top: -7px;
  right: -7px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #1e1e28;
  border: 1px solid #555;
  color: #aaa;
  font-size: 11px;
  line-height: 1;
  padding: 0;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 2;
  transition: background 0.12s, color 0.12s;
}
.palette-remove:hover { background: #e05555; border-color: #e05555; color: #fff; }
.palette-slot:hover .palette-remove { display: flex; }

.palette-add {
  flex: 1;
  min-width: 36px;
  border-radius: 6px;
  border: 2px dashed #3a3a4a;
  background: transparent;
  color: #555;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.palette-add:hover { border-color: var(--accent-warm); color: var(--accent-warm); box-shadow: 0 0 8px var(--accent-warm-glow); }

.random-colors-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  margin-top: 8px;
  padding: 7px 10px;
  background: #1e1e28;
  border: 1px solid #2a2a35;
  border-radius: 6px;
  color: #aaa;
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, box-shadow 0.15s;
}
.random-colors-btn:hover { border-color: var(--accent-warm); color: var(--accent-warm); box-shadow: 0 0 10px var(--accent-warm-glow); }

.active-club {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 10px 0 0;
  padding: 7px 10px;
  background: rgba(232, 200, 74, 0.1);
  border: 1px solid rgba(232, 200, 74, 0.35);
  border-radius: 6px;
}
.active-club-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e8c84a;
  box-shadow: 0 0 6px rgba(232, 200, 74, 0.8);
  flex-shrink: 0;
}
.active-club-label {
  font-size: 10px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  flex-shrink: 0;
}
.active-club-name {
  font-size: 13px;
  font-weight: 600;
  color: #e8c84a;
  margin-right: auto;
}
.modified-flag {
  font-size: 9px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: 1px solid #3a3a45;
  border-radius: 3px;
  padding: 1px 5px;
  flex-shrink: 0;
}

.palette-hint {
  font-size: 11px;
  color: #888;
  margin: 0;
  line-height: 1.4;
}

/* Stripe count stepper */
.stripe-count-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.stripe-stepper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stepper-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid #3a3a48;
  background: #1e1e28;
  color: #ccc;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.12s, color 0.12s;
}
.stepper-btn:hover  { border-color: #e8c84a; color: #e8c84a; }
.stepper-btn:active { transform: scale(0.88); }

.stepper-val {
  font-size: 13px;
  color: #e8e8ec;
  min-width: 18px;
  text-align: center;
}

/* Background / border color rows */
.bg-color-stack { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }

.bg-color-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-label {
  font-size: 11px;
  color: #aaa;
  min-width: 44px;
}

.range-row label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #aaa;
}
.range-row input[type="range"] { flex: 1; accent-color: var(--accent-warm); }
.range-row span { font-size: 11px; color: #ddd; min-width: 24px; text-align: right; }

/* Placed symbols list */
.symbol-list { display: flex; flex-direction: column; gap: 6px; }

.symbol-item {
  background: #1e1e28;
  border: 1px solid #2a2a35;
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.15s;
  overflow: hidden;
}
.symbol-item:hover { border-color: #555; }
.symbol-item.selected { border-color: #e8c84a; }

.sym-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
}

.sym-preview { flex-shrink: 0; }

.sym-label {
  flex: 1;
  font-size: 12px;
  color: #aaa;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sym-controls { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }


.sym-remove {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0 2px;
  transition: color 0.15s;
}
.sym-remove:hover { color: #e05555; }

.sym-expanded {
  background: #191922;
  border-top: 1px solid #2a2a35;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.sym-field {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #aaa;
}
.sym-field input[type="range"] { flex: 1; accent-color: var(--accent-warm); }
.sym-field > span:last-child { font-size: 11px; color: #ddd; min-width: 24px; text-align: right; }

.sym-stroke-row { gap: 6px; }
.sym-stroke-range { flex: 1; accent-color: var(--accent-warm); }

.sym-clip-row { gap: 8px; }
.sym-clip-toggle {
  padding: 3px 10px;
  border-radius: 4px;
  border: 1px solid #2a2a35;
  background: #1e1e28;
  color: #888;
  font-size: 11px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.rotation-reset {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  padding: 0;
  border-radius: 4px;
  border: 1px solid #2a2a35;
  background: #1e1e28;
  color: #888;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.rotation-reset:hover { border-color: #e8c84a; color: #e8c84a; }
.sym-clip-toggle:hover { border-color: #555; color: #ccc; }
.sym-clip-toggle.free { border-color: #e8c84a55; color: #e8c84a; }

/* ── Transitions ─────────────────────────────────────────────────────────── */
.scene-fade-enter-active,
.scene-fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.scene-fade-enter-from,
.scene-fade-leave-to { opacity: 0; transform: translateY(-6px); }

.panel-fade-enter-active,
.panel-fade-leave-active { transition: opacity 0.18s ease; }
.panel-fade-enter-from,
.panel-fade-leave-to { opacity: 0; }
</style>
