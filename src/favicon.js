// Animated favicon — a canvas rendition of the Crest Foundry mark (LogoMark.vue).
// Browsers won't animate an SVG/GIF favicon, so we redraw the mark onto an
// offscreen canvas and swap the <link rel="icon"> href each frame: a gold crest
// forged on an anvil, hammer striking on a 3-beat loop that flares sparks and a
// molten glow, then resting aglow before repeating (mirrors the CSS timeline).

const VB_W = 543.67
const VB_H = 627.4
const LOOP = 8000 // ms — matches --loop in LogoMark.vue

// Silhouette paths lifted verbatim from LogoMark.vue.
const PATHS = {
  anvil:  'M369.72,396.61h-53.8c2.35,5.03,4.28,9.69,6.64,14.13,10.74,20.27,26.21,36.43,44.27,50.28.94.72,2.41,1.02,3.63,1.04,6.76.1,13.53.05,20.47.05v15.48h-239.06v-15.47c5.37,0,10.72-.22,16.04.07,3.67.2,6.29-1.01,8.97-3.49,15-13.92,28.52-29.02,38.35-47.12,2.55-4.68,4.72-9.57,7.28-14.8h-49.42c-.05-1.21-.14-2.2-.14-3.2-.01-7.25-.12-14.51.05-21.76.05-2.33-.67-3.18-2.9-3.79-28.3-7.79-50.4-23.98-65.67-49.17-2.36-3.9-4.24-8.09-6.58-12.6h74.99v-16.9h196.8v24.8c19.06,4.59,35.38,13.9,50.23,27.18-6.44,4.9-12.5,9.8-18.87,14.28-8.95,6.31-18.49,11.63-28.8,15.43-1.86.69-2.59,1.59-2.54,3.65.15,6.21.05,12.43.05,18.65,0,1.01,0,2.02,0,3.26Z',
  hammer: 'M181.04,212.46c-5.87-14.57-11.65-28.89-17.51-43.42,5.23-2.97,10.3-5.85,15.37-8.72,2.35-1.33,4.78-2.53,7.05-3.98,1.52-.97,2.54-.95,4,.25,15.12,12.5,30.32,24.92,45.47,37.39.8.66,1.55,1.56,1.94,2.5,7.12,17.49,14.19,35.01,21.26,52.52.1.24.13.52.27,1.1-12.45,7.01-24.97,14.06-37.76,21.26-9.37-12.55-18.66-24.97-28-37.47-45.67,25.73-91.11,51.33-136.81,77.08-4.03-7.15-7.99-14.16-12.09-21.43,45.63-25.7,91.06-51.29,136.83-77.08Z',
  sparks: 'M449.24,142.01c-16.54,23.8-33.09,47.6-50.1,72.07,25.09.71,49.37,1.4,73.65,2.08.05.26.11.51.16.77-44.47,17.84-88.93,35.69-133.94,53.75v-31.57c-22.53,10.55-44.44,20.81-67.19,31.47,10.77-31.76,21.29-62.77,31.81-93.78.25-.02.5-.03.76-.05,2.75,10.85,5.5,21.69,8.53,33.65,27.2-43.26,53.89-85.71,80.59-128.16l.64.29c-7.43,33.06-14.86,66.11-22.5,100.07,26.17-13.98,51.66-27.58,77.14-41.19.15.2.3.41.45.61Z',
  border: 'M271.21,627.4c-13.19,0-24.25-5.95-33.31-12.21-57.96-40.03-105.46-90.92-145.19-155.6C37.66,370.01,8.78,268.28,1.86,139.56c-4.47-17.28-4.2-48.09,39.57-74.15,20.83-12.4,40.89-27.86,60.3-42.81,6.03-4.64,12.26-9.45,18.46-14.12,14.85-11.18,28.91-11.3,44.25-.37,30.51,21.74,69.23,33.76,109.04,33.86.16,0,.33,0,.49,0,39.56,0,77.62-11.79,107.22-33.21,15.25-11.04,29.38-10.87,44.46.55,13.79,10.44,27.95,20.94,41.64,31.1,19.94,14.79,40.55,30.08,60.58,45.58,9.49,7.35,16.12,20.98,15.77,32.42-4.18,134.53-34.37,245.94-92.29,340.59-38.25,62.51-88.33,115.47-148.84,157.41-11.54,7.99-21.96,10.99-31.31,10.99ZM142.47,33.22c-.49.27-1.27.76-2.41,1.61-6.06,4.56-12.22,9.31-18.18,13.9-20.17,15.54-41.04,31.62-63.56,45.02-30.3,18.03-25.75,33.4-24.25,38.45l.56,1.88.1,1.95c6.45,123.84,33.8,221.16,86.1,306.27,37.29,60.69,81.72,108.35,135.83,145.72,11.76,8.12,16.82,8.35,27.08,1.25,56.72-39.31,103.65-88.94,139.49-147.51,54.82-89.59,83.43-195.64,87.45-324.2-.2-1.48-1.86-4.56-2.99-5.5-19.76-15.29-40.23-30.48-60.03-45.16-13.76-10.2-27.98-20.75-41.9-31.29-1.25-.95-2.1-1.48-2.62-1.77-.52.27-1.36.75-2.57,1.63-36.46,26.39-81.41,39.58-126.58,39.58-45.48,0-91.18-13.37-128.68-40.08-1.36-.97-2.28-1.49-2.83-1.76Z',
}

// Piecewise-linear keyframe sampler — fr in [0,1), stops as [frac, value].
function sample(stops, fr) {
  if (fr <= stops[0][0]) return stops[0][1]
  for (let i = 1; i < stops.length; i++) {
    if (fr <= stops[i][0]) {
      const [f0, v0] = stops[i - 1]
      const [f1, v1] = stops[i]
      const t = (fr - f0) / (f1 - f0 || 1)
      return v0 + (v1 - v0) * t
    }
  }
  return stops[stops.length - 1][1]
}

// Hammer swing angle (deg), echoing the @keyframes swing breakpoints.
const HAMMER_DEG = [
  [0, 0], [0.05, -22], [0.078, 5], [0.09, 5], [0.125, 0],
  [0.175, -22], [0.203, 5], [0.215, 5], [0.25, 0],
  [0.30, -22], [0.328, 5], [0.34, 5], [0.375, 0], [1, 0],
]
// Spark burst opacity and scale, echoing @keyframes spark-flare (3rd stays lit).
const SPARK_OP = [
  [0, 0], [0.084, 0], [0.086, 1], [0.115, 1], [0.146, 0],
  [0.209, 0], [0.211, 1], [0.24, 1], [0.271, 0],
  [0.334, 0], [0.336, 1], [0.375, 1], [0.86, 1], [0.93, 0], [1, 0],
]
const SPARK_SC = [
  [0, 0.5], [0.084, 0.5], [0.086, 1.45], [0.115, 1], [0.146, 0.5],
  [0.209, 0.5], [0.211, 1.45], [0.24, 1], [0.271, 0.5],
  [0.334, 0.5], [0.336, 1.45], [0.375, 1], [0.86, 1], [0.93, 0.5], [1, 0.5],
]

const p = {}
for (const k in PATHS) p[k] = new Path2D(PATHS[k])

const SIZE = 64
const FPS = 15

function drawFrame(ctx, fr) {
  ctx.clearRect(0, 0, SIZE, SIZE)

  const hammerDeg = sample(HAMMER_DEG, fr)
  const sparkOp = sample(SPARK_OP, fr)
  const sparkSc = sample(SPARK_SC, fr)
  // Gentle base glow breathing + a punch on each impact.
  const breathe = 0.5 - 0.5 * Math.cos((fr * LOOP / 3400) * Math.PI * 2)
  const glow = 2 + breathe * 3 + sparkOp * 6

  const s = SIZE / VB_H
  const offX = (SIZE - VB_W * s) / 2

  ctx.save()
  ctx.translate(offX, 0)
  ctx.scale(s, s)

  const grad = ctx.createLinearGradient(0, 0, 0, VB_H)
  grad.addColorStop(0, '#ffe89a')
  grad.addColorStop(0.52, '#e8c84a')
  grad.addColorStop(1, '#c2911f')
  ctx.fillStyle = grad

  ctx.shadowColor = `rgba(255, 150, 50, ${0.55 + sparkOp * 0.35})`
  ctx.shadowBlur = glow

  ctx.fill(p.border)
  ctx.fill(p.anvil)

  ctx.save()
  ctx.translate(50, 300)
  ctx.rotate((hammerDeg * Math.PI) / 180)
  ctx.translate(-50, -300)
  ctx.fill(p.hammer)
  ctx.restore()

  ctx.save()
  ctx.globalAlpha = sparkOp
  ctx.translate(268, 272)
  ctx.scale(sparkSc, sparkSc)
  ctx.translate(-268, -272)
  ctx.fill(p.sparks)
  ctx.restore()

  ctx.restore()
}

function getIconLink() {
  let link = document.querySelector('link[rel~="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.type = 'image/png'
  return link
}

export function startAnimatedFavicon() {
  if (typeof document === 'undefined') return
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const link = getIconLink()

  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')

  const render = fr => {
    drawFrame(ctx, fr)
    link.href = canvas.toDataURL('image/png')
  }

  // Resting frame: crest lit, hammer down — shown whenever the tab is active.
  const REST = 0.5

  // Reduced motion: paint the resting frame once and never animate.
  if (reduce?.matches) { render(REST); return }

  // The forge only animates while the tab is in the BACKGROUND (user is elsewhere).
  // Backgrounded tabs pause requestAnimationFrame, so drive it with setInterval,
  // timed off the wall clock — browsers clamp hidden-tab timers to ~1s, giving a
  // slow, deliberate forge. Foreground shows a single static resting frame.
  let timer = 0
  const stop = () => { if (timer) { clearInterval(timer); timer = 0 } }
  const animate = () => {
    if (timer) return
    render((performance.now() % LOOP) / LOOP)
    timer = setInterval(() => render((performance.now() % LOOP) / LOOP), 1000 / FPS)
  }

  const sync = () => {
    if (document.hidden) animate()
    else { stop(); render(REST) }
  }
  document.addEventListener('visibilitychange', sync)
  sync()
}
