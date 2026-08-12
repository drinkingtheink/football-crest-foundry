<script setup>
import { ref, watch, nextTick } from 'vue'
import { useAuth } from '../composables/useAuth.js'

const props = defineProps({ open: Boolean })
const emit = defineEmits(['close'])

const { signInWithEmail, signInWithGoogle, signInWithGitHub, signInWithDiscord, signInWithSlack } = useAuth()

const email = ref('')
const sending = ref(false)
const googling = ref(false)
const githubbing = ref(false)
const discording = ref(false)
const slacking = ref(false)
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

async function github() {
  if (githubbing.value) return
  githubbing.value = true
  errorMsg.value = ''
  try {
    await signInWithGitHub()   // redirects away on success
  } catch (e) {
    errorMsg.value = e?.message || 'Could not start GitHub sign-in.'
    githubbing.value = false
  }
}

async function discord() {
  if (discording.value) return
  discording.value = true
  errorMsg.value = ''
  try {
    await signInWithDiscord()   // redirects away on success
  } catch (e) {
    errorMsg.value = e?.message || 'Could not start Discord sign-in.'
    discording.value = false
  }
}

async function slack() {
  if (slacking.value) return
  slacking.value = true
  errorMsg.value = ''
  try {
    await signInWithSlack()   // redirects away on success
  } catch (e) {
    errorMsg.value = e?.message || 'Could not start Slack sign-in.'
    slacking.value = false
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

            <button class="auth-github" :disabled="githubbing" @click="github">
              <svg class="gh-logo" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              {{ githubbing ? 'Redirecting…' : 'Continue with GitHub' }}
            </button>

            <button class="auth-discord" :disabled="discording" @click="discord">
              <svg class="dc-logo" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <path fill="currentColor" d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.001.02.017.033a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041q.363.7.818 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .017-.033c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/>
              </svg>
              {{ discording ? 'Redirecting…' : 'Continue with Discord' }}
            </button>

            <button class="auth-slack" :disabled="slacking" @click="slack">
              <svg class="sl-logo" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <path fill="#E01E5A" d="M3.362 10.11a1.68 1.68 0 0 1-1.681 1.68A1.68 1.68 0 0 1 0 10.11a1.68 1.68 0 0 1 1.681-1.68h1.681zm.846 0a1.68 1.68 0 0 1 1.681-1.68 1.68 1.68 0 0 1 1.681 1.68v4.21A1.68 1.68 0 0 1 5.889 16a1.68 1.68 0 0 1-1.681-1.68z"/>
                <path fill="#36C5F0" d="M5.889 3.362a1.68 1.68 0 0 1-1.681-1.681A1.68 1.68 0 0 1 5.889 0a1.68 1.68 0 0 1 1.681 1.681v1.681zm0 .846a1.68 1.68 0 0 1 1.681 1.681 1.68 1.68 0 0 1-1.681 1.681h-4.21A1.68 1.68 0 0 1 0 5.889a1.68 1.68 0 0 1 1.68-1.681z"/>
                <path fill="#2EB67D" d="M12.638 5.889a1.68 1.68 0 0 1 1.681-1.681A1.68 1.68 0 0 1 16 5.889a1.68 1.68 0 0 1-1.681 1.681h-1.681zm-.846 0a1.68 1.68 0 0 1-1.681 1.681 1.68 1.68 0 0 1-1.681-1.681v-4.21A1.68 1.68 0 0 1 10.111 0a1.68 1.68 0 0 1 1.681 1.681z"/>
                <path fill="#ECB22E" d="M10.111 12.638a1.68 1.68 0 0 1 1.681 1.681A1.68 1.68 0 0 1 10.111 16a1.68 1.68 0 0 1-1.681-1.681v-1.681zm0-.846a1.68 1.68 0 0 1-1.681-1.681 1.68 1.68 0 0 1 1.681-1.681h4.21A1.68 1.68 0 0 1 16 10.111a1.68 1.68 0 0 1-1.681 1.681z"/>
              </svg>
              {{ slacking ? 'Redirecting…' : 'Continue with Slack' }}
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

.auth-github {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  margin-top: 8px;
  background: #1e1e28;
  border: 1px solid #3a3a4a;
  border-radius: 6px;
  color: #e8e8ec;
  font-size: 13px;
  font-weight: 600;
  padding: 10px 14px;
  cursor: pointer;
  transition: border-color 0.15s, opacity 0.15s;
}
.auth-github:hover { border-color: var(--accent-warm); }
.auth-github:disabled { opacity: 0.6; cursor: default; }
.gh-logo { flex-shrink: 0; }

.auth-discord {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  margin-top: 8px;
  background: #5865f2;
  border: none;
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  padding: 10px 14px;
  cursor: pointer;
  transition: opacity 0.15s;
}
.auth-discord:hover { opacity: 0.92; }
.auth-discord:disabled { opacity: 0.6; cursor: default; }
.dc-logo { flex-shrink: 0; }

.auth-slack {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  margin-top: 8px;
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
.auth-slack:hover { opacity: 0.92; }
.auth-slack:disabled { opacity: 0.6; cursor: default; }
.sl-logo { flex-shrink: 0; }

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
