#!/usr/bin/env node
// Import curated icons from any Iconify-hosted set into src/data/icons.js.
//
// Unlike import-game-icons.mjs (which shallow-clones a repo), this pulls icon
// path data straight from the Iconify JSON API — no clone, one request per set:
//   https://api.iconify.design/<prefix>.json?icons=a,b,c
// The response gives each icon's `body` (raw inner SVG) plus the set's default
// width/height. We keep only the shape-path `d` strings (the app applies its own
// single fill), storing viewBox: [w, h] per icon (icons.js supports this array).
//
// Current set: Phosphor "Fill" weight (prefix `ph`, MIT, viewBox 256×256).
// MIT needs no attribution, so nothing is added to AboutModal.
//
// Usage: node scripts/import-iconify.mjs   (idempotent — skips ids already present)

import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ICONS_JS = join(ROOT, 'src/data/icons.js')
const API = 'https://api.iconify.design'

// Curated first batch — Phosphor Fill. { prefix, name, id, label, group }
// `name` is the Iconify icon name; `id` is how it's stored in icons.js.
const MANIFEST = [
  // ── Beasts ──
  { prefix: 'ph', name: 'cat-fill',         id: 'ph-cat',         label: 'Cat',          group: 'Beasts' },
  { prefix: 'ph', name: 'horse-fill',       id: 'ph-horse',       label: 'Horse',        group: 'Beasts' },
  { prefix: 'ph', name: 'paw-print-fill',   id: 'ph-paw-print',   label: 'Paw Print',    group: 'Beasts' },

  // ── Birds ──
  { prefix: 'ph', name: 'bird-fill',        id: 'ph-bird',        label: 'Bird',         group: 'Birds' },
  { prefix: 'ph', name: 'feather-fill',     id: 'ph-feather',     label: 'Feather',      group: 'Birds' },

  // ── Flora ──
  { prefix: 'ph', name: 'tree-fill',        id: 'ph-tree',        label: 'Tree',         group: 'Flora' },

  // ── Nature ──
  { prefix: 'ph', name: 'mountains-fill',   id: 'ph-mountains',   label: 'Mountains',    group: 'Nature' },
  { prefix: 'ph', name: 'flame-fill',       id: 'ph-flame',       label: 'Flame',        group: 'Nature' },

  // ── Celestial ──
  { prefix: 'ph', name: 'sun-fill',         id: 'ph-sun',         label: 'Sun',          group: 'Celestial' },
  { prefix: 'ph', name: 'lightning-fill',   id: 'ph-lightning',   label: 'Lightning',    group: 'Celestial' },

  // ── Crowns ──
  { prefix: 'ph', name: 'crown-fill',       id: 'ph-crown',       label: 'Crown',        group: 'Crowns' },

  // ── Heraldic ──
  { prefix: 'ph', name: 'shield-fill',      id: 'ph-shield',      label: 'Shield',       group: 'Heraldic' },
  { prefix: 'ph', name: 'skull-fill',       id: 'ph-skull',       label: 'Skull',        group: 'Heraldic' },

  // ── Weapons ──
  { prefix: 'ph', name: 'sword-fill',       id: 'ph-sword',       label: 'Sword',        group: 'Weapons' },
  { prefix: 'ph', name: 'knife-fill',       id: 'ph-knife',       label: 'Knife',        group: 'Weapons' },

  // ── Maritime ──
  { prefix: 'ph', name: 'anchor-fill',      id: 'ph-anchor',      label: 'Anchor',       group: 'Maritime' },

  // ── Shapes ──
  { prefix: 'ph', name: 'star-fill',        id: 'ph-star',        label: 'Star',         group: 'Shapes' },
  { prefix: 'ph', name: 'heart-fill',       id: 'ph-heart',       label: 'Heart',        group: 'Shapes' },

  // ── Sport ──
  { prefix: 'ph', name: 'trophy-fill',      id: 'ph-trophy',      label: 'Trophy',       group: 'Sport' },
  { prefix: 'ph', name: 'soccer-ball-fill', id: 'ph-soccer-ball', label: 'Soccer Ball',  group: 'Sport' },
]

// Extract shape-path `d` strings from an Iconify icon body (raw inner SVG).
function extractPaths(body) {
  const ds = []
  const re = /<path\b[^>]*\bd="([^"]+)"[^>]*>/g
  let m
  while ((m = re.exec(body)) !== null) ds.push(m[1].trim())
  return ds
}

function formatEntry({ id, label, group }, paths, w, h) {
  const pathsLiteral = paths.map(d => `'${d}'`).join(',\n      ')
  return `  {
    id: '${id}',
    label: '${label}',
    group: '${group}',
    viewBox: [${w}, ${h}],
    paths: [
      ${pathsLiteral},
    ],
  },`
}

async function fetchSet(prefix, names) {
  const url = `${API}/${prefix}.json?icons=${names.join(',')}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Iconify API ${res.status} for ${prefix}: ${names.join(',')}`)
  return res.json()
}

async function main() {
  const src = readFileSync(ICONS_JS, 'utf8')
  const existingIds = new Set([...src.matchAll(/id:\s*'([^']+)'/g)].map(m => m[1]))

  // Group requested names by prefix so each set is one API call.
  const byPrefix = new Map()
  for (const item of MANIFEST) {
    if (!byPrefix.has(item.prefix)) byPrefix.set(item.prefix, [])
    byPrefix.get(item.prefix).push(item)
  }

  const entries = []
  let skipped = 0

  for (const [prefix, items] of byPrefix) {
    const wanted = items.filter(it => {
      if (existingIds.has(it.id)) { console.warn(`skip (id exists): ${it.id}`); skipped++; return false }
      return true
    })
    if (wanted.length === 0) continue

    const data = await fetchSet(prefix, wanted.map(it => it.name))
    const setW = data.width ?? 24
    const setH = data.height ?? 24

    for (const it of wanted) {
      const icon = data.icons?.[it.name]
      if (!icon) { console.warn(`skip (not in API response): ${prefix}:${it.name}`); skipped++; continue }
      const paths = extractPaths(icon.body || '')
      if (paths.length === 0) { console.warn(`skip (no shape paths): ${prefix}:${it.name}`); skipped++; continue }
      entries.push(formatEntry(it, paths, icon.width ?? setW, icon.height ?? setH))
    }
  }

  if (entries.length === 0) { console.log('Nothing to import.'); return }

  const marker = /\n\]\s*\n\s*export const iconsById/
  if (!marker.test(src)) throw new Error('Could not find icons array close marker in icons.js')

  const block = `\n\n  // ── Imported from Phosphor Fill via Iconify (MIT) ──\n${entries.join('\n')}\n`
  const out = src.replace(marker, `${block}]\n\nexport const iconsById`)
  writeFileSync(ICONS_JS, out)

  console.log(`\nImported ${entries.length} icons (${skipped} skipped).`)
  console.log('Source: https://phosphoricons.com (MIT — no attribution required)')
}

main().catch(err => { console.error(err); process.exit(1) })
