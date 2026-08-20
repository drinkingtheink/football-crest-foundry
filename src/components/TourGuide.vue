<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import LogoMark from './LogoMark.vue'

const props = defineProps({
  open: Boolean,
  steps: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'finish'])

const GAP = 16
const PAD = 8
const CARD_W = 300
const EST_H = 220

const stepIndex = ref(0)
const rect = ref(null)          // target box in viewport coords, or null (centered)
const viewport = ref({ w: window.innerWidth, h: window.innerHeight })

const current = computed(() => props.steps[stepIndex.value] || null)
const isFirst = computed(() => stepIndex.value === 0)
const isLast = computed(() => stepIndex.value === props.steps.length - 1)
const narrow = computed(() => viewport.value.w < 680)
const centered = computed(() => !rect.value || narrow.value)

let rafId = 0
function scheduleMeasure() {
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = 0
    measure()
  })
}

async function measure() {
  viewport.value = { w: window.innerWidth, h: window.innerHeight }
  const step = current.value
  if (!step?.target) { rect.value = null; return }
  const el = document.querySelector(`[data-tour="${step.target}"]`)
  if (!el) { rect.value = null; return }
  el.scrollIntoView({ block: 'center', inline: 'nearest' })
  await nextTick()
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) { rect.value = null; return }
  rect.value = { top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right }
}

const holeStyle = computed(() => {
  const r = rect.value
  if (!r || narrow.value) return null
  return {
    top: `${r.top - PAD}px`,
    left: `${r.left - PAD}px`,
    width: `${r.width + PAD * 2}px`,
    height: `${r.height + PAD * 2}px`,
  }
})

function resolvePlacement(r) {
  const pref = current.value?.placement || 'bottom'
  const { w } = viewport.value
  if (pref === 'right' && r.right + GAP + CARD_W > w - 12) return 'left'
  if (pref === 'left' && r.left - GAP - CARD_W < 12) return 'right'
  return pref
}

const cardStyle = computed(() => {
  const r = rect.value
  const { w, h } = viewport.value
  if (!r || narrow.value) return null   // centered / bottom-sheet handled in template class
  const place = resolvePlacement(r)
  const clampX = (x) => Math.max(12, Math.min(x, w - CARD_W - 12))
  const clampTop = (y) => Math.max(12, Math.min(y, h - EST_H - 12))
  const cx = r.left + r.width / 2
  switch (place) {
    case 'right':
      return { left: `${r.right + GAP}px`, top: `${clampTop(r.top)}px` }
    case 'left':
      return { left: `${r.left - GAP - CARD_W}px`, top: `${clampTop(r.top)}px` }
    case 'top':
      return { left: `${clampX(cx - CARD_W / 2)}px`, bottom: `${h - r.top + GAP}px` }
    case 'bottom':
    default:
      return { left: `${clampX(cx - CARD_W / 2)}px`, top: `${r.bottom + GAP}px` }
  }
})

function next() {
  if (isLast.value) { finish(); return }
  stepIndex.value++
}
function back() {
  if (isFirst.value) return
  stepIndex.value--
}
function skip() { emit('close') }
function finish() { emit('finish') }

function onKey(e) {
  if (!props.open) return
  if (e.key === 'Escape') { e.preventDefault(); skip() }
  else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next() }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); back() }
}

function bind() {
  window.addEventListener('keydown', onKey)
  window.addEventListener('resize', scheduleMeasure)
  window.addEventListener('scroll', scheduleMeasure, true)
}
function unbind() {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', scheduleMeasure)
  window.removeEventListener('scroll', scheduleMeasure, true)
}

watch(() => props.open, (v) => {
  if (v) {
    stepIndex.value = 0
    bind()
    nextTick(measure)
  } else {
    unbind()
  }
})

watch(stepIndex, () => nextTick(measure))

onBeforeUnmount(unbind)
</script>

<template>
  <Teleport to="body">
    <Transition name="tour-fade">
      <div v-if="open" class="tour-root" role="dialog" aria-label="Welcome tour">
        <!-- Full dim (no cutout) when centered / narrow -->
        <div v-if="centered" class="tour-dim" @click="skip" />

        <!-- Spotlight cutout: the box-shadow paints the dim around the hole -->
        <div v-else class="tour-hole" :style="holeStyle" aria-hidden="true">
          <span class="hole-rim" />
        </div>

        <!-- Callout card -->
        <div
          class="tour-card"
          :class="{ 'is-centered': centered, 'is-narrow': narrow }"
          :style="cardStyle"
        >
          <span class="top-glow" aria-hidden="true"></span>
          <span class="top-embers" aria-hidden="true">
            <i class="oember o1" /><i class="oember o2" /><i class="oember o3" /><i class="oember o4" /><i class="oember o5" /><i class="oember o6" /><i class="oember o7" /><i class="oember o8" /><i class="oember o9" /><i class="oember o10" /><i class="oember o11" /><i class="oember o12" />
          </span>

          <button class="tour-close" title="Skip tour" @click="skip">×</button>

          <LogoMark v-if="current?.logo" class="tour-logo" />

          <p class="tour-step-count">{{ stepIndex + 1 }} / {{ steps.length }}</p>
          <h2 class="tour-title"><span class="molten">{{ current?.title }}</span></h2>
          <p class="tour-body" v-html="current?.body" />

          <div class="tour-dots" aria-hidden="true">
            <span
              v-for="(s, i) in steps"
              :key="i"
              class="tour-dot"
              :class="{ active: i === stepIndex, done: i < stepIndex }"
            />
          </div>

          <div class="tour-actions">
            <button class="tour-skip" @click="skip">Skip</button>
            <div class="tour-nav">
              <button v-if="!isFirst" class="tour-back" @click="back">Back</button>
              <button class="tour-next" @click="next">
                {{ isLast ? 'Start forging ⚒' : 'Next' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.tour-root {
  position: fixed;
  inset: 0;
  z-index: 120;
}

.tour-dim {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.62);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
}

/* The cutout: an oversized box-shadow paints the surrounding dim, the hole itself
   stays clear. pointer-events off so the highlighted control is still visible
   (clicks fall through to the dim via the card / skip). */
.tour-hole {
  position: absolute;
  border-radius: 10px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.62);
  pointer-events: none;
  transition: top 0.28s ease, left 0.28s ease, width 0.28s ease, height 0.28s ease;
}
.hole-rim {
  position: absolute;
  inset: -1px;
  border-radius: 11px;
  border: 1.5px solid rgba(255, 170, 70, 0.75);
  box-shadow: 0 0 14px 2px rgba(255, 140, 40, 0.5), inset 0 0 10px rgba(255, 150, 45, 0.25);
  animation: tour-rim 3.2s ease-in-out infinite;
}
@keyframes tour-rim {
  0%, 100% { opacity: 0.55; }
  50%      { opacity: 1; }
}

.tour-card {
  position: absolute;
  width: min(300px, calc(100vw - 32px));
  background: #13131a;
  border: 1px solid #2a2a35;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
}
.tour-card.is-centered {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.tour-card.is-narrow {
  top: auto;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: min(360px, calc(100vw - 24px));
}

.tour-close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid #2a2a35;
  background: #1e1e28;
  color: #888;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.tour-close:hover { border-color: #e05555; color: #e05555; }

/* higher specificity so it beats LogoMark's own scoped width/height (38×43) */
.tour-card .tour-logo {
  display: flex;
  width: 58px;
  height: 66px;
  margin: 2px auto 12px;
}

.tour-step-count {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #777;
}

.tour-title {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.3px;
  color: #e8c84a;
  padding-right: 20px;
}
.tour-title .molten {
  background: linear-gradient(180deg, #ffe89a, #e8c84a 55%, #c2911f);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

.tour-body {
  margin: 0 0 16px;
  font-size: 12.5px;
  line-height: 1.6;
  color: #b9b6b6;
}
.tour-body :deep(strong) { color: #e8e8ec; font-weight: 600; }

.tour-dots {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
}
.tour-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #2a2a35;
  transition: background 0.2s, box-shadow 0.2s;
}
.tour-dot.done { background: #6a5a2a; }
.tour-dot.active {
  background: #e8c84a;
  box-shadow: 0 0 6px 1px rgba(232, 200, 74, 0.7);
}

.tour-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.tour-nav { display: flex; gap: 8px; }

.tour-skip {
  background: none;
  border: none;
  color: #777;
  font-size: 12px;
  cursor: pointer;
  padding: 6px 2px;
  transition: color 0.15s;
}
.tour-skip:hover { color: #aaa; }

.tour-back {
  background: #1e1e28;
  border: 1px solid #3a3a4a;
  border-radius: 6px;
  color: #bbb;
  font-size: 12.5px;
  font-weight: 500;
  padding: 8px 14px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.tour-back:hover { border-color: var(--accent-warm); color: var(--accent-warm); }

.tour-next {
  background: #e8c84a;
  border: none;
  border-radius: 6px;
  color: #111;
  font-size: 12.5px;
  font-weight: 600;
  padding: 8px 16px;
  cursor: pointer;
  transition: opacity 0.15s;
}
.tour-next:hover { opacity: 0.9; }

/* --- Foundry chrome: molten rim + rising embers (shared modal vocabulary) --- */
.top-glow {
  position: absolute;
  top: -1px;
  left: 4%;
  right: 4%;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, transparent, rgba(255, 150, 45, 0.85) 20%, rgba(255, 190, 80, 0.95) 50%, rgba(255, 150, 45, 0.85) 80%, transparent);
  filter: blur(2px);
  pointer-events: none;
  animation: forge-rim 3.2s ease-in-out infinite;
}
@keyframes forge-rim {
  0%, 100% { opacity: 0.5; }
  50%      { opacity: 1; }
}
.top-embers {
  position: absolute;
  top: -2px;
  left: 4%;
  right: 4%;
  height: 1px;
  pointer-events: none;
}
.top-embers .oember {
  position: absolute;
  top: 0;
  width: 2.5px;
  height: 2.5px;
  border-radius: 50%;
  background: #ffe0a0;
  box-shadow: 0 0 5px 1px rgba(255, 140, 40, 0.9);
  opacity: 0;
  animation: top-ember-rise 3.4s ease-out infinite;
}
.top-embers .oember:nth-child(3n) {
  width: 3.5px;
  height: 3.5px;
  background: #fff1c6;
  box-shadow: 0 0 8px 1.5px rgba(255, 155, 50, 1);
}
.top-embers .o1  { left: 5%;  --dx: -5px; animation-duration: 3.2s; animation-delay: -0.2s; }
.top-embers .o2  { left: 14%; --dx: 3px;  animation-duration: 4.1s; animation-delay: -1.4s; }
.top-embers .o3  { left: 23%; --dx: -3px; animation-duration: 3.6s; animation-delay: -2.7s; }
.top-embers .o4  { left: 32%; --dx: 6px;  animation-duration: 4.4s; animation-delay: -0.8s; }
.top-embers .o5  { left: 41%; --dx: -2px; animation-duration: 3.9s; animation-delay: -2.1s; }
.top-embers .o6  { left: 50%; --dx: 4px;  animation-duration: 3.4s; animation-delay: -3.3s; }
.top-embers .o7  { left: 59%; --dx: -6px; animation-duration: 4.6s; animation-delay: -1.1s; }
.top-embers .o8  { left: 68%; --dx: 2px;  animation-duration: 3.7s; animation-delay: -2.5s; }
.top-embers .o9  { left: 77%; --dx: -4px; animation-duration: 4.2s; animation-delay: -0.5s; }
.top-embers .o10 { left: 86%; --dx: 5px;  animation-duration: 3.5s; animation-delay: -1.9s; }
.top-embers .o11 { left: 92%; --dx: -3px; animation-duration: 4.5s; animation-delay: -3.0s; }
.top-embers .o12 { left: 97%; --dx: 3px;  animation-duration: 3.8s; animation-delay: -0.9s; }
@keyframes top-ember-rise {
  0%   { transform: translate(0, 0) scale(1);               opacity: 0; }
  8%   { opacity: 1; }
  55%  { opacity: 0.5; }
  100% { transform: translate(var(--dx), -34px) scale(0.25); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .top-embers { display: none; }
  .top-glow, .hole-rim { animation: none; }
  .tour-hole { transition: none; }
}

.tour-fade-enter-active,
.tour-fade-leave-active { transition: opacity 0.25s ease; }
.tour-fade-enter-from,
.tour-fade-leave-to { opacity: 0; }
</style>
