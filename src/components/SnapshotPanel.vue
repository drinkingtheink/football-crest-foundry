<script setup>
import { ref, computed, onMounted } from 'vue'
import { listSnapshots, deleteSnapshot, clearCloudDesigns } from '../utils/snapshots.js'
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

// Safety valve — only surfaces when there are cloud designs to clear.
const hasCloud = computed(() => snapshots.value.some(s => s.source === 'cloud'))
const clearing = ref(false)

async function handleClearCloud() {
  if (!window.confirm('Delete ALL of your saved cloud designs? This cannot be undone.')) return
  clearing.value = true
  try {
    const { deleted } = await clearCloudDesigns()
    addToast(`Cleared ${deleted} cloud ${deleted === 1 ? 'design' : 'designs'}`, { type: 'success' })
    refresh()
  } catch {
    addToast('Couldn’t clear your cloud designs', { type: 'error' })
  } finally {
    clearing.value = false
  }
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
        <svg
          v-if="snap.source === 'cloud'"
          class="snap-cloud"
          viewBox="0 0 24 24"
          aria-hidden="true"
          title="Synced to your account"
        >
          <path d="M6.5 19a4.5 4.5 0 0 1-.5-8.97 6 6 0 0 1 11.65-1.2A4 4 0 0 1 18 19z" fill="currentColor" />
        </svg>
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

    <button
      v-if="hasCloud"
      class="snap-clear-cloud"
      :disabled="clearing"
      @click="handleClearCloud"
    >{{ clearing ? 'Clearing…' : 'Clear my cloud designs' }}</button>
  </div>
</template>

<style scoped>
.snap-header { margin-bottom: 10px; }

.snap-clear-cloud {
  display: block;
  margin: 12px auto 2px;
  background: none;
  border: none;
  color: #555;
  font-size: 10.5px;
  padding: 4px 6px;
  cursor: pointer;
  transition: color 0.15s;
}
.snap-clear-cloud:hover:not(:disabled) { color: #e05555; text-decoration: underline; }
.snap-clear-cloud:disabled { opacity: 0.6; cursor: default; }

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
  position: relative;
  background: #1e1e28;
  border: 1px solid #2a2a35;
  border-radius: 7px;
  overflow: hidden;
  transition: border-color 0.15s;
}
.snap-card:hover { border-color: #555; }

/* Quiet hint that this snapshot lives in the account (cloud) rather than
   this browser's localStorage — deliberately understated. */
.snap-cloud {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 13px;
  height: 13px;
  z-index: 2;
  color: rgba(255, 255, 255, 0.45);
  filter: drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.7));
  pointer-events: none;
}
.snap-card:hover .snap-cloud { color: rgba(232, 200, 74, 0.7); }

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
