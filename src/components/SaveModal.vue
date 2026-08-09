<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  open: Boolean,
  saving: Boolean,
  defaultName: { type: String, default: '' },
  activeName: { type: String, default: '' },   // set when editing an existing design
})
const emit = defineEmits(['save', 'update', 'close'])

const name = ref('')
const fieldRef = ref(null)

watch(() => props.open, async (v) => {
  if (v) {
    name.value = props.defaultName
    await nextTick()
    fieldRef.value?.focus()
    fieldRef.value?.select()
  }
})

// Primary action: update in place when editing, else create new.
function submit() {
  const trimmed = name.value.trim()
  if (!trimmed || props.saving) return
  emit(props.activeName ? 'update' : 'save', trimmed)
}

function saveCopy() {
  const trimmed = name.value.trim()
  if (!trimmed || props.saving) return
  emit('save', trimmed)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="save-fade">
      <div v-if="open" class="save-backdrop" @click.self="$emit('close')">
        <div class="save-modal" role="dialog" aria-label="Save crest">
          <span class="top-glow" aria-hidden="true"></span>
          <span class="top-embers" aria-hidden="true">
            <i class="oember o1" /><i class="oember o2" /><i class="oember o3" /><i class="oember o4" /><i class="oember o5" /><i class="oember o6" /><i class="oember o7" /><i class="oember o8" /><i class="oember o9" /><i class="oember o10" /><i class="oember o11" /><i class="oember o12" /><i class="oember o13" /><i class="oember o14" /><i class="oember o15" /><i class="oember o16" />
          </span>
          <button class="save-close" title="Close" @click="$emit('close')">×</button>

          <h2 class="save-title"><span class="hammer">⚒</span> <span class="molten">{{ activeName ? 'Update crest' : 'Save crest' }}</span></h2>
          <p class="save-text">{{ activeName ? 'Save your changes to this crest, or keep a separate copy.' : 'Name this design so you can revisit it later.' }}</p>

          <form class="save-form" @submit.prevent="submit">
            <input
              ref="fieldRef"
              v-model="name"
              class="save-input"
              placeholder="Crest name"
              @keydown.escape="$emit('close')"
            />
            <div class="save-actions">
              <button type="button" class="save-cancel" @click="$emit('close')">Cancel</button>
              <button v-if="activeName" type="button" class="save-copy" :disabled="saving || !name.trim()" @click="saveCopy">Save a copy</button>
              <button type="submit" class="save-confirm" :class="{ forging: saving }" :disabled="saving || !name.trim()">
                <svg class="save-bolt" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M13 2 3 14h6l-1 8 10-12h-6z" fill="currentColor"/></svg>
                <span>{{ saving ? 'Forging…' : (activeName ? 'Update' : 'Save') }}</span>
              </button>
            </div>
          </form>

          <p class="save-terms">
            By saving, you agree to our
            <a href="/terms.html" target="_blank" rel="noopener">Terms</a> &amp;
            <a href="/privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.
            Crests may include icons and fonts under their own licenses.
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.save-backdrop {
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

.save-modal {
  position: relative;
  width: min(400px, calc(100vw - 40px));
  background: #13131a;
  border: 1px solid #2a2a35;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
}

.save-close {
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
.save-close:hover { border-color: #e05555; color: #e05555; }

.save-title {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #e8c84a;
}
.save-title .molten {
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

.save-text {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.5;
  color: #b9b6b6;
}

.save-form { display: flex; flex-direction: column; gap: 12px; }

.save-input {
  width: 100%;
  box-sizing: border-box;
  background: #1e1e28;
  border: 1px solid #3a3a4a;
  border-radius: 6px;
  color: #e8e8ec;
  font-size: 13px;
  padding: 9px 11px;
  outline: none;
}
.save-input:focus { border-color: var(--accent-warm); }

.save-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }

.save-copy {
  background: #1e1e28;
  border: 1px solid #3a3a4a;
  border-radius: 6px;
  color: #bbb;
  font-size: 13px;
  padding: 8px 14px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.save-copy:hover:not(:disabled) { color: var(--accent-warm); border-color: var(--accent-warm); }
.save-copy:disabled { opacity: 0.5; cursor: default; }

.save-cancel {
  background: #1e1e28;
  border: 1px solid #3a3a4a;
  border-radius: 6px;
  color: #bbb;
  font-size: 13px;
  padding: 8px 14px;
  cursor: pointer;
  transition: color 0.12s, border-color 0.12s;
}
.save-cancel:hover { color: #e05555; border-color: #e05555; }

.save-confirm {
  position: relative;
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
  padding: 8px 18px;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(232, 200, 74, 0.25);
  transition: box-shadow 0.2s, transform 0.06s, filter 0.2s;
}
.save-confirm:hover:not(:disabled) {
  box-shadow: 0 0 18px rgba(255, 176, 66, 0.55), inset 0 0 10px rgba(255, 240, 200, 0.3);
  filter: brightness(1.05);
}
.save-confirm:active:not(:disabled) { transform: translateY(1px); }
.save-confirm:disabled { opacity: 0.5; cursor: default; box-shadow: none; }

.save-bolt { filter: drop-shadow(0 0 3px rgba(255, 150, 40, 0.6)); }

/* actively forging: the button intensifies its glow */
.save-confirm.forging { box-shadow: 0 0 22px rgba(255, 176, 66, 0.6); }

.save-terms {
  margin: 16px 0 0;
  font-size: 11px;
  line-height: 1.5;
  color: #666;
}
.save-terms a {
  color: #9a9aa8;
  text-decoration: underline;
}
.save-terms a:hover { color: var(--accent-warm); }

@media (prefers-reduced-motion: reduce) {
  .top-embers { display: none; }
}

.save-fade-enter-active,
.save-fade-leave-active { transition: opacity 0.2s ease; }
.save-fade-enter-from,
.save-fade-leave-to { opacity: 0; }
</style>
