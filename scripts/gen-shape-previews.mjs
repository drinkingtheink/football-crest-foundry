// Authoring tool (not a runtime dep): renders one theme-adaptive SVG preview per
// shield shape into docs/shapes/ and prints a Markdown table for the README.
// Each SVG carries a prefers-color-scheme <style> so the silhouette stays legible
// on both light and dark GitHub themes. Re-run after editing src/data/shapes.js:
//   node scripts/gen-shape-previews.mjs
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { shapes, VIEWBOX_W, VIEWBOX_H } from '../src/data/shapes.js'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(here, '../docs/shapes')
mkdirSync(outDir, { recursive: true })

const COLS = 5

function svg(shape) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX_W} ${VIEWBOX_H}" width="120" height="144" role="img" aria-label="${shape.label} shield shape">
  <style>
    .shape { fill: #24242e; stroke: #b8912e; stroke-width: 3; stroke-linejoin: round; }
    @media (prefers-color-scheme: dark) {
      .shape { fill: #d9d9e0; stroke: #e8c84a; }
    }
  </style>
  <path class="shape" d="${shape.path}" />
</svg>
`
}

for (const shape of shapes) {
  writeFileSync(resolve(outDir, `${shape.id}.svg`), svg(shape))
}

const cells = shapes.map(
  s => `<td align="center" valign="top"><img src="docs/shapes/${s.id}.svg" width="104" alt="${s.label} shield shape" /><br/><sub>${s.label}</sub></td>`
)
const rows = []
for (let i = 0; i < cells.length; i += COLS) {
  rows.push('  <tr>\n    ' + cells.slice(i, i + COLS).join('\n    ') + '\n  </tr>')
}
const table = `<table>\n${rows.join('\n')}\n</table>`

console.log(`Wrote ${shapes.length} SVGs to docs/shapes/\n`)
console.log(table)
