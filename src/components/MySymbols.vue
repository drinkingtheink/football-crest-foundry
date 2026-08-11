<script setup>
import { ref, computed } from 'vue'
import { useCustomSymbols } from '../composables/useCustomSymbols.js'
import { useToast } from '../composables/useToast.js'
import { svgToSymbol } from '../utils/svgImport.js'

const emit = defineEmits(['add-custom'])

const { customSymbols, addFromSvg, remove, rename } = useCustomSymbols()
const { addToast } = useToast()

// ── Add form (upload or paste): stage SVG + name, preview live, commit ──
const fileInput = ref(null)
const adding = ref(false)
const showPaste = ref(false)
const svgText = ref('')
const symName = ref('')

const preview = computed(() => {
  const t = svgText.value.trim()
  return t ? svgToSymbol(t) : null   // { paths, viewBox } | { error } | null
})

function startUpload() { fileInput.value?.click() }

function onFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    svgText.value = String(reader.result)
    symName.value = file.name.replace(/\.svg$/i, '')
    showPaste.value = false
    adding.value = true
  }
  reader.onerror = () => addToast('Couldn’t read that file.', { type: 'error' })
  reader.readAsText(file)
}

function startPaste() {
  svgText.value = ''
  symName.value = ''
  showPaste.value = true
  adding.value = true
}

function cancelAdd() {
  adding.value = false
  showPaste.value = false
  svgText.value = ''
  symName.value = ''
}

function commitAdd() {
  const name = symName.value.trim()
  if (!name || !preview.value?.paths) return
  const res = addFromSvg(svgText.value, name)
  if (res?.error) { addToast(res.error, { type: 'error', duration: 4500 }); return }
  addToast('Added to My Symbols', { type: 'success', duration: 2500 })
  cancelAdd()
}

function renameSymbol(cs) {
  const next = window.prompt('Rename symbol', cs.label)
  if (next != null) rename(cs.id, next)
}

// ── Search (filter your own symbols by name) ──
const search = ref('')
const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  return q ? customSymbols.value.filter(s => s.label.toLowerCase().includes(q)) : customSymbols.value
})

// ── Tooltip (teleported, matching the built-in gallery) ──
const tip = ref(null)
function showTip(e, label) {
  const r = e.currentTarget.getBoundingClientRect()
  const below = r.top < 60
  tip.value = { label, x: r.left + r.width / 2, y: below ? r.bottom + 6 : r.top - 6, below }
}
function hideTip() { tip.value = null }
</script>

<template>
  <div class="my-symbols">
    <input ref="fileInput" type="file" accept=".svg,image/svg+xml" hidden @change="onFile" />

    <div v-if="!adding" class="my-tools">
      <button class="my-btn" @click="startUpload">⬆ Upload SVG</button>
      <button class="my-btn ghost" @click="startPaste">Paste markup</button>
    </div>
    <p v-if="!adding" class="my-note">
      Only upload simple, one-colour SVGs you have the right to use.
      <a href="/terms.html" target="_blank" rel="noopener">Terms</a>
    </p>

    <div v-else class="my-add">
      <textarea
        v-if="showPaste"
        v-model="svgText"
        class="my-textarea"
        rows="4"
        placeholder="Paste <svg>…</svg> markup"
      ></textarea>
      <div class="my-add-row">
        <div class="my-preview" :class="{ err: preview && preview.error }">
          <svg v-if="preview && preview.paths" :viewBox="`0 0 ${preview.viewBox[0]} ${preview.viewBox[1]}`" width="30" height="30">
            <path v-for="(p, i) in preview.paths" :key="i" :d="p" fill="currentColor" />
          </svg>
          <span v-else class="my-preview-ph">?</span>
        </div>
        <input v-model="symName" class="my-input" placeholder="Name" @keydown.enter="commitAdd" />
      </div>
      <p v-if="preview && preview.error" class="my-err">{{ preview.error }}</p>
      <div class="my-add-actions">
        <button class="my-btn ghost" @click="cancelAdd">Cancel</button>
        <button class="my-btn" :disabled="!symName.trim() || !(preview && preview.paths)" @click="commitAdd">Add symbol</button>
      </div>
    </div>

    <input
      v-if="customSymbols.length"
      v-model="search"
      class="my-search"
      type="text"
      placeholder="Search my symbols…"
    />

    <div v-if="filtered.length" class="my-grid">
      <button
        v-for="cs in filtered"
        :key="cs.id"
        class="icon-btn"
        @click="emit('add-custom', cs)"
        @mouseenter="showTip($event, cs.label)"
        @mouseleave="hideTip"
      >
        <svg :viewBox="`0 0 ${cs.viewBox[0]} ${cs.viewBox[1]}`" width="34" height="34">
          <path v-for="(p, i) in cs.paths" :key="i" :d="p" fill="currentColor" />
        </svg>
        <span class="cs-edit" title="Rename" @click.stop="renameSymbol(cs)">✎</span>
        <span class="cs-del" title="Delete symbol" @click.stop="remove(cs.id)">✕</span>
      </button>
    </div>
    <p v-else-if="customSymbols.length" class="my-empty">No symbols match “{{ search }}”.</p>
    <p v-else class="my-empty">No custom symbols yet. Upload a simple one-colour SVG.</p>

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
.my-symbols { display: flex; flex-direction: column; gap: 8px; }

.my-tools { display: flex; gap: 6px; }
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

.my-add { display: flex; flex-direction: column; gap: 8px; }
.my-add-row { display: flex; gap: 8px; align-items: center; }
.my-add-row .my-input { flex: 1; }
.my-input, .my-textarea, .my-search {
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
.my-input:focus, .my-textarea:focus, .my-search:focus { border-color: #555; }
.my-textarea { font-family: ui-monospace, Menlo, monospace; resize: vertical; }
.my-search::placeholder { color: #555; }

.my-preview {
  flex: none;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #2a2a35;
  border-radius: 6px;
  background: #1e1e28;
  color: #cdb96a;
}
.my-preview.err { border-color: rgba(224, 85, 85, 0.5); color: #e05555; }
.my-preview-ph { color: #555; font-size: 16px; }
.my-err { margin: 0; font-size: 11px; color: #e05555; }
.my-add-actions { display: flex; gap: 6px; justify-content: flex-end; }

.my-grid { display: flex; flex-wrap: wrap; gap: 5px; }
.my-empty { font-size: 11px; color: #555; text-align: center; margin: 6px 0; }
.my-note { margin: 0; font-size: 10px; color: #666; line-height: 1.5; }
.my-note a { color: #9a9aa8; text-decoration: underline; }
.my-note a:hover { color: var(--accent-warm); }

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
.icon-btn:hover { background: #252530; border-color: #e8c84a; color: #e8c84a; }

.cs-edit, .cs-del {
  position: absolute;
  top: -5px;
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
.cs-edit { left: -5px; }
.cs-del  { right: -5px; }
.icon-btn:hover .cs-edit, .icon-btn:hover .cs-del { opacity: 1; }
.cs-edit:hover { color: #111; background: var(--accent-warm); }
.cs-del:hover  { color: #fff; background: #e05555; }

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
</style>
