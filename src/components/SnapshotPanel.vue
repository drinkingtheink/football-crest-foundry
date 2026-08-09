<script setup>
import { ref, onMounted } from 'vue'
import { listSnapshots, deleteSnapshot } from '../utils/snapshots.js'
import { useToast } from '../composables/useToast.js'
import SaveModal from './SaveModal.vue'

const props = defineProps({ saveFn: { type: Function, required: true } })
const emit = defineEmits(['load'])

const { addToast } = useToast()

async function copyConfig(snap) {
  try {
    await navigator.clipboard.writeText(JSON.stringify(snap.config, null, 2))
    addToast('Crest config copied', { type: 'success', duration: 2500 })
  } catch {
    addToast('Couldn’t copy config', { type: 'error' })
  }
}

const snapshots = ref([])
const saving = ref(false)
const showSaveModal = ref(false)
const defaultName = ref('')

const loading = ref(false)
async function refresh() {
  loading.value = true
  try {
    snapshots.value = await listSnapshots()
  } catch {
    addToast('Couldn’t load your saved crests', { type: 'error' })
  } finally {
    loading.value = false
  }
}
defineExpose({ refresh, startSave })
onMounted(refresh)

function startSave() {
  defaultName.value = `Design ${new Date().toLocaleDateString()}`
  showSaveModal.value = true
}

async function confirmSave(name) {
  saving.value = true
  try {
    const saved = await props.saveFn(name)
    if (saved === false) return   // save failed (e.g. storage full); keep the dialog open
    refresh()
    showSaveModal.value = false
  } finally {
    saving.value = false
  }
}

function handleLoad(snap) { emit('load', snap.config) }

async function handleDelete(snap) {
  if (!window.confirm(`Delete "${snap.name}"?`)) return
  try {
    await deleteSnapshot(snap.id)
  } catch {
    addToast('Couldn’t delete that crest', { type: 'error' })
    return
  }
  refresh()
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div class="snapshot-panel">
    <div class="snap-header">
      <button class="snap-save-btn" @click="startSave">+ Save Snapshot</button>
    </div>

    <SaveModal
      :open="showSaveModal"
      :saving="saving"
      :default-name="defaultName"
      @save="confirmSave"
      @close="showSaveModal = false"
    />

    <p v-if="loading && !snapshots.length" class="snap-empty">Loading…</p>
    <p v-else-if="!snapshots.length" class="snap-empty">No snapshots saved yet.<br>Save a snapshot to revisit this design later.</p>

    <div v-else class="snap-grid">
      <div v-for="snap in snapshots" :key="snap.id" class="snap-card">
        <button class="snap-thumb-btn" @click="handleLoad(snap)" :title="`Load: ${snap.name}`">
          <img v-if="snap.thumbnail" :src="snap.thumbnail" class="snap-thumb" />
          <div v-else class="snap-thumb-placeholder" />
        </button>
        <div class="snap-meta">
          <span class="snap-name" :title="snap.name">{{ snap.name }}</span>
          <span class="snap-date">{{ formatDate(snap.timestamp) }}</span>
        </div>
        <div class="snap-actions">
          <button class="snap-load-btn" @click="handleLoad(snap)">Load</button>
          <button class="snap-copy-btn" @click="copyConfig(snap)" title="Copy crest config (JSON)">{ }</button>
          <button class="snap-del-btn" @click="handleDelete(snap)" title="Delete">✕</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.snap-header { margin-bottom: 10px; }

.snap-save-btn {
  width: 100%;
  background: #1e1e28;
  border: 1px dashed #3a3a4a;
  border-radius: 6px;
  color: #aaa;
  font-size: 12px;
  padding: 8px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, box-shadow 0.15s;
}
.snap-save-btn:hover { border-color: var(--accent-warm); color: var(--accent-warm); box-shadow: 0 0 10px var(--accent-warm-glow); }

.snap-empty {
  font-size: 11px;
  color: #555;
  text-align: center;
  line-height: 1.6;
  margin: 6px 0 0;
}

.snap-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.snap-card {
  background: #1e1e28;
  border: 1px solid #2a2a35;
  border-radius: 7px;
  overflow: hidden;
  transition: border-color 0.15s;
}
.snap-card:hover { border-color: #555; }

.snap-thumb-btn {
  display: block;
  width: 100%;
  background: #0f0f13;
  border: none;
  padding: 0;
  cursor: pointer;
  aspect-ratio: 5 / 6;
  overflow: hidden;
}

.snap-thumb {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.snap-thumb-placeholder {
  width: 100%;
  height: 100%;
  background: #13131a;
}

.snap-meta {
  padding: 5px 7px 2px;
}

.snap-name {
  display: block;
  font-size: 11px;
  color: #ddd;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.snap-date {
  display: block;
  font-size: 10px;
  color: #555;
  margin-top: 1px;
}

.snap-actions {
  display: flex;
  gap: 4px;
  padding: 4px 7px 6px;
}

.snap-load-btn {
  flex: 1;
  background: #2a2a38;
  border: 1px solid #3a3a4a;
  border-radius: 4px;
  color: #bbb;
  font-size: 11px;
  padding: 4px 0;
  cursor: pointer;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.snap-load-btn:hover { background: #e8c84a; color: #111; border-color: #e8c84a; }

.snap-copy-btn {
  background: none;
  border: 1px solid #3a3a4a;
  border-radius: 4px;
  color: #888;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 12px;
  font-weight: 700;
  padding: 3px 6px;
  cursor: pointer;
  line-height: 1;
  transition: color 0.12s, border-color 0.12s, box-shadow 0.12s;
}
.snap-copy-btn:hover { color: var(--accent-warm); border-color: var(--accent-warm); box-shadow: 0 0 8px var(--accent-warm-glow); }

.snap-del-btn {
  background: none;
  border: 1px solid #3a3a4a;
  border-radius: 4px;
  color: #555;
  font-size: 12px;
  padding: 3px 7px;
  cursor: pointer;
  line-height: 1;
  transition: color 0.12s, border-color 0.12s;
}
.snap-del-btn:hover { color: #e05555; border-color: #e05555; }
</style>
