import { ref, computed } from 'vue'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

// Module-level singletons — every component shares one reactive session.
const user = ref(null)
const ready = ref(false)   // false until the initial getSession resolves
let initialized = false

function init() {
  if (initialized || !isSupabaseConfigured) { ready.value = true; return }
  initialized = true
  supabase.auth.getSession().then(({ data }) => {
    user.value = data.session?.user ?? null
    ready.value = true
  })
  supabase.auth.onAuthStateChange((_event, session) => {
    user.value = session?.user ?? null
  })
}

export function useAuth() {
  init()

  const isSignedIn = computed(() => Boolean(user.value))
  const email = computed(() => user.value?.email ?? null)

  async function signInWithEmail(addr) {
    if (!isSupabaseConfigured) throw new Error('Cloud sync is not configured.')
    const { error } = await supabase.auth.signInWithOtp({
      email: addr,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) throw error
  }

  async function signInWithGoogle() {
    if (!isSupabaseConfigured) throw new Error('Cloud sync is not configured.')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
    // On success the browser redirects to Google; nothing more runs here.
  }

  async function signOut() {
    if (!isSupabaseConfigured) return
    await supabase.auth.signOut()
    user.value = null
  }

  return {
    user, email, isSignedIn, ready, isSupabaseConfigured,
    signInWithEmail, signInWithGoogle, signOut,
  }
}
