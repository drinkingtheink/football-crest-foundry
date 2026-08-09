<script setup>
import { ref } from 'vue'
import BadgeComposer from './BadgeComposer.vue'
import AppBackground from './AppBackground.vue'
import BackgroundPicker from './BackgroundPicker.vue'
import LogoMark from './LogoMark.vue'
import { exportCrestPng, exportCrestSvg, crestFilename } from '../utils/exportBadge.js'

const props = defineProps({
  config: { type: Object, default: null },
  name: { type: String, default: '' },
  loading: Boolean,
  error: Boolean,
  bgType: { type: String, default: 'none' },
  tone: { type: String, default: 'dark' },
  overlay: { type: Object, default: null },   // { color, opacity } for image backgrounds
  palette: { type: Array, default: () => [] }, // tints the picker thumbs to match the backdrop
})
const emit = defineEmits(['remix', 'close', 'step-bg', 'set-bg', 'set-tone'])

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
    <AppBackground :type="bgType" :tone="tone" :palette="palette" />
    <div v-if="overlay" class="shared-overlay" :style="{ background: overlay.color, opacity: overlay.opacity }" />

    <button class="shared-bg-arrow left" title="Previous background" @click="emit('step-bg', -1)">‹</button>
    <button class="shared-bg-arrow right" title="Next background" @click="emit('step-bg', 1)">›</button>

    <div class="shared-logo">
      <LogoMark class="shared-logo-mark" />
      <div class="shared-logo-text">
        <p class="shared-logo-name">Crest Foundry</p>
        <p class="shared-logo-tag">Forge Your Club's Legacy</p>
      </div>
    </div>

    <div class="shared-inner">
      <div v-if="loading" class="shared-state">Loading crest…</div>

      <div v-else-if="error || !config" class="shared-state">
        <h1 class="shared-oops">Crest not found</h1>
        <p>This link is invalid, or the crest is no longer shared.</p>
        <button class="shared-primary" @click="emit('close')">Make your own crest →</button>
      </div>

      <template v-else>
        <div class="shared-stage">
          <BadgeComposer ref="composerRef" :config="config" :size="420" uid="shared" />
        </div>

        <div class="shared-panel">
          <h1 v-if="name" class="shared-name">{{ name }}</h1>

          <div class="shared-actions">
            <button class="shared-primary" @click="emit('remix')">Remix this crest</button>
            <button class="shared-btn" :disabled="exporting" @click="download('png')">{{ exporting ? '…' : '⬇ PNG' }}</button>
            <button class="shared-btn" :disabled="exporting" @click="download('svg')">{{ exporting ? '…' : '⬇ SVG' }}</button>
          </div>

          <button class="shared-make" @click="emit('close')">Make your own crest →</button>
        </div>

        <div class="shared-bg-pill">
          <BackgroundPicker
            :bg="bgType"
            :tone="tone"
            :palette="palette"
            :overlay="overlay"
            @update:bg="emit('set-bg', $event)"
            @update:tone="emit('set-tone', $event)"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.shared-view {
  position: fixed;
  inset: 0;
  z-index: 200;
  overflow-y: auto;
  background: #0f0f13;
}

/* image-background tint, mirroring the editor's app-overlay */
.shared-overlay {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

/* Browse backgrounds, mirroring the editor's bg arrows */
.shared-bg-arrow {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  z-index: 4;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  font-size: 28px;
  line-height: 1;
  padding: 10px 14px;
  user-select: none;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.shared-bg-arrow:hover {
  background: rgba(0, 0, 0, 0.6);
  border-color: rgba(255, 255, 255, 0.28);
  color: #fff;
}
.shared-bg-arrow.left  { left: 14px; }
.shared-bg-arrow.right { right: 14px; }

.shared-logo {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px 8px 12px;
  background: rgba(15, 15, 19, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 12px;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}
.shared-logo-mark { flex: none; }
.shared-logo-text { display: flex; flex-direction: column; gap: 1px; }
.shared-logo-name {
  margin: 0;
  font-family: 'Yeseva One', Georgia, serif;
  font-size: 22px;
  font-weight: 400;
  letter-spacing: 0.3px;
  line-height: 1.05;
  color: #e8c84a;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.6);
}
.shared-logo-tag {
  margin: 0;
  font-size: 10px;
  font-style: italic;
  letter-spacing: 0.02em;
  color: #b9b6b6;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
}

.shared-inner {
  position: relative;
  z-index: 2;
  min-height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 80px 20px 40px;
}

.shared-stage {
  pointer-events: none;   /* read-only crest */
  filter: drop-shadow(0 12px 40px rgba(0, 0, 0, 0.55));
}

/* Background picker pill, matching the other floating panels */
.shared-bg-pill {
  max-width: min(460px, calc(100vw - 32px));
  padding: 8px 12px;
  background: rgba(15, 15, 19, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 14px;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}

/* Legible panel behind the name + actions, matching the logo pill */
.shared-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 18px 22px;
  background: rgba(15, 15, 19, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 14px;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}

.shared-name {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #f2f2f4;
  text-align: center;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.7);
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
  background: rgba(30, 30, 40, 0.85);
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
  color: #cfcfd6;
  font-size: 13px;
  padding: 4px;
  cursor: pointer;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
  transition: color 0.15s;
}
.shared-make:hover { color: var(--accent-warm); text-decoration: underline; }

.shared-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #d6d4da;
  font-size: 14px;
  text-align: center;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.7);
}
.shared-oops { margin: 0; font-size: 22px; color: #f2f2f4; }
</style>
