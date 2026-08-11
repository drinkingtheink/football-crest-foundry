// Import team palettes from jimniels/teamcolors that we don't already have, and
// tag every club with a `sport`. Existing clubs (all soccer) gain sport: 'Soccer';
// new teams are tagged from their league. teamcolors gives only hex arrays, so a
// nearest-named-colour lookup supplies human swatch labels. Authoring tool — not
// a runtime dep. Idempotent by normalised team name.
//
//   curl -sfL https://raw.githubusercontent.com/jimniels/teamcolors/master/src/teams.json -o /tmp/teamcolors.json
//   node scripts/import-teamcolors.mjs [--write]

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { clubs as existing } from '../src/data/clubs.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const CLUBS_FILE = path.join(ROOT, 'src/data/clubs.js')
const SRC = process.env.TC_JSON || '/tmp/teamcolors.json'
const WRITE = process.argv.includes('--write')

const SPORT = { epl: 'Soccer', mls: 'Soccer', mlb: 'Baseball', nba: 'Basketball', nfl: 'Football', nhl: 'Hockey' }

// Reference palette for nearest-colour naming (label ← closest by RGB distance).
const NAMED = [
  ['Black', '#000000'], ['White', '#FFFFFF'], ['Gray', '#808080'], ['Silver', '#C0C0C0'],
  ['Charcoal', '#36454F'], ['Red', '#E32636'], ['Crimson', '#B50E12'], ['Maroon', '#800000'],
  ['Orange', '#FF7A00'], ['Burnt Orange', '#CC5500'], ['Gold', '#D4AF37'], ['Yellow', '#FFD700'],
  ['Cream', '#EFDBB2'], ['Green', '#2E8B57'], ['Forest Green', '#0B6623'], ['Kelly Green', '#4CBB17'],
  ['Teal', '#008080'], ['Cyan', '#00B7C3'], ['Sky Blue', '#5DADE2'], ['Blue', '#1D4ED8'],
  ['Royal Blue', '#4169E1'], ['Navy', '#0A1F44'], ['Purple', '#6B3FA0'], ['Violet', '#7F00FF'],
  ['Pink', '#FF69B4'], ['Brown', '#8B4513'], ['Tan', '#D2B48C'],
]
const rgb = h => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
const NAMED_RGB = NAMED.map(([name, hex]) => [name, rgb(hex)])
function nameFor(hex) {
  const [r, g, b] = rgb(hex)
  let best = NAMED_RGB[0][0], bd = Infinity
  for (const [name, [nr, ng, nb]] of NAMED_RGB) {
    const d = (r - nr) ** 2 + (g - ng) ** 2 + (b - nb) ** 2
    if (d < bd) { bd = d; best = name }
  }
  return best
}

const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/^(afc|fc)/, '').replace(/(fc|afc|sc)$/, '')
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const data = JSON.parse(readFileSync(SRC, 'utf8'))
const have = new Set(existing.map(c => norm(c.name)))
const usedIds = new Set(existing.map(c => c.id))

// Existing clubs are all soccer — tag them, keep everything else intact.
const tagged = existing.map(c => ({ id: c.id, name: c.name, sport: c.sport || 'Soccer', colors: c.colors }))

// Some leagues (e.g. NBA) ship no `hex`, only `rgb` ("225 58 62"). Prefer hex,
// fall back to converting the rgb triples so no team lands without a palette.
const rgbStrToHex = s => s.trim().split(/\s+/).map(n => (+n).toString(16).padStart(2, '0')).join('')
function hexList(colors) {
  if (colors?.hex?.length) return colors.hex.map(h => h.replace(/^#/, ''))
  if (colors?.rgb?.length) return colors.rgb.map(rgbStrToHex)
  return []
}

// Uniqueness-preserving swatch labels within a team (Red, Red 2, …).
function toColors(hexes) {
  const seen = new Set(), counts = {}
  const out = []
  for (const raw of hexes) {
    const hex = '#' + raw.toUpperCase()
    if (seen.has(hex)) continue
    seen.add(hex)
    let name = nameFor(hex)
    counts[name] = (counts[name] || 0) + 1
    if (counts[name] > 1) name = `${name} ${counts[name]}`
    out.push({ name, hex })
  }
  return out
}

const additions = []
for (const t of data) {
  if (have.has(norm(t.name))) continue
  let id = slug(t.name)
  if (usedIds.has(id)) id = `${id}-${t.league}`
  usedIds.add(id)
  additions.push({ id, name: t.name, sport: SPORT[t.league] || 'Soccer', colors: toColors(hexList(t.colors)) })
}

// Group the new teams by sport, alphabetical within, appended after the soccer set.
const order = ['Baseball', 'Basketball', 'Football', 'Hockey', 'Soccer']
additions.sort((a, b) => (order.indexOf(a.sport) - order.indexOf(b.sport)) || a.name.localeCompare(b.name))

const merged = [...tagged, ...additions]
const bySport = {}
for (const c of merged) bySport[c.sport] = (bySport[c.sport] || 0) + 1
console.log(`existing ${tagged.length}, added ${additions.length}, total ${merged.length}`)
console.log('by sport:', bySport)
console.log('sample additions:')
for (const a of additions.slice(0, 6)) console.log('  ', a.sport, a.name, '→', a.colors.map(c => `${c.name} ${c.hex}`).join(', '))

if (WRITE) {
  const body = 'export const clubs = ' + JSON.stringify(merged, null, 2) + '\n'
  writeFileSync(CLUBS_FILE, body)
  console.log(`\nWrote ${CLUBS_FILE}`)
} else {
  console.log('\n(dry run — pass --write to update clubs.js)')
}
