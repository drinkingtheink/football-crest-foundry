<script setup>
import { ref, watch, nextTick } from 'vue'
import { useAuth } from '../composables/useAuth.js'

const props = defineProps({ open: Boolean })
const emit = defineEmits(['close'])

const { signInWithEmail, signInWithGoogle } = useAuth()

const email = ref('')
const sending = ref(false)
const googling = ref(false)
const sent = ref(false)
const errorMsg = ref('')
const fieldRef = ref(null)

watch(() => props.open, async (v) => {
  if (v) {
    email.value = ''
    sent.value = false
    errorMsg.value = ''
    await nextTick()
    fieldRef.value?.focus()
  }
})

async function google() {
  if (googling.value) return
  googling.value = true
  errorMsg.value = ''
  try {
    await signInWithGoogle()   // redirects away on success
  } catch (e) {
    errorMsg.value = e?.message || 'Could not start Google sign-in.'
    googling.value = false
  }
}

async function submit() {
  const addr = email.value.trim()
  if (!addr || sending.value) return
  sending.value = true
  errorMsg.value = ''
  try {
    await signInWithEmail(addr)
    sent.value = true
  } catch (e) {
    errorMsg.value = e?.message || 'Could not send the sign-in link. Try again.'
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="auth-fade">
      <div v-if="open" class="auth-backdrop" @click.self="$emit('close')">
        <div class="auth-modal" role="dialog" aria-label="Sign in to Crest Foundry">
          <button class="auth-close" title="Close" @click="$emit('close')">×</button>

          <h2 class="auth-title">⚒ Sign in</h2>

          <template v-if="sent">
            <p class="auth-text">
              Check <strong>{{ email }}</strong> for a sign-in link.
              Open it on this device and you’ll be signed in.
            </p>
            <button class="auth-submit" @click="$emit('close')">Done</button>
          </template>

          <template v-else>
            <p class="auth-text">
              Save your crests to the cloud and sync them across devices.
            </p>

            <button class="auth-google" :disabled="googling" @click="google">
              <svg class="g-logo" viewBox="0 0 18 18" width="16" height="16" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/>
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
              </svg>
              {{ googling ? 'Redirecting…' : 'Continue with Google' }}
            </button>

            <div class="auth-divider"><span>or</span></div>

            <form class="auth-form" @submit.prevent="submit">
              <input
                ref="fieldRef"
                v-model="email"
                type="email"
                class="auth-input"
                placeholder="you@example.com"
                autocomplete="email"
                required
              />
              <button class="auth-submit ghost" type="submit" :disabled="sending">
                {{ sending ? 'Sending…' : 'Email me a link' }}
              </button>
            </form>

            <p v-if="errorMsg" class="auth-error">{{ errorMsg }}</p>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.auth-backdrop {
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

.auth-modal {
  position: relative;
  width: min(400px, calc(100vw - 40px));
  background: #13131a;
  border: 1px solid #2a2a35;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
}

.auth-close {
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
.auth-close:hover { border-color: #e05555; color: #e05555; }

.auth-title {
  margin: 0 0 10px;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #e8c84a;
}

.auth-text {
  margin: 0 0 16px;
  font-size: 13px;
  line-height: 1.6;
  color: #b9b6b6;
}
.auth-text strong { color: #e8e8ec; }

.auth-google {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  background: #fff;
  border: none;
  border-radius: 6px;
  color: #1f1f1f;
  font-size: 13px;
  font-weight: 600;
  padding: 10px 14px;
  cursor: pointer;
  transition: opacity 0.15s;
}
.auth-google:disabled { opacity: 0.6; cursor: default; }
.g-logo { flex-shrink: 0; }

.auth-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 14px 0;
  color: #555;
  font-size: 11px;
}
.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #2a2a35;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.auth-input {
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
.auth-input:focus { border-color: var(--accent-warm); }

.auth-submit {
  background: #e8c84a;
  border: none;
  border-radius: 6px;
  color: #111;
  font-size: 13px;
  font-weight: 600;
  padding: 9px 14px;
  cursor: pointer;
  transition: opacity 0.15s;
}
.auth-submit:disabled { opacity: 0.55; cursor: default; }
.auth-submit.ghost {
  background: #1e1e28;
  border: 1px solid #3a3a4a;
  color: #bbb;
  font-weight: 500;
}
.auth-submit.ghost:hover { border-color: var(--accent-warm); color: var(--accent-warm); }

.auth-error {
  margin: 10px 0 0;
  font-size: 12px;
  color: #e05555;
}

.auth-fade-enter-active,
.auth-fade-leave-active { transition: opacity 0.2s ease; }
.auth-fade-enter-from,
.auth-fade-leave-to { opacity: 0; }
</style>
