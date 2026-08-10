import svgpath from 'svgpath'

// Turn an uploaded/pasted SVG into a single-fill symbol: { paths, viewBox }.
// We only accept SIMPLE, ONE-COLOR SVGs — geometry only, a single solid colour
// (colour is dropped; the symbol is recoloured on the crest). Anything else is
// rejected with a friendly reason. Returns { paths, viewBox } or { error }.

const GEOMETRY = ['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline']
const BANNED = ['script', 'foreignobject', 'image', 'text', 'tspan', 'use', 'style',
  'video', 'audio', 'iframe', 'animate', 'animatetransform', 'animatemotion', 'set', 'filter', 'mask']
const MAX_BYTES = 256 * 1024
const MAX_PATHS = 400

export function svgToSymbol(svgText) {
  if (!svgText || !svgText.trim()) return { error: 'Paste or choose an SVG file first.' }
  if (svgText.length > MAX_BYTES) return { error: 'That SVG is too large — try a simpler icon.' }

  let doc
  try {
    doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  } catch {
    return { error: 'Could not read that SVG.' }
  }
  if (doc.querySelector('parsererror')) return { error: 'That doesn’t look like valid SVG.' }

  const svg = doc.querySelector('svg')
  if (!svg) return { error: 'No <svg> element found.' }

  // Reject anything that isn't plain geometry.
  for (const tag of BANNED) {
    if (svg.querySelector(tag)) {
      return { error: `Only simple one-colour SVGs are supported (found <${tag}>).` }
    }
  }

  // One-colour check: gather distinct solid colours across fills + strokes.
  const colours = new Set()
  let gradient = false
  for (const el of svg.querySelectorAll('*')) {
    for (const attr of ['fill', 'stroke']) {
      const v = (el.getAttribute(attr) || '').trim().toLowerCase()
      if (!v) continue
      if (v.startsWith('url(')) { gradient = true; continue }
      if (v === 'none' || v === 'transparent' || v === 'currentcolor') continue
      colours.add(v)
    }
    const style = (el.getAttribute('style') || '').toLowerCase()
    if (style.includes('url(')) gradient = true
  }
  if (gradient) return { error: 'Gradients/patterns aren’t supported — use a flat one-colour icon.' }
  if (colours.size > 1) return { error: 'That SVG uses multiple colours — use a simple one-colour icon.' }

  // Establish the coordinate box: viewBox (preferred) or width/height.
  const vb = parseViewBox(svg)
  const [minX, minY, w, h] = vb
  if (!(w > 0 && h > 0)) return { error: 'Couldn’t determine the SVG size (missing viewBox/width/height).' }

  // Collect + flatten geometry into path `d` strings in a 0,0-origin box.
  const paths = []
  for (const el of svg.querySelectorAll(GEOMETRY.join(','))) {
    let d = toPathD(el)
    if (!d) continue
    const tf = transformChain(el)            // outermost → innermost, per SVG order
    let sp = svgpath(d)
    if (tf) sp = sp.transform(tf)
    if (minX || minY) sp = sp.translate(-minX, -minY)   // normalize origin to 0,0
    d = sp.round(3).toString()
    if (d) paths.push(d)
    if (paths.length > MAX_PATHS) return { error: 'That SVG is too detailed — try a simpler icon.' }
  }

  if (!paths.length) return { error: 'No shapes found to import.' }
  return { paths, viewBox: [round(w), round(h)] }
}

function parseViewBox(svg) {
  const raw = svg.getAttribute('viewBox')
  if (raw) {
    const p = raw.split(/[\s,]+/).map(Number)
    if (p.length === 4 && p.every(n => Number.isFinite(n))) return p
  }
  const w = parseFloat(svg.getAttribute('width'))
  const h = parseFloat(svg.getAttribute('height'))
  if (Number.isFinite(w) && Number.isFinite(h)) return [0, 0, w, h]
  return [0, 0, 0, 0]
}

// Element → transform string from root down to the element (SVG list order, so
// the element's own transform applies first / innermost). '' if none.
function transformChain(el) {
  const chain = []
  let n = el
  while (n && n.nodeName.toLowerCase() !== 'svg') {
    const t = n.getAttribute && n.getAttribute('transform')
    if (t) chain.unshift(t)
    n = n.parentNode
  }
  return chain.join(' ')
}

function toPathD(el) {
  const tag = el.nodeName.toLowerCase()
  const num = (a, d = 0) => { const v = parseFloat(el.getAttribute(a)); return Number.isFinite(v) ? v : d }
  if (tag === 'path') return el.getAttribute('d') || ''
  if (tag === 'rect') {
    const x = num('x'), y = num('y'), w = num('width'), h = num('height')
    if (!(w > 0 && h > 0)) return ''
    return `M${x},${y} H${x + w} V${y + h} H${x} Z`
  }
  if (tag === 'circle') {
    const cx = num('cx'), cy = num('cy'), r = num('r')
    if (!(r > 0)) return ''
    return `M ${cx - r},${cy} A ${r},${r} 0 1 0 ${cx + r},${cy} A ${r},${r} 0 1 0 ${cx - r},${cy} Z`
  }
  if (tag === 'ellipse') {
    const cx = num('cx'), cy = num('cy'), rx = num('rx'), ry = num('ry')
    if (!(rx > 0 && ry > 0)) return ''
    return `M ${cx - rx},${cy} A ${rx},${ry} 0 1 0 ${cx + rx},${cy} A ${rx},${ry} 0 1 0 ${cx - rx},${cy} Z`
  }
  if (tag === 'polygon' || tag === 'polyline') {
    const pts = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number)
    if (pts.length < 4) return ''
    let d = `M ${pts[0]},${pts[1]}`
    for (let i = 2; i + 1 < pts.length; i += 2) d += ` L ${pts[i]},${pts[i + 1]}`
    return tag === 'polygon' ? d + ' Z' : d
  }
  return ''
}

function round(n) { return Math.round(n * 100) / 100 }
