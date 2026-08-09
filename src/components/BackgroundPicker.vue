<script setup>
import { computed } from 'vue'
import { bgOptions, imageBgTypes, patternTonedTypes, patternTones } from '../data/backgrounds.js'
import { auroraBg, wavesBg, crisscrossBg, pinstripeBg, diamondsBg, dotsBg, gridBg, zigzagBg } from '../utils/patterns.js'

const props = defineProps({
  bg: { type: String, default: 'none' },
  tone: { type: String, default: 'dark' },
  palette: { type: Array, default: () => ['#1a3a6b'] },
  overlay: { type: Object, default: null },   // reactive { color, opacity } for image bgs
})
const emit = defineEmits(['update:bg', 'update:tone'])

const thumbFor = (id) => {
  switch (id) {
    case 'aurora':     return auroraBg(props.palette)
    case 'waves':      return wavesBg(props.palette, props.tone)
    case 'crisscross': return crisscrossBg(props.palette, props.tone)
    case 'pinstripe':  return pinstripeBg(props.palette, props.tone)
    case 'diamonds':   return diamondsBg(props.palette, props.tone)
    case 'dots':       return dotsBg(props.palette, props.tone)
    case 'grid':       return gridBg(props.palette, props.tone)
    case 'zigzag':     return zigzagBg(props.palette, props.tone)
    default:           return {}
  }
}

const showOverlayRow = computed(() => imageBgTypes.has(props.bg) || patternTonedTypes.has(props.bg))
</script>

<template>
  <div class="bgp">
    <div class="bg-picker">
      <button
        v-for="opt in bgOptions"
        :key="opt.id"
        class="bg-opt"
        :class="{ active: bg === opt.id }"
        :title="opt.label"
        :style="thumbFor(opt.id)"
        @click="emit('update:bg', opt.id)"
      >
        <img v-if="opt.thumb" :src="opt.thumb" class="bg-opt-thumb" />
        <span v-else-if="opt.id === 'bokeh'" class="bg-opt-bokeh" />
        <span v-else-if="opt.id === 'none'" class="bg-opt-none" />
      </button>
    </div>

    <div class="overlay-controls" :style="{ visibility: showOverlayRow ? 'visible' : 'hidden' }">
      <template v-if="overlay && imageBgTypes.has(bg)">
        <input
          type="color"
          :value="overlay.color"
          class="overlay-color"
          title="Overlay color"
          @input="overlay.color = $event.target.value"
        />
        <div class="overlay-swatches">
          <button
            v-for="(color, i) in palette"
            :key="i"
            class="overlay-swatch"
            :class="{ active: overlay.color.toLowerCase() === color.toLowerCase() }"
            :style="{ background: color }"
            :title="`Set overlay to ${color}`"
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
      <template v-else-if="patternTonedTypes.has(bg)">
        <div class="tone-btns">
          <button
            v-for="t in patternTones"
            :key="t"
            class="tone-btn"
            :class="{ active: tone === t }"
            @click="emit('update:tone', t)"
          >{{ t }}</button>
        </div>
        <span class="overlay-label">tone</span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.bgp { display: flex; flex-direction: column; gap: 6px; }

.bg-picker {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: nowrap;
  justify-content: flex-start;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 6px;
  scrollbar-width: thin;
  scrollbar-color: #3a3a48 transparent;
}
.bg-picker::-webkit-scrollbar { height: 8px; }
.bg-picker::-webkit-scrollbar-track { background: transparent; }
.bg-picker::-webkit-scrollbar-thumb {
  background: #2f2f3b;
  border-radius: 6px;
  border: 2px solid transparent;
  background-clip: content-box;
}
.bg-picker::-webkit-scrollbar-thumb:hover { background: var(--accent-warm); background-clip: content-box; }

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
.bg-opt:hover  { transform: scale(1.1); border-color: rgba(255,255,255,0.3); }
.bg-opt.active { border-color: var(--accent-warm); box-shadow: 0 0 8px var(--accent-warm-glow); }

.bg-opt-thumb { width: 100%; height: 100%; object-fit: cover; display: block; }
.bg-opt-none  { display: block; width: 100%; height: 100%; background: #07070e; }
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
.overlay-swatches { display: flex; gap: 4px; flex-shrink: 0; }
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
.overlay-swatch.active { border-color: #e8c84a; box-shadow: 0 0 0 1px #e8c84a; }
.overlay-opacity { flex: 1; accent-color: var(--accent-warm); }
.overlay-label {
  font-size: 10px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  flex-shrink: 0;
}

.tone-btns { flex: 1; display: flex; gap: 4px; }
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
.tone-btn.active { border-color: #e8c84a; color: #e8c84a; background: rgba(232, 200, 74, 0.08); }
</style>
