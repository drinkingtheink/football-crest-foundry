<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { icons, iconGroups, iconCats } from '../data/icons.js'
import { useCustomSymbols } from '../composables/useCustomSymbols.js'
import { useToast } from '../composables/useToast.js'

const props = defineProps({
  // { [iconId]: count } — how many of each symbol are currently in the design
  placedCounts: { type: Object, default: () => ({}) },
  // Gallery id of the selected canvas symbol; when set, scroll it into view
  selectedIconId: { type: String, default: null },
})
const emit = defineEmits(['add-icon', 'add-custom'])

const search = ref('')
const activeGroup = ref('All')
const tabs = [...iconGroups, 'My Symbols']

// ── My Symbols (user-uploaded, single-fill, one-colour, local) ──────────────
const { customSymbols, addFromSvg, remove } = useCustomSymbols()
const { addToast } = useToast()
const fileInput = ref(null)
const pasteOpen = ref(false)
const pasteText = ref('')
const pasteLabel = ref('')

function onFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => importSvg(String(reader.result), file.name.replace(/\.svg$/i, ''))
  reader.onerror = () => addToast('Couldn’t read that file.', { type: 'error' })
  reader.readAsText(file)
}

function importSvg(text, label) {
  const res = addFromSvg(text, label)
  if (res?.error) { addToast(res.error, { type: 'error', duration: 4500 }); return }
  addToast('Added to My Symbols', { type: 'success', duration: 2500 })
  pasteOpen.value = false
  pasteText.value = ''
  pasteLabel.value = ''
}

function importPaste() {
  if (!pasteText.value.trim()) return
  importSvg(pasteText.value, pasteLabel.value)
}

// Button refs keyed by gallery id, so a selected symbol can be revealed here.
const btnRefs = {}
function setBtnRef(el, id) { if (el) btnRefs[id] = el; else delete btnRefs[id] }
const flashId = ref(null)

// When a symbol is selected on the canvas, jump the gallery to All, drop any
// search filter that would hide it, then scroll to and briefly flash its tile.
watch(() => props.selectedIconId, async id => {
  if (!id) return
  activeGroup.value = 'All'
  search.value = ''
  await nextTick()
  const el = btnRefs[id]
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  flashId.value = id
  setTimeout(() => { if (flashId.value === id) flashId.value = null }, 1200)
})

// Tooltip teleported to <body> and fixed to the viewport, so it isn't clipped
// by the scrollable icon grid (overflow-y) — which cut off the top row's labels.
const tip = ref(null) // { label, x, y, below }
function showTip(e, label) {
  const r = e.currentTarget.getBoundingClientRect()
  const below = r.top < 60
  tip.value = { label, x: r.left + r.width / 2, y: below ? r.bottom + 6 : r.top - 6, below }
}
function hideTip() { tip.value = null }

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  return icons.filter(ic => {
    const matchGroup = activeGroup.value === 'All' || iconCats(ic).includes(activeGroup.value)
    const matchSearch = !q || ic.label.toLowerCase().includes(q)
    return matchGroup && matchSearch
  })
})

// A rectangle primitive lives in the gallery like any symbol. Shown in the
// default view and when its keywords match the search.
const showRectTile = computed(() => {
  const q = search.value.toLowerCase().trim()
  const inGroup = activeGroup.value === 'All' || activeGroup.value === 'Shapes'
  return inGroup && (!q || 'rectangle bar band box banner shape'.includes(q))
})
</script>

<template>
  <div class="icon-picker">
    <input
      v-model="search"
      class="search"
      placeholder="Search symbols…"
      type="text"
    />

    <div class="group-tabs">
      <button
        v-for="g in tabs"
        :key="g"
        class="group-tab"
        :class="{ active: activeGroup === g, 'is-mine': g === 'My Symbols' }"
        @click="activeGroup = g"
      >{{ g }}</button>
    </div>

    <!-- My Symbols: flat list of user-uploaded one-colour SVGs (no categories) -->
    <div v-if="activeGroup === 'My Symbols'" class="icon-grid-scroll">
      <div class="my-tools">
        <button class="my-btn" @click="fileInput.click()">⬆ Upload SVG</button>
        <button class="my-btn ghost" @click="pasteOpen = !pasteOpen">{{ pasteOpen ? 'Close' : 'Paste markup' }}</button>
        <input ref="fileInput" type="file" accept=".svg,image/svg+xml" hidden @change="onFile" />
      </div>
      <div v-if="pasteOpen" class="my-paste">
        <input v-model="pasteLabel" class="my-input" placeholder="Name (optional)" />
        <textarea v-model="pasteText" class="my-textarea" rows="4" placeholder="Paste <svg>…</svg> markup"></textarea>
        <button class="my-btn" :disabled="!pasteText.trim()" @click="importPaste">Add symbol</button>
      </div>
      <p class="my-hint">Simple, one-colour SVGs only — colour is applied on the crest.</p>
      <div v-if="customSymbols.length" class="icon-grid">
        <button
          v-for="cs in customSymbols"
          :key="cs.id"
          class="icon-btn"
          @click="emit('add-custom', cs)"
          @mouseenter="showTip($event, cs.label)"
          @mouseleave="hideTip"
        >
          <svg :viewBox="`0 0 ${cs.viewBox[0]} ${cs.viewBox[1]}`" width="34" height="34">
            <path v-for="(p, i) in cs.paths" :key="i" :d="p" fill="currentColor" />
          </svg>
          <span class="cs-del" title="Delete symbol" @click.stop="remove(cs.id)">✕</span>
        </button>
      </div>
      <p v-else class="my-empty">No custom symbols yet.</p>
    </div>

    <!-- Built-in gallery -->
    <div v-else class="icon-grid-scroll">
      <div class="icon-grid">
        <button
          v-if="showRectTile"
          :ref="el => setBtnRef(el, 'shape:rect')"
          class="icon-btn"
          :class="{ flash: flashId === 'shape:rect' }"
          @click="$emit('add-icon', 'shape:rect')"
          @mouseenter="showTip($event, 'Rectangle')"
          @mouseleave="hideTip"
        >
          <svg viewBox="0 0 100 100" width="34" height="34">
            <rect x="14" y="30" width="72" height="40" fill="currentColor" />
          </svg>
        </button>
        <button
          v-for="ic in filtered"
          :key="ic.id"
          :ref="el => setBtnRef(el, ic.id)"
          class="icon-btn"
          :class="{ placed: placedCounts[ic.id] > 0, flash: flashId === ic.id }"
          @click="$emit('add-icon', ic.id)"
          @mouseenter="showTip($event, ic.label)"
          @mouseleave="hideTip"
        >
          <svg
            :viewBox="ic.viewBox ? `0 0 ${ic.viewBox[0]} ${ic.viewBox[1]}` : '0 0 100 100'"
            width="34" height="34"
          >
            <path v-for="(p, i) in ic.paths" :key="i" :d="p" fill="currentColor" />
          </svg>
          <span
            v-if="placedCounts[ic.id]"
            class="placed-badge"
            :title="`${placedCounts[ic.id]} in design`"
          >{{ placedCounts[ic.id] }}</span>
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="tip"
        class="icon-tip"
        :style="{ left: tip.x + 'px', top: tip.y + 'px', transform: tip.below ? 'translate(-50%, 0)' : 'translate(-50%, -100%)' }"
      >{{ tip.label }}</div>
    </Teleport>
  </div>
</template>

<style scoped>
.icon-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.search {
  background: #1e1e28;
  border: 1px solid #2a2a35;
  border-radius: 5px;
  color: #e8e8ec;
  font-size: 13px;
  padding: 6px 10px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}
.search:focus { border-color: #555; }
.search::placeholder { color: #555; }

.group-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.group-tab {
  background: #1e1e28;
  border: 1px solid #2a2a35;
  border-radius: 4px;
  color: #888;
  cursor: pointer;
  font-size: 10px;
  padding: 3px 7px;
  transition: border-color 0.15s, color 0.15s;
}
.group-tab:hover { border-color: #555; color: #ccc; }
.group-tab.active { border-color: #e8c84a; color: #e8c84a; }

.icon-grid-scroll {
  max-height: min(38vh, 360px);
  overflow-y: auto;
  /* Firefox */
  scrollbar-width: thin;
  scrollbar-color: #3a3a48 transparent;
}
.icon-grid-scroll::-webkit-scrollbar {
  width: 8px;
}
.icon-grid-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.icon-grid-scroll::-webkit-scrollbar-thumb {
  background: #2f2f3b;
  border-radius: 6px;
  border: 2px solid transparent;
  background-clip: content-box;
}
.icon-grid-scroll::-webkit-scrollbar-thumb:hover {
  background: #e8c84a;
  background-clip: content-box;
}

.icon-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  /* overflow visible so ::after tooltips aren't clipped by the scroll container */
  overflow: visible;
  padding-bottom: 2px;
}

.icon-btn {
  position: relative;
  background: #1e1e28;
  border: 1px solid #2a2a35;
  border-radius: 6px;
  color: #778;
  cursor: pointer;
  padding: 4px;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.icon-btn:hover {
  background: #252530;
  border-color: #e8c84a;
  color: #e8c84a;
}

/* Briefly spotlight the tile of a just-selected canvas symbol */
.icon-btn.flash {
  border-color: #4bd6e8;
  color: #4bd6e8;
  background: rgba(75, 214, 232, 0.12);
  animation: icon-flash 1.2s ease-out;
}
@keyframes icon-flash {
  0%   { box-shadow: 0 0 0 0 rgba(75, 214, 232, 0.6); }
  35%  { box-shadow: 0 0 10px 2px rgba(75, 214, 232, 0.55); }
  100% { box-shadow: 0 0 0 0 rgba(75, 214, 232, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .icon-btn.flash { animation: none; }
}

/* Symbols already placed in the design */
.icon-btn.placed {
  border-color: rgba(232, 200, 74, 0.55);
  background: rgba(232, 200, 74, 0.08);
  color: #cdb96a;
}
.icon-tip {
  position: fixed;
  z-index: 1000;
  background: #0f0f13;
  border: 1px solid #3a3a48;
  border-radius: 4px;
  color: #e8e8ec;
  font-size: 11px;
  font-family: system-ui, sans-serif;
  padding: 3px 8px;
  white-space: nowrap;
  pointer-events: none;
}

.placed-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 15px;
  height: 15px;
  box-sizing: border-box;
  padding: 0 3px;
  border-radius: 8px;
  background: #e8c84a;
  border: 1px solid #13131a;
  color: #111;
  font-size: 9px;
  font-weight: 700;
  line-height: 13px;
  text-align: center;
  font-family: system-ui, sans-serif;
  z-index: 11;
}

/* ── My Symbols ── */
.group-tab.is-mine { color: #cdb96a; }
.group-tab.is-mine.active { color: #e8c84a; border-color: #e8c84a; }

.my-tools { display: flex; gap: 6px; margin-bottom: 8px; }
.my-btn {
  background: #1e1e28;
  border: 1px solid #3a3a4a;
  border-radius: 5px;
  color: #cdb96a;
  font-size: 11px;
  padding: 6px 10px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.my-btn:hover:not(:disabled) { border-color: var(--accent-warm); color: var(--accent-warm); }
.my-btn:disabled { opacity: 0.5; cursor: default; }
.my-btn.ghost { color: #888; }

.my-paste { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
.my-input, .my-textarea {
  background: #1e1e28;
  border: 1px solid #2a2a35;
  border-radius: 5px;
  color: #e8e8ec;
  font-size: 12px;
  padding: 6px 8px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}
.my-input:focus, .my-textarea:focus { border-color: #555; }
.my-textarea { font-family: ui-monospace, Menlo, monospace; resize: vertical; }

.my-hint { margin: 0 0 8px; font-size: 10px; color: #666; }
.my-empty { font-size: 11px; color: #555; text-align: center; margin: 10px 0; }

.cs-del {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 15px;
  height: 15px;
  border-radius: 8px;
  background: #2a2a35;
  border: 1px solid #13131a;
  color: #888;
  font-size: 9px;
  line-height: 13px;
  text-align: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s, color 0.12s, background 0.12s;
  z-index: 12;
}
.icon-btn:hover .cs-del { opacity: 1; }
.cs-del:hover { color: #fff; background: #e05555; }

</style>
