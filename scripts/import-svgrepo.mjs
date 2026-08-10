// Import CC0/public-domain SVGRepo icons from a local folder into src/data/icons.js.
//
// SVGRepo icons are single-fill but come at varied (sometimes negative-origin)
// viewBoxes and mix <path> with <circle>/<polygon>. This tool normalises each:
//   - translates all geometry so the viewBox origin is 0,0 (icons.js renders 0 0 w h)
//   - converts <circle>/<polygon> to path `d` strings (icons.js only draws paths[])
//   - drops fill="none" decorative/stroke-only paths
//   - rounds coordinates to 2dp to keep the bundle lean
// then appends them to the icons array with per-file id/label/group from MANIFEST.
//
// Idempotent: ids already present in icons.js are skipped. Not a runtime dep.
//
//   node scripts/import-svgrepo.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import SvgPath from 'svgpath'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SRC = '/Users/drinkingtheink/Downloads/symbols'
const ICONS_FILE = path.join(ROOT, 'src/data/icons.js')

// filename (sans -svgrepo-com.svg) → { id, label, group, extraGroups? }
const MANIFEST = {
  // ── Maritime (sea life) ──
  'anglerfish-fish-sea':                 { id: 'sr-anglerfish', label: 'Anglerfish', group: 'Maritime', extraGroups: ['Beasts'] },
  'animal-sea-tortoise':                 { id: 'sr-sea-turtle', label: 'Sea Turtle', group: 'Maritime', extraGroups: ['Beasts'] },
  'beach-sea-starfish':                  { id: 'sr-starfish', label: 'Starfish', group: 'Maritime' },
  'big-and-small-fish-fish-group-school-of-fish': { id: 'sr-fish-school', label: 'School of Fish', group: 'Maritime' },
  'big-fish-nature-predator-hunt':       { id: 'sr-big-fish', label: 'Big Fish', group: 'Maritime', extraGroups: ['Beasts'] },
  'clam-food-sea':                       { id: 'sr-clam', label: 'Clam', group: 'Maritime' },
  'clown-clownfish-fish':                { id: 'sr-clownfish', label: 'Clownfish', group: 'Maritime', extraGroups: ['Beasts'] },
  'crab-animal-crustacean':              { id: 'sr-crab', label: 'Crab', group: 'Maritime', extraGroups: ['Beasts'] },
  'crab-food-sea':                       { id: 'sr-crab-2', label: 'Crab (Alt)', group: 'Maritime', extraGroups: ['Beasts'] },
  'eel-fish-food':                       { id: 'sr-eel', label: 'Eel', group: 'Maritime', extraGroups: ['Beasts'] },
  'egg-food-sea':                        { id: 'sr-fish-roe', label: 'Fish Roe', group: 'Maritime' },
  'fish-food-salmon':                    { id: 'sr-salmon', label: 'Salmon', group: 'Maritime' },
  'fish-food-sea':                       { id: 'sr-fish', label: 'Fish', group: 'Maritime' },
  'fish-jellyfish-sea':                  { id: 'sr-jellyfish', label: 'Jellyfish', group: 'Maritime', extraGroups: ['Beasts'] },
  'fish-puffer-sea':                     { id: 'sr-pufferfish', label: 'Pufferfish', group: 'Maritime', extraGroups: ['Beasts'] },
  'fish-sea-stingray':                   { id: 'sr-stingray', label: 'Stingray', group: 'Maritime', extraGroups: ['Beasts'] },
  'food-lobster-sea':                    { id: 'sr-lobster', label: 'Lobster', group: 'Maritime', extraGroups: ['Beasts'] },
  'food-octopus-sea':                    { id: 'sr-octopus', label: 'Octopus', group: 'Maritime', extraGroups: ['Beasts'] },
  'food-prawn-sea':                      { id: 'sr-prawn', label: 'Prawn', group: 'Maritime', extraGroups: ['Beasts'] },
  'food-sea-squid':                      { id: 'sr-squid', label: 'Squid', group: 'Maritime', extraGroups: ['Beasts'] },
  'food-sea-urchin':                     { id: 'sr-sea-urchin', label: 'Sea Urchin', group: 'Maritime' },
  'jewel-pearl-sea':                     { id: 'sr-pearl', label: 'Pearl', group: 'Maritime', extraGroups: ['Emblems'] },
  'seahorse-sea-creature-sea-horse':     { id: 'sr-seahorse', label: 'Seahorse', group: 'Maritime', extraGroups: ['Beasts'] },
  'shark-danger-predator-angry':         { id: 'sr-shark', label: 'Shark', group: 'Maritime', extraGroups: ['Beasts'] },
  'storm-sea-ocean-waves':               { id: 'sr-waves', label: 'Ocean Waves', group: 'Maritime', extraGroups: ['Nature'] },
  'whale-big-animal-giant':              { id: 'sr-whale', label: 'Whale', group: 'Maritime', extraGroups: ['Beasts'] },
  'whale-wild-animal':                   { id: 'sr-whale-2', label: 'Whale (Alt)', group: 'Maritime', extraGroups: ['Beasts'] },

  // ── Beasts (land animals) ──
  'big-dog-pet-dog-animal':              { id: 'sr-dog', label: 'Dog', group: 'Beasts' },
  'cat-animal':                          { id: 'sr-cat', label: 'Cat', group: 'Beasts' },
  'dinosaur-animal-old-old-age':         { id: 'sr-dinosaur', label: 'Dinosaur', group: 'Beasts' },
  'elephant-big-animal-huge':            { id: 'sr-elephant', label: 'Elephant', group: 'Beasts' },
  'fox-wild-animal-fur-vixen':           { id: 'sr-fox', label: 'Fox', group: 'Beasts' },
  'lion-wild-animal-cat':                { id: 'sr-lion', label: 'Lion', group: 'Beasts', extraGroups: ['Heraldic'] },
  'snail-crawl-slow-steady':             { id: 'sr-snail', label: 'Snail', group: 'Beasts' },
  'snake-tempt-wild-nature':             { id: 'sr-snake', label: 'Snake', group: 'Beasts' },
  'walking-deer-wildlife-deer-animal':   { id: 'sr-deer', label: 'Deer', group: 'Beasts' },
  'wolf-wild-scary-animal':              { id: 'sr-wolf', label: 'Wolf', group: 'Beasts' },

  // ── Birds / Insects ──
  'flock-of-birds-fly-free-birds':       { id: 'sr-birds-flock', label: 'Flock of Birds', group: 'Birds' },
  'bug-crawl-insect-ugly':               { id: 'sr-bug', label: 'Bug', group: 'Insects' },

  // ── Mythical ──
  'dragon-head-evil-legend-myth':        { id: 'sr-dragon-head', label: 'Dragon Head', group: 'Mythical' },
  'dragon-with-wings-monster-legend-myth': { id: 'sr-dragon-winged', label: 'Winged Dragon', group: 'Mythical' },
  'flying-dragon-fly-legend-myth':       { id: 'sr-dragon-flying', label: 'Flying Dragon', group: 'Mythical' },
  'walking-dragon-legend-myth-folklore': { id: 'sr-dragon-walking', label: 'Walking Dragon', group: 'Mythical' },
  'hydra-ugly-enemy-legend':             { id: 'sr-hydra', label: 'Hydra', group: 'Mythical' },

  // ── Nature ──
  'forest-nature-woods-park':            { id: 'sr-forest', label: 'Forest', group: 'Nature' },
  'mountain-landscape-outdoors-nature-mountains': { id: 'sr-mountain', label: 'Mountain', group: 'Nature' },
  'mountains-outdoors-nature-challenge': { id: 'sr-mountains', label: 'Mountains', group: 'Nature' },
  'night-in-mountains-outdoors-nature-mountains': { id: 'sr-mountains-night', label: 'Mountains at Night', group: 'Nature' },
  'oasis-nature-vacation-tropical':      { id: 'sr-oasis', label: 'Oasis', group: 'Nature' },
  'water-fall-nature-water-flow':        { id: 'sr-waterfall', label: 'Waterfall', group: 'Nature' },
  'environmental-protection-future-planet-global': { id: 'sr-green-planet', label: 'Green Planet', group: 'Nature', extraGroups: ['Emblems'] },
  'florist-flower-maarket-flower-design-floristry': { id: 'sr-flower', label: 'Flower', group: 'Flora' },
  'snowflake-cold-chilly-frosty':        { id: 'sr-snowflake', label: 'Snowflake', group: 'Nature' },
  'lightning-weather-thunderstorm':      { id: 'sr-lightning', label: 'Lightning', group: 'Nature' },
  'thunder-bad-trouble-weather':         { id: 'sr-thunderbolt', label: 'Thunderbolt', group: 'Nature' },

  // ── Celestial ──
  'daylight-sunlight-daylight-savings-natural-light': { id: 'sr-daylight', label: 'Daylight', group: 'Celestial' },
  'night-dark-late-moon':                { id: 'sr-moon-stars', label: 'Moon & Stars', group: 'Celestial' },
  'meteorite-fall-meteor-comet':         { id: 'sr-meteor', label: 'Meteor', group: 'Celestial' },
  'supernova-star-radiation':            { id: 'sr-supernova', label: 'Supernova', group: 'Celestial' },
  'universe-big-cosmos-gravity':         { id: 'sr-galaxy', label: 'Galaxy', group: 'Celestial' },
}

const num = (attrs, name) => {
  const m = attrs.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`))
  return m ? parseFloat(m[1]) : 0
}
const round = n => Math.round(n * 100) / 100

function circleToPath(cx, cy, r) {
  return `M ${round(cx)},${round(cy - r)} A ${r},${r} 0 1 0 ${round(cx)},${round(cy + r)} A ${r},${r} 0 1 0 ${round(cx)},${round(cy - r)} Z`
}
function polygonToPath(points, dx, dy) {
  const n = points.trim().split(/[\s,]+/).map(Number)
  let d = ''
  for (let i = 0; i < n.length - 1; i += 2) {
    d += (i === 0 ? 'M ' : 'L ') + round(n[i] + dx) + ',' + round(n[i + 1] + dy) + ' '
  }
  return d.trim() + ' Z'
}

function extractPaths(svg, dx, dy) {
  const out = []
  const re = /<(path|circle|polygon)\b([^>]*?)\/?>/gs
  let m
  while ((m = re.exec(svg))) {
    const [, tag, attrs] = m
    const fill = (attrs.match(/\bfill\s*=\s*"([^"]*)"/) || [])[1]
    if (fill === 'none') continue
    if (tag === 'path') {
      const d = (attrs.match(/\bd\s*=\s*"([^"]*)"/) || [])[1]
      if (!d) continue
      out.push(SvgPath(d).translate(dx, dy).round(2).toString())
    } else if (tag === 'circle') {
      out.push(circleToPath(num(attrs, 'cx') + dx, num(attrs, 'cy') + dy, num(attrs, 'r')))
    } else if (tag === 'polygon') {
      const pts = (attrs.match(/\bpoints\s*=\s*"([^"]*)"/) || [])[1]
      if (pts) out.push(polygonToPath(pts, dx, dy))
    }
  }
  return out
}

const iconsSrc = fs.readFileSync(ICONS_FILE, 'utf8')
const existingIds = new Set([...iconsSrc.matchAll(/\bid:\s*'([^']+)'/g)].map(m => m[1]))

const blocks = []
let added = 0, skipped = 0
for (const [key, meta] of Object.entries(MANIFEST)) {
  const file = path.join(SRC, `${key}-svgrepo-com.svg`)
  if (!fs.existsSync(file)) { console.warn(`! missing: ${key}`); continue }
  if (existingIds.has(meta.id)) { skipped++; continue }
  const svg = fs.readFileSync(file, 'utf8')
  const vb = (svg.match(/viewBox\s*=\s*"([^"]+)"/) || [])[1].trim().split(/[\s,]+/).map(Number)
  const [minX, minY, w, h] = vb
  const paths = extractPaths(svg, -minX, -minY)
  if (!paths.length) { console.warn(`! no paths: ${key}`); continue }
  const extra = meta.extraGroups ? `\n    extraGroups: ${JSON.stringify(meta.extraGroups).replace(/"/g, "'")},` : ''
  const pathLines = paths.map(p => `      '${p}',`).join('\n')
  blocks.push(
`  {
    id: '${meta.id}',
    label: '${meta.label}',
    group: '${meta.group}',${extra}
    viewBox: [${round(w)}, ${round(h)}],
    paths: [
${pathLines}
    ],
  },`)
  added++
}

if (!blocks.length) {
  console.log(`Nothing to add (${skipped} already present).`)
  process.exit(0)
}

const marker = '\n]\n\nexport const iconsById'
const insertion = `\n\n  // ── SVGRepo import (CC0 / public domain) ──\n${blocks.join('\n')}\n]\n\nexport const iconsById`
const out = iconsSrc.replace(marker, insertion)
if (out === iconsSrc) { console.error('! could not find array close marker'); process.exit(1) }
fs.writeFileSync(ICONS_FILE, out)
console.log(`Added ${added} icons (${skipped} already present).`)
