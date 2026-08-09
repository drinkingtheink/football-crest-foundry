#!/usr/bin/env node
// One-off authoring tool: normalize incoming badge-shape SVG paths (any viewBox)
// into the app's 200x240 badge space, fitting each to the existing shields' box
// (aspect-preserved, centered). Prints ready-to-paste { path } strings and writes
// a preview SVG (/tmp/shapes-preview.svg) so shapes can be eyeballed + named.

import svgpath from 'svgpath'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SHAPES_JS = join(ROOT, 'src/data/shapes.js')

// Target box inside the 200x240 viewBox — matches existing shields (~x15..185, y15..227).
const TX = 15, TY = 15, TW = 170, TH = 212

// Incoming unique shapes (the 182.31x229 one was sent twice — deduped).
const SRC = [
  { id: 'sh2-fluted',      label: 'Fluted Crest', w: 174.35, h: 210.47, d: 'M7.83,2.69c11.24,11.68,24.2,19.04,40.36,18.46,16.13-.59,28.8-8.3,39.05-21.15,10.34,12.57,22.97,20.72,39.28,21.19,16.14.47,29.15-6.76,40.31-18.69,4.85,15.44,7.01,30.7,7.44,46.16,1.88,67.83-25.87,120.66-81.11,159.53-4.12,2.9-7.14,3.11-11.46.14C37.31,177.75,9.87,136.37,1.96,82.8-1.75,57.68-.12,32.64,6.2,7.99c.41-1.58.96-3.13,1.63-5.3Z' },
  { id: 'sh2-banner-kite', label: 'Banner Kite',  w: 203.09, h: 209.17, d: 'M0,19.33c21.94-4.58,42.58-9.04,63.3-13.15,11.73-2.33,23.52-4.68,35.39-5.91,13.96-1.44,27.34,3.11,40.85,5.85,19.9,4.02,39.77,8.2,59.65,12.33.79.17,1.56.49,3.89,1.24-5.38,4.97-10.14,9.33-14.85,13.73-7.1,6.63-10.31,14.69-10.21,24.52.23,23.66-.03,47.32.06,70.99.01,3.4-.92,5.88-3.38,8.32-23.4,23.23-46.73,46.54-69.94,69.96-2.71,2.73-4.25,2.53-6.81-.06-23.12-23.28-46.32-46.47-69.6-69.6-2.53-2.51-3.69-5.03-3.67-8.7.18-23.66-.01-47.33.16-70.99.07-9.57-3.03-17.56-9.98-24.13-4.71-4.45-9.31-9.01-14.86-14.4Z' },
  { id: 'sh2-regal',       label: 'Regal Crest',  w: 182.31, h: 229,    d: 'M.31,88.46c26.27-7.97,41.17-28.65,39.95-57.08,20.01-4.99,37.44-14.72,50.84-31.38,2.66,2.79,4.97,5.38,7.45,7.79,11.1,10.78,24.13,18.26,39.11,22.13,3.41.88,4.84,1.95,4.79,5.89-.26,24.09,13.04,43.03,35.82,51.01,3.73,1.3,4.42,3,3.84,6.52-6.42,38.99-22.65,73.21-49.41,102.36-11.32,12.33-24.24,22.76-38.1,32.1-2.47,1.66-4.24,1.59-6.68-.05C42.5,197.31,13.39,155.79,2.17,102.05c-.85-4.07-1.46-8.19-2.16-12.29-.05-.3.14-.63.3-1.3Z' },
  { id: 'sh2-double-arch', label: 'Double Arch',  w: 197.97, h: 212.32, d: 'M27.92,20.57c28.05,7.12,51.57.28,71.22-20.57,19.65,21.01,43.4,27.63,71.2,20.64,4.85,9.7,9.6,19.2,14.35,28.7,2.68,5.36,4.81,11.08,8.12,16.01,6.09,9.07,5.82,18.65,4.1,28.71-9.63,56.32-41.41,95.02-93.5,117.47-2.41,1.04-6.04,1.05-8.45.02C42.5,188.95,10.48,150.05,1.38,93.14c-.71-4.43-1.02-8.93-1.34-13.41-.1-1.44-.02-3.09.6-4.34,8.98-18.19,18.06-36.32,27.29-54.82Z' },
  { id: 'sh2-baroque',     label: 'Baroque',      w: 194.55, h: 225.39, d: 'M194.47,111.5c0,7.66.23,15.34-.14,22.98-.11,2.37-1.27,5.2-2.91,6.9-12.3,12.79-15.7,27.65-11.53,44.71.67,2.75.27,6.23-.88,8.83-1.72,3.89-4.18,7.6-6.95,10.85-5.91,6.94-13.8,9.84-22.47,7.14-19.01-5.92-35.46-1.95-49.92,11.28-2.59,2.37-4.04.72-5.87-.79-10.03-8.29-21.01-14.21-34.55-13.14-3.79.3-7.59,1.05-11.27,2.03-14.07,3.74-22.63-.46-30.65-13.12-3.13-4.95-4.11-9.74-2.53-15.92,4.01-15.66-.35-29.51-11.35-41.43-1.8-1.95-3.15-5.1-3.21-7.73-.32-14.99-.31-29.99-.08-44.98.04-2.56,1.15-5.53,2.73-7.56,9.33-11.96,12.71-25.15,8.56-39.84-1.02-3.61-.36-5.82,2.25-8.24,5.23-4.88,10.05-10.22,15.39-14.98,1.77-1.58,4.58-2.07,6.99-2.82,1.06-.33,2.32-.15,3.48-.05,8.01.73,14.65-.64,21.08-6.86C68.73.97,79.65-.93,90.96.38c3.93.45,7.99.6,11.9.13,13.62-1.64,25.19,2.29,35.27,11.55,2.07,1.9,5.56,3.71,8.1,3.36,11.85-1.6,20.21,2.8,28.14,11.62,5.96,6.64,9.89,11.58,7.45,21.53-2.93,11.94,1.88,23.19,9.58,32.96,1.59,2.02,2.72,4.92,2.84,7.48.37,7.48.13,14.99.13,22.49.03,0,.07,0,.1,0Z' },
]

function bounds(d) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  const add = (x, y) => { if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y }
  svgpath(d).abs().unarc().unshort().iterate((seg, i, cx, cy) => {
    const c = seg[0], n = seg.slice(1)
    if (c === 'H') add(n[0], cy)
    else if (c === 'V') add(cx, n[0])
    else if (c === 'Z') { /* no coords */ }
    else for (let k = 0; k < n.length; k += 2) add(n[k], n[k + 1])
  })
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY }
}

const out = []
const cells = []
SRC.forEach((s, idx) => {
  const b = bounds(s.d)
  const scale = Math.min(TW / b.w, TH / b.h)
  const tx = TX + (TW - b.w * scale) / 2 - b.minX * scale
  const ty = TY + (TH - b.h * scale) / 2 - b.minY * scale
  const path = svgpath(s.d).matrix([scale, 0, 0, scale, tx, ty]).round(2).toString()
  out.push({ id: s.id, label: s.label, path })
  const COLS = 3
  const ox = (idx % COLS) * 210, oy = Math.floor(idx / COLS) * 272
  cells.push(`<g transform="translate(${ox},${oy})"><rect x="0" y="0" width="200" height="240" fill="#191922" stroke="#2a2a35"/><path d="${path}" fill="#e8c84a"/><text x="100" y="256" fill="#888" font-size="12" font-family="sans-serif" text-anchor="middle">${s.label}</text></g>`)
})

writeFileSync('/tmp/shapes-preview.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" width="${210 * 3}" height="${272 * 2}" viewBox="0 0 ${210 * 3} ${272 * 2}"><rect width="100%" height="100%" fill="#0f0f13"/>${cells.join('')}</svg>`)

// Inject into shapes.js before the geometric `circular` entry (idempotent).
const src = readFileSync(SHAPES_JS, 'utf8')
const existing = new Set([...src.matchAll(/id:\s*'([^']+)'/g)].map(m => m[1]))
const fresh = out.filter(o => !existing.has(o.id))
if (fresh.length === 0) {
  console.log('All shapes already present. Preview → /tmp/shapes-preview.svg')
} else {
  const block = fresh.map(o => `  {\n    id: '${o.id}',\n    label: '${o.label}',\n    path: '${o.path}',\n  },`).join('\n')
  const marker = /\n  \{\n    id: 'circular',/
  if (!marker.test(src)) throw new Error("Could not find the 'circular' insertion marker in shapes.js")
  const out2 = src.replace(marker, `\n\n  // Shield / heraldic — batch 3 (user-supplied ornate crests)\n${block}\n\n  {\n    id: 'circular',`)
  writeFileSync(SHAPES_JS, out2)
  console.log(`Injected ${fresh.length} shapes: ${fresh.map(o => o.id).join(', ')}`)
  console.log('Preview → /tmp/shapes-preview.svg')
}
