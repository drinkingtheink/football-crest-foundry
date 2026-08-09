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
          <button class="share-close" title="Close" @click="$emit('close')">×</button>

          <h2 class="share-title">⚒ Share crest</h2>
          <p class="share-text">Anyone with this link can view, download, and remix this crest.</p>

          <div v-if="busy" class="share-loading">Creating link…</div>
          <template v-else>
            <div class="share-row">
              <input ref="fieldRef" class="share-input" :value="url" readonly @focus="$event.target.select()" />
              <button class="share-copy" @click="copy">Copy</button>
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
  flex-shrink: 0;
  background: #e8c84a;
  border: none;
  border-radius: 6px;
  color: #111;
  font-size: 13px;
  font-weight: 600;
  padding: 9px 16px;
  cursor: pointer;
}

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

.share-fade-enter-active,
.share-fade-leave-active { transition: opacity 0.2s ease; }
.share-fade-enter-from,
.share-fade-leave-to { opacity: 0; }
</style>
