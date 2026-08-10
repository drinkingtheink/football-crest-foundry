import { ref } from 'vue'
import { svgToSymbol } from '../utils/svgImport.js'

// Local "My Symbols" library (this browser only, for now). Each entry:
//   { id: 'custom:<uid>', label, paths: ['<d>', …], viewBox: [w, h] }
// The geometry is also embedded into the crest config when a symbol is added,
// so saved/shared crests stay self-contained.

const KEY = 'crest-foundry:symbols'

const customSymbols = ref(load())

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(customSymbols.value))
    return true
  } catch {
    return false
  }
}

export function useCustomSymbols() {
  // Parse + validate an SVG, store it, return the new entry (or { error }).
  function addFromSvg(svgText, label) {
    const result = svgToSymbol(svgText)
    if (result.error) return result
    const id = `custom:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
    const entry = {
      id,
      label: (label || '').trim() || 'My Symbol',
      paths: result.paths,
      viewBox: result.viewBox,
    }
    customSymbols.value = [entry, ...customSymbols.value]
    if (!persist()) {
      customSymbols.value = customSymbols.value.filter(s => s.id !== id)
      return { error: 'Storage is full — remove a symbol and try again.' }
    }
    return entry
  }

  function remove(id) {
    customSymbols.value = customSymbols.value.filter(s => s.id !== id)
    persist()
  }

  function rename(id, label) {
    const name = (label || '').trim()
    if (!name) return
    customSymbols.value = customSymbols.value.map(s => s.id === id ? { ...s, label: name } : s)
    persist()
  }

  return { customSymbols, addFromSvg, remove, rename }
}
