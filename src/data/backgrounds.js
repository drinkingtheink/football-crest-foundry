// App/page background options (the animated backdrop behind the crest) —
// shared between the editor and the shared-crest view.

export const bgOptions = [
  { id: 'grass',       label: 'Grass',      thumb: '/backgrounds/grass.jpg', isImgOption: true },
  { id: 'stadium',     label: 'Stadium',    thumb: '/backgrounds/stadium.jpg', isImgOption: true },
  { id: 'fabric',      label: 'Fabric',     thumb: '/backgrounds/fabric.png', isImgOption: true },
  { id: 'brick',       label: 'Brick',      thumb: '/backgrounds/brick.jpg', isImgOption: true },
  { id: 'pitch',       label: 'Pitch',      thumb: '/backgrounds/pitch.png', isImgOption: true },
  { id: 'stone',       label: 'Stone Wall', thumb: '/backgrounds/stone.jpg', isImgOption: true },
  { id: 'wood',        label: 'Wood',       thumb: '/backgrounds/wood.jpg', isImgOption: true },
  { id: 'bokeh',       label: 'Bokeh' },
  { id: 'aurora',      label: 'Aurora' },
  { id: 'waves',       label: 'Waves' },
  { id: 'crisscross',  label: 'Criss-Cross' },
  { id: 'pinstripe',   label: 'Pinstripe' },
  { id: 'diamonds',    label: 'Diamonds' },
  { id: 'dots',        label: 'Dots' },
  { id: 'grid',        label: 'Grid' },
  { id: 'zigzag',      label: 'Zigzag' },
]

export const imageBgTypes = new Set(['grass', 'stadium', 'fabric', 'brick', 'pitch', 'stone', 'wood'])
// Patterns that respond to the Dark/Medium/Light tone selector.
export const patternTonedTypes = new Set(['waves', 'crisscross', 'pinstripe', 'diamonds', 'dots', 'grid', 'zigzag'])
export const patternTones = ['dark', 'medium', 'light']
