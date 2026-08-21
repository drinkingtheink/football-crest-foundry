// Thin, safe wrapper over the GA4 gtag tag loaded in index.html. No-ops when
// gtag is missing — ad-blockers, no-consent, SSR — so callers never have to
// guard. Event names are GA4 custom events (snake_case); params show up as
// custom dimensions/metrics.
export function track(event, params = {}) {
  if (typeof window === 'undefined') return
  const g = window.gtag
  if (typeof g !== 'function') return
  try { g('event', event, params) } catch { /* analytics must never break the app */ }
}
