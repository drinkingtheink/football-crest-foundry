// Derive a human-friendly crest name from its text elements, read top-to-bottom.
// Arc placement and vertical position set the reading order (arched titles ride
// highest, bottom-banner text sits lowest, straight text by its y); empty rows
// are skipped. Returns '' when the crest carries no text. Pure — no Vue.
export function deriveCrestName(texts, maxLen = 48) {
  if (!texts?.length) return ''
  const vkey = (t) => {
    if (t.arc === 'top' || t.arc === 'arch') return -1000   // arched titles ride highest
    if (t.arc === 'bottom') return 1000                     // banner text sits lowest
    return t.y ?? 0
  }
  const parts = [...texts]
    .filter(t => t.content && t.content.trim())
    .sort((a, b) => vkey(a) - vkey(b))
    .map(t => t.content.trim().replace(/\s+/g, ' '))
  if (!parts.length) return ''
  const name = parts.join(' ')
  return name.length > maxLen ? name.slice(0, maxLen - 1).trimEnd() + '…' : name
}
