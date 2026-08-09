<script setup>
import LogoMark from './LogoMark.vue'

defineProps({ open: Boolean })
defineEmits(['close'])

const iconAuthors = ['carl-olsen', 'caro-asercion', 'delapouite', 'lorc', 'lucasms', 'sbed', 'skoll', 'sparker', 'various-artists']
</script>

<template>
  <Teleport to="body">
    <Transition name="about-fade">
      <div v-if="open" class="about-backdrop" @click.self="$emit('close')">
        <div class="about-modal" role="dialog" aria-label="About Crest Foundry">
          <button class="about-close" title="Close" @click="$emit('close')">×</button>

          <div class="logo-block">
            <LogoMark class="logo-mark-inline" />
            <div class="logo-text">
              <p class="logo"><span class="logo-title">Crest Foundry<i class="logo-ember e1" /><i class="logo-ember e2" /><i class="logo-ember e3" /><i class="logo-ember e4" /><i class="logo-ember e5" /></span></p>
              <p class="logo-byline">Forge Your Club's Legacy</p>
            </div>
          </div>
          <p class="about-tagline">Design and export a crest for any club — football, scholastic, recreational, intramural, social, role-playing, and more.</p>
          <p class="about-byline">A project by <a href="https://www.drinkingtheink.com/" target="_blank" rel="noopener">Jason M Harrison</a></p>

          <div class="about-section">
            <h3 class="about-heading">Credits</h3>
            <p class="about-text">
              Many heraldic symbols come from
              <a href="https://game-icons.net" target="_blank" rel="noopener">game-icons.net</a>,
              licensed under
              <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC&nbsp;BY&nbsp;3.0</a>.
              Created by {{ iconAuthors.join(', ') }}.
            </p>
            <p class="about-text" style="margin-top: 8px;">
              Background photography from
              <a href="https://unsplash.com" target="_blank" rel="noopener">Unsplash</a>.
            </p>
          </div>

          <p class="about-legal">
            <a href="/terms.html" target="_blank" rel="noopener">Terms of Use</a>
            <span aria-hidden="true">·</span>
            <a href="/privacy.html" target="_blank" rel="noopener">Privacy Policy</a>
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.about-backdrop {
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

.about-modal {
  position: relative;
  width: min(420px, calc(100vw - 40px));
  background: #13131a;
  border: 1px solid #2a2a35;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
}

.about-close {
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
.about-close:hover { border-color: #e05555; color: #e05555; }

/* Header mirrors the config panel's logo block */
.logo-block {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 0 0 14px;
}
.logo-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.logo {
  font-family: 'Yeseva One', Georgia, serif;
  font-size: 23px;
  font-weight: 400;
  letter-spacing: 0.3px;
  line-height: 1.05;
  color: #e8c84a;
  margin: 0;
}
.logo-byline {
  margin: 0;
  font-size: 10px;
  font-style: italic;
  color: #888;
  letter-spacing: 0.02em;
}

/* Embers drifting up off the "Crest Foundry" logotype */
.logo-title {
  position: relative;
  display: inline-block;
}
.logo-ember {
  position: absolute;
  bottom: 3px;
  width: 2.5px;
  height: 2.5px;
  border-radius: 50%;
  background: #ffd98a;
  box-shadow: 0 0 5px 1px rgba(255, 140, 40, 0.85);
  opacity: 0;
  pointer-events: none;
  animation: logo-ember-rise 3.4s ease-out infinite;
}
.logo-ember.e1 { left: 12%; --dx: -3px; animation-duration: 3.6s; animation-delay: -0.3s; }
.logo-ember.e2 { left: 33%; --dx: 4px;  animation-duration: 4.4s; animation-delay: -1.7s; }
.logo-ember.e3 { left: 52%; --dx: -2px; animation-duration: 3.9s; animation-delay: -2.9s; }
.logo-ember.e4 { left: 71%; --dx: 5px;  animation-duration: 4.7s; animation-delay: -1.0s; }
.logo-ember.e5 { left: 89%; --dx: -4px; animation-duration: 4.1s; animation-delay: -3.3s; }
@keyframes logo-ember-rise {
  0%   { transform: translate(0, 0) scale(1);            opacity: 0; }
  8%   { opacity: 0.95; }
  55%  { opacity: 0.5; }
  100% { transform: translate(var(--dx), -22px) scale(0.35); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .logo-ember { display: none; }
}

.about-tagline {
  margin: 0 0 3px;
  font-size: 13px;
  color: #888;
}

.about-byline {
  margin: 0 0 20px;
  font-size: 12px;
  color: #888;
}
.about-byline a {
  color: var(--accent-teal);
  text-decoration: none;
  border-bottom: 1px solid rgba(47, 212, 198, 0.4);
}
.about-byline a:hover { border-bottom-color: var(--accent-teal); }

.about-heading {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #e8d06a;
}

.about-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: #b9b6b6;
}

.about-text a {
  color: #e8c84a;
  text-decoration: none;
  border-bottom: 1px solid rgba(232, 200, 74, 0.35);
}
.about-text a:hover { border-bottom-color: #e8c84a; }

.about-legal {
  margin: 18px 0 0;
  padding-top: 14px;
  border-top: 1px solid #2a2a35;
  font-size: 12px;
  color: #666;
  display: flex;
  gap: 8px;
  justify-content: center;
}
.about-legal a {
  color: #9a9aa8;
  text-decoration: none;
  border-bottom: 1px solid rgba(154, 154, 168, 0.3);
}
.about-legal a:hover { color: #e8c84a; border-bottom-color: #e8c84a; }

.about-fade-enter-active,
.about-fade-leave-active { transition: opacity 0.2s ease; }
.about-fade-enter-from,
.about-fade-leave-to { opacity: 0; }
</style>
