<script setup>
import { ref, watch } from 'vue'
import { useToast } from '../composables/useToast.js'

const props = defineProps({
  open: Boolean,
  url: { type: String, default: '' },
  busy: Boolean,       // resolving the link
})
const emit = defineEmits(['close', 'revoke'])

const { addToast } = useToast()
const fieldRef = ref(null)

watch(() => props.open, (v) => { if (v) fieldRef.value?.select?.() })

async function copy() {
  try {
    await navigator.clipboard.writeText(props.url)
    addToast('Link copied', { type: 'success', duration: 2000 })
  } catch {
    fieldRef.value?.select()
    addToast('Press ⌘/Ctrl-C to copy', { type: 'tip' })
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="share-fade">
      <div v-if="open" class="share-backdrop" @click.self="$emit('close')">
        <div class="share-modal" role="dialog" aria-label="Share crest">
          <span class="top-glow" aria-hidden="true"></span>
          <span class="top-embers" aria-hidden="true">
            <i class="oember o1" /><i class="oember o2" /><i class="oember o3" /><i class="oember o4" /><i class="oember o5" /><i class="oember o6" /><i class="oember o7" /><i class="oember o8" /><i class="oember o9" /><i class="oember o10" /><i class="oember o11" /><i class="oember o12" /><i class="oember o13" /><i class="oember o14" /><i class="oember o15" /><i class="oember o16" />
          </span>
          <button class="share-close" title="Close" @click="$emit('close')">×</button>

          <h2 class="share-title"><span class="hammer">⚒</span> <span class="molten">Share crest</span></h2>
          <p class="share-text">Anyone with this link can view, download, and remix this crest.</p>

          <div v-if="busy" class="share-loading">Creating link…</div>
          <template v-else>
            <div class="share-row">
              <input ref="fieldRef" class="share-input" :value="url" readonly @focus="$event.target.select()" />
              <button class="share-copy" @click="copy">
                <svg class="share-bolt" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M13 2 3 14h6l-1 8 10-12h-6z" fill="currentColor"/></svg>
                <span>Copy</span>
              </button>
            </div>
            <button class="share-revoke" @click="$emit('revoke')">Stop sharing this crest</button>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.share-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.share-modal {
  position: relative;
  width: min(420px, calc(100vw - 40px));
  background: #13131a;
  border: 1px solid #2a2a35;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
}

.share-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 1px solid #2a2a35;
  background: #1e1e28;
  color: #888;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.share-close:hover { border-color: #e05555; color: #e05555; }

.share-title {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #e8c84a;
}
.share-title .molten {
  background: linear-gradient(180deg, #ffe89a, #e8c84a 55%, #c2911f);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

/* A molten rim glowing along the top edge, breathing on its own cycle */
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

/* Embers pouring off the top edge, like it's radiating heat */
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
/* every few embers is a fatter, brighter one */
.top-embers .oember:nth-child(3n) {
  width: 3.5px;
  height: 3.5px;
  background: #fff1c6;
  box-shadow: 0 0 8px 1.5px rgba(255, 155, 50, 1);
}
.top-embers .o1  { left: 3%;  --dx: -5px; animation-duration: 3.2s; animation-delay: -0.2s; }
.top-embers .o2  { left: 10%; --dx: 3px;  animation-duration: 4.1s; animation-delay: -1.4s; }
.top-embers .o3  { left: 17%; --dx: -3px; animation-duration: 3.6s; animation-delay: -2.7s; }
.top-embers .o4  { left: 24%; --dx: 6px;  animation-duration: 4.4s; animation-delay: -0.8s; }
.top-embers .o5  { left: 31%; --dx: -2px; animation-duration: 3.9s; animation-delay: -2.1s; }
.top-embers .o6  { left: 38%; --dx: 4px;  animation-duration: 3.4s; animation-delay: -3.3s; }
.top-embers .o7  { left: 45%; --dx: -6px; animation-duration: 4.6s; animation-delay: -1.1s; }
.top-embers .o8  { left: 52%; --dx: 2px;  animation-duration: 3.7s; animation-delay: -2.5s; }
.top-embers .o9  { left: 59%; --dx: -4px; animation-duration: 4.2s; animation-delay: -0.5s; }
.top-embers .o10 { left: 66%; --dx: 5px;  animation-duration: 3.5s; animation-delay: -1.9s; }
.top-embers .o11 { left: 73%; --dx: -3px; animation-duration: 4.5s; animation-delay: -3.0s; }
.top-embers .o12 { left: 80%; --dx: 3px;  animation-duration: 3.8s; animation-delay: -0.9s; }
.top-embers .o13 { left: 87%; --dx: -5px; animation-duration: 4.0s; animation-delay: -2.3s; }
.top-embers .o14 { left: 92%; --dx: 4px;  animation-duration: 3.3s; animation-delay: -1.6s; }
.top-embers .o15 { left: 97%; --dx: -2px; animation-duration: 4.3s; animation-delay: -0.3s; }
.top-embers .o16 { left: 6%;  --dx: 5px;  animation-duration: 3.6s; animation-delay: -3.5s; }
@keyframes top-ember-rise {
  0%   { transform: translate(0, 0) scale(1);               opacity: 0; }
  8%   { opacity: 1; }
  55%  { opacity: 0.5; }
  100% { transform: translate(var(--dx), -34px) scale(0.25); opacity: 0; }
}

.share-text {
  margin: 0 0 16px;
  font-size: 13px;
  line-height: 1.5;
  color: #b9b6b6;
}

.share-loading {
  font-size: 13px;
  color: #888;
  padding: 8px 0;
}

.share-row { display: flex; gap: 8px; }

.share-input {
  flex: 1;
  min-width: 0;
  background: #1e1e28;
  border: 1px solid #3a3a4a;
  border-radius: 6px;
  color: #e8e8ec;
  font-size: 12px;
  padding: 9px 11px;
  outline: none;
}
.share-input:focus { border-color: var(--accent-warm); }

.share-copy {
  position: relative;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  overflow: visible;
  background: linear-gradient(180deg, #ffe4a0, #e8c84a 55%, #d3a52c);
  border: 1px solid rgba(255, 230, 150, 0.7);
  border-radius: 6px;
  color: #2a1c00;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
  padding: 9px 16px;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(232, 200, 74, 0.25);
  transition: box-shadow 0.2s, transform 0.06s, filter 0.2s;
}
.share-copy:hover {
  box-shadow: 0 0 18px rgba(255, 176, 66, 0.55), inset 0 0 10px rgba(255, 240, 200, 0.3);
  filter: brightness(1.05);
}
.share-copy:active { transform: translateY(1px); }

.share-bolt { filter: drop-shadow(0 0 3px rgba(255, 150, 40, 0.6)); }

.share-revoke {
  margin-top: 14px;
  background: none;
  border: none;
  color: #666;
  font-size: 11.5px;
  padding: 2px 0;
  cursor: pointer;
  transition: color 0.15s;
}
.share-revoke:hover { color: #e05555; text-decoration: underline; }

@media (prefers-reduced-motion: reduce) {
  .top-embers { display: none; }
}

.share-fade-enter-active,
.share-fade-leave-active { transition: opacity 0.2s ease; }
.share-fade-enter-from,
.share-fade-leave-to { opacity: 0; }
</style>
