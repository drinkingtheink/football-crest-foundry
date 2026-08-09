<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  open: Boolean,
  saving: Boolean,
  defaultName: { type: String, default: '' },
})
const emit = defineEmits(['save', 'close'])

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

function submit() {
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
          <button class="save-close" title="Close" @click="$emit('close')">×</button>

          <h2 class="save-title">⚒ Save crest</h2>
          <p class="save-text">Name this design so you can revisit it later.</p>

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
              <button type="submit" class="save-confirm" :disabled="saving || !name.trim()">
                {{ saving ? 'Saving…' : 'Save' }}
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

.save-actions { display: flex; gap: 8px; justify-content: flex-end; }

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
  background: #e8c84a;
  border: none;
  border-radius: 6px;
  color: #111;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 16px;
  cursor: pointer;
  transition: opacity 0.15s;
}
.save-confirm:disabled { opacity: 0.55; cursor: default; }

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

.save-fade-enter-active,
.save-fade-leave-active { transition: opacity 0.2s ease; }
.save-fade-enter-from,
.save-fade-leave-to { opacity: 0; }
</style>
