<script setup>
import { ref } from 'vue'
import BadgeComposer from './BadgeComposer.vue'
import { exportCrestPng, exportCrestSvg, crestFilename } from '../utils/exportBadge.js'

const props = defineProps({
  config: { type: Object, default: null },
  name: { type: String, default: '' },
  loading: Boolean,
  error: Boolean,
})
const emit = defineEmits(['remix', 'close'])

const composerRef = ref(null)
const exporting = ref(false)

async function download(format) {
  const svgEl = composerRef.value?.svgRootEl
  if (!svgEl || exporting.value) return
  exporting.value = true
  try {
    const texts = props.config?.texts || []
    const opts = { texts, filename: crestFilename(texts, format) }
    if (format === 'svg') await exportCrestSvg(svgEl, opts)
    else await exportCrestPng(svgEl, opts)
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="shared-view">
    <div v-if="loading" class="shared-state">Loading crest…</div>

    <div v-else-if="error || !config" class="shared-state">
      <h1 class="shared-oops">Crest not found</h1>
      <p>This link is invalid, or the crest is no longer shared.</p>
      <button class="shared-primary" @click="emit('close')">Make your own crest →</button>
    </div>

    <template v-else>
      <div class="shared-brand">⚒ Crest Foundry</div>

      <div class="shared-stage">
        <BadgeComposer ref="composerRef" :config="config" :size="420" uid="shared" />
      </div>

      <h1 v-if="name" class="shared-name">{{ name }}</h1>

      <div class="shared-actions">
        <button class="shared-primary" @click="emit('remix')">Remix this crest</button>
        <button class="shared-btn" :disabled="exporting" @click="download('png')">{{ exporting ? '…' : '⬇ PNG' }}</button>
        <button class="shared-btn" :disabled="exporting" @click="download('svg')">{{ exporting ? '…' : '⬇ SVG' }}</button>
      </div>

      <button class="shared-make" @click="emit('close')">Make your own crest →</button>
    </template>
  </div>
</template>

<style scoped>
.shared-view {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 32px 20px;
  background: #0f0f13;
  overflow-y: auto;
}

.shared-brand {
  position: absolute;
  top: 22px;
  left: 24px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #e8c84a;
}

.shared-stage {
  /* read-only: no dragging/selecting the shared crest */
  pointer-events: none;
  filter: drop-shadow(0 12px 40px rgba(0, 0, 0, 0.55));
}

.shared-name {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #e8e8ec;
  text-align: center;
}

.shared-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.shared-primary {
  background: #e8c84a;
  border: none;
  border-radius: 8px;
  color: #111;
  font-size: 14px;
  font-weight: 700;
  padding: 11px 20px;
  cursor: pointer;
  transition: box-shadow 0.15s, filter 0.15s;
}
.shared-primary:hover { box-shadow: 0 0 18px rgba(232, 200, 74, 0.5); filter: brightness(1.05); }

.shared-btn {
  background: #1e1e28;
  border: 1px solid #3a3a4a;
  border-radius: 8px;
  color: #cfcfd6;
  font-size: 14px;
  padding: 11px 16px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.shared-btn:hover:not(:disabled) { color: var(--accent-warm); border-color: var(--accent-warm); }
.shared-btn:disabled { opacity: 0.5; cursor: default; }

.shared-make {
  background: none;
  border: none;
  color: #888;
  font-size: 13px;
  padding: 4px;
  cursor: pointer;
  transition: color 0.15s;
}
.shared-make:hover { color: var(--accent-warm); text-decoration: underline; }

.shared-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #b9b6b6;
  font-size: 14px;
  text-align: center;
}
.shared-oops { margin: 0; font-size: 22px; color: #e8e8ec; }
</style>
