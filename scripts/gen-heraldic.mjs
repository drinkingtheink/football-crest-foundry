#!/usr/bin/env node
// Authoring tool: hand-authored heraldic crosses + alchemical glyphs (single-fill,
// viewBox 100x100). Renders /tmp/heraldic-preview.svg for eyeballing; with --inject
// it appends the approved entries into src/data/icons.js before iconsById.

import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ICONS_JS = join(ROOT, 'src/data/icons.js')

// ── Crosses (group 'Crosses') ──
const maltese = [
  'M44,50 L30,10 L50,26 L70,10 L56,50 Z',
  'M44,50 L30,90 L50,74 L70,90 L56,50 Z',
  'M50,44 L10,30 L26,50 L10,70 L50,56 Z',
  'M50,44 L90,30 L74,50 L90,70 L50,56 Z',
]
const pattee = [
  'M42,50 L28,12 L72,12 L58,50 Z',
  'M42,50 L28,88 L72,88 L58,50 Z',
  'M50,42 L12,28 L12,72 L50,58 Z',
  'M50,42 L88,28 L88,72 L50,58 Z',
]
// Greek-cross base used by bottony/crosslet/potent/fleury/moline
const plus = ['M42,18 L58,18 L58,42 L82,42 L82,58 L58,58 L58,82 L42,82 L42,58 L18,58 L18,42 L42,42 Z']
const disc = (cx, cy, r) => `M${cx - r},${cy} A${r},${r} 0 1 0 ${cx + r},${cy} A${r},${r} 0 1 0 ${cx - r},${cy} Z`
const bottony = [
  ...plus,
  disc(50, 14, 8), disc(41, 20, 6), disc(59, 20, 6),   // top trefoil
  disc(50, 86, 8), disc(41, 80, 6), disc(59, 80, 6),   // bottom
  disc(14, 50, 8), disc(20, 41, 6), disc(20, 59, 6),   // left
  disc(86, 50, 8), disc(80, 41, 6), disc(80, 59, 6),   // right
]
// crosslet: plain cross with a small crossbar near each tip
const bar = (x, y, w, h) => `M${x - w / 2},${y - h / 2} L${x + w / 2},${y - h / 2} L${x + w / 2},${y + h / 2} L${x - w / 2},${y + h / 2} Z`
const crosslet = [...plus, bar(50, 24, 34, 12), bar(50, 76, 34, 12), bar(24, 50, 12, 34), bar(76, 50, 12, 34)]
// potent: T-bar (crossbar right at each tip)
const potent = [...plus, bar(50, 15, 40, 12), bar(50, 85, 40, 12), bar(15, 50, 12, 40), bar(85, 50, 12, 40)]
const rot = (d, deg, cx = 50, cy = 50) => `__ROT__${deg}__${cx}__${cy}__${d}`
// moline: arm ends split into two outward prongs with a central notch (forked)
const moFork = 'M42,31 L29,11 L45,25 L50,19 L55,25 L71,11 L58,31 Z'
const moline = [...plus, moFork, rot(moFork, 90), rot(moFork, 180), rot(moFork, 270)]
// fleury: fleur-de-lis end — central pointed petal + two rounded side lobes
const flEnd = 'M44,32 Q34,32 34,21 Q34,12 45,15 L45,7 L50,1 L55,7 L55,15 Q66,12 66,21 Q66,32 56,32 Z'
const fleury = [...plus, flEnd, rot(flEnd, 90), rot(flEnd, 180), rot(flEnd, 270)]

// ── Alchemy (group 'Alchemy') ──
// Split each barred glyph into two filled pieces with a GAP (no holes / winding).
const fire = ['M50,14 L86,82 L14,82 Z']
const water = ['M14,18 L86,18 L50,86 Z']
const air = ['M50,14 L69,50 L31,50 Z', 'M27,58 L73,58 L86,82 L14,82 Z']
const earth = ['M14,18 L86,18 L69,50 L31,50 Z', 'M35,58 L65,58 L50,86 Z']
const sulfur = [ 'M50,8 L74,50 L26,50 Z', bar(50, 62, 14, 40), bar(50, 78, 34, 14) ]
const salt = [ 'M16.24,46 A34,34 0 0 1 83.76,46 Z', 'M16.24,54 A34,34 0 0 0 83.76,54 Z' ]

const SET = [
  { id: 'cr-maltese',  label: 'Maltese Cross',  group: 'Crosses', paths: maltese },
  { id: 'cr-pattee',   label: 'Cross Pattée',   group: 'Crosses', paths: pattee },
  { id: 'cr-bottony',  label: 'Cross Bottony',  group: 'Crosses', paths: bottony },
  { id: 'cr-crosslet', label: 'Cross Crosslet', group: 'Crosses', paths: crosslet },
  { id: 'cr-potent',   label: 'Cross Potent',   group: 'Crosses', paths: potent },
  { id: 'cr-moline',   label: 'Cross Moline',   group: 'Crosses', paths: moline },
  { id: 'cr-fleury',   label: 'Cross Fleury',   group: 'Crosses', paths: fleury },
  { id: 'al-fire',     label: 'Fire',           group: 'Alchemy', paths: fire },
  { id: 'al-water',    label: 'Water',          group: 'Alchemy', paths: water },
  { id: 'al-air',      label: 'Air',            group: 'Alchemy', paths: air },
  { id: 'al-earth',    label: 'Earth',          group: 'Alchemy', paths: earth },
  { id: 'al-sulfur',   label: 'Sulfur',         group: 'Alchemy', paths: sulfur },
  { id: 'al-salt',     label: 'Salt',           group: 'Alchemy', paths: salt },
]

// Resolve any __ROT__ markers into a transformed copy by baking a rotation via svgpath.
import svgpath from 'svgpath'
const resolve = d => {
  const m = d.match(/^__ROT__(-?\d+)__(\d+)__(\d+)__(.+)$/)
  if (!m) return d
  const [, deg, cx, cy, path] = m
  return svgpath(path).rotate(Number(deg), Number(cx), Number(cy)).round(2).toString()
}
SET.forEach(s => { s.paths = s.paths.map(resolve) })

// Preview
const COLS = 5, cell = 120, pad = 16, lh = 18
const rows = Math.ceil(SET.length / COLS)
let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${COLS * cell}" height="${rows * cell}"><rect width="100%" height="100%" fill="#13131a"/>`
SET.forEach((s, i) => {
  const cx = (i % COLS) * cell, cy = Math.floor(i / COLS) * cell
  const scale = (cell - 2 * pad - lh) / 100
  out += `<g transform="translate(${cx + (cell - 100 * scale) / 2},${cy + pad}) scale(${scale})">` + s.paths.map(d => `<path d="${d}" fill="#e8c84a"/>`).join('') + `</g>`
  out += `<text x="${cx + cell / 2}" y="${cy + cell - 5}" fill="#cfcfd6" font-size="10" font-family="sans-serif" text-anchor="middle">${s.label}</text>`
})
out += '</svg>'
writeFileSync('/tmp/heraldic-preview.svg', out)
console.log('Preview → /tmp/heraldic-preview.svg')

if (process.argv.includes('--inject')) {
  const src = readFileSync(ICONS_JS, 'utf8')
  const existing = new Set([...src.matchAll(/id:\s*'([^']+)'/g)].map(m => m[1]))
  const fresh = SET.filter(s => !existing.has(s.id))
  if (!fresh.length) { console.log('All present.'); process.exit(0) }
  const line = s => `  { id: '${s.id}', label: '${s.label}', group: '${s.group}', paths: [${s.paths.map(d => `'${d}'`).join(', ')}] },`
  const block = `\n  // ── Named crosses + alchemical glyphs (hand-authored, viewBox 100×100) ──\n${fresh.map(line).join('\n')}\n`
  const marker = /\n\]\s*\n\s*export const iconsById/
  writeFileSync(ICONS_JS, src.replace(marker, `${block}]\n\nexport const iconsById`))
  console.log(`Injected ${fresh.length}: ${fresh.map(s => s.id).join(', ')}`)
}
