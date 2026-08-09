import { supabase, isSupabaseConfigured } from '../lib/supabase.js'
import { embedFontsInto } from './exportBadge.js'

const PREFIX = 'crest-foundry:snap:'
const LEGACY_PREFIX = 'crest-forge:snap:'
const MIGRATED_KEY = 'crest-foundry:migrated'

// When signed in, snapshots live in the Supabase `designs` table; otherwise
// they stay in localStorage. Same public API either way, so SnapshotPanel /
// App don't care which backend answers.
async function currentUserId() {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

// designs row → the entry shape the UI expects.
function fromRow(row) {
  return {
    id: row.id,
    name: row.title ?? 'Untitled',
    timestamp: new Date(row.updated_at ?? row.created_at).getTime(),
    config: row.config,
    thumbnail: row.thumbnail_url ?? null,
    source: 'cloud',
  }
}

export async function saveSnapshot(name, config, svgEl) {
  const thumbnail = svgEl ? await captureThumb(svgEl, config.texts) : null
  const cleanConfig = JSON.parse(JSON.stringify(config))
  const uid = await currentUserId()
  return uid
    ? saveCloud(uid, name, cleanConfig, thumbnail)
    : saveLocal(name, cleanConfig, thumbnail)
}

export async function listSnapshots() {
  const uid = await currentUserId()
  if (uid) {
    const { data, error } = await supabase
      .from('designs')
      .select('*')
      .order('updated_at', { ascending: false })
    if (error) throw error
    return data.map(fromRow)
  }
  return listLocal()
}

export async function deleteSnapshot(id) {
  const uid = await currentUserId()
  if (uid) {
    const { error } = await supabase.from('designs').delete().eq('id', id)
    if (error) throw error
    return
  }
  deleteLocal(id)
}

// One-time copy of this browser's localStorage snapshots into the signed-in
// user's account, so existing designs follow them to the cloud. Idempotent at
// the DB level: each row carries `source_local_id` (the local snapshot id) with
// a unique (owner_id, source_local_id) index, and we upsert with
// ignoreDuplicates — so re-running (even with the flag cleared) can never
// duplicate. The in-flight guard also stops concurrent invocations racing.
let _importInFlight = null
export function importLocalToCloud() {
  if (_importInFlight) return _importInFlight
  _importInFlight = _doImport().finally(() => { _importInFlight = null })
  return _importInFlight
}

async function _doImport() {
  if (localStorage.getItem(MIGRATED_KEY)) return { imported: 0, alreadyDone: true }
  const uid = await currentUserId()
  if (!uid) return { imported: 0 }

  const locals = listLocal()
  let imported = 0
  for (const snap of locals) {
    try {
      const { error } = await supabase.from('designs').upsert(
        { owner_id: uid, title: snap.name, config: snap.config, thumbnail_url: snap.thumbnail ?? null, source_local_id: snap.id },
        { onConflict: 'owner_id,source_local_id', ignoreDuplicates: true },
      )
      if (!error) imported++
    } catch {}
  }
  // Local copies stay in localStorage as a backup — nothing is deleted.
  localStorage.setItem(MIGRATED_KEY, '1')
  return { imported }
}

// Delete every cloud design belonging to the signed-in user. RLS already
// scopes deletes to the owner; the explicit owner_id filter is belt-and-suspenders.
export async function clearCloudDesigns() {
  const uid = await currentUserId()
  if (!uid) return { deleted: 0 }
  const { data, error } = await supabase
    .from('designs')
    .delete()
    .eq('owner_id', uid)
    .select('id')
  if (error) throw error
  return { deleted: data?.length ?? 0 }
}

// --- Cloud (Supabase) ---

async function saveCloud(uid, name, config, thumbnail) {
  const { data, error } = await supabase
    .from('designs')
    .insert({ owner_id: uid, title: name, config, thumbnail_url: thumbnail })
    .select()
    .single()
  if (error) throw error
  return fromRow(data)
}

// --- Local (localStorage) ---

function saveLocal(name, config, thumbnail) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const entry = { id, name, timestamp: Date.now(), config, thumbnail, source: 'local' }
  try {
    localStorage.setItem(PREFIX + id, JSON.stringify(entry))
  } catch (e) {
    if (isQuotaError(e)) { const err = new Error('Storage full'); err.code = 'QUOTA'; throw err }
    throw e
  }
  return entry
}

function listLocal() {
  const results = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    const matchedPrefix = key?.startsWith(PREFIX) ? PREFIX
      : key?.startsWith(LEGACY_PREFIX) ? LEGACY_PREFIX
      : null
    if (!matchedPrefix) continue
    try {
      const entry = JSON.parse(localStorage.getItem(key))
      // Legacy snapshots were keyed by name and have no id — derive it from the key
      entry.id = entry.id ?? key.slice(matchedPrefix.length)
      results.push(entry)
    } catch {}
  }
  return results.sort((a, b) => b.timestamp - a.timestamp)
}

function deleteLocal(id) {
  localStorage.removeItem(PREFIX + id)
  localStorage.removeItem(LEGACY_PREFIX + id)
}

function isQuotaError(e) {
  return e instanceof DOMException &&
    (e.code === 22 || e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
}

async function captureThumb(svgEl, texts) {
  const clone = svgEl.cloneNode(true)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  // An <img>-rendered SVG can't use the page's webfonts, so inline them as
  // base64 @font-face (same approach as the PNG export) — otherwise thumbnail
  // text falls back to a system font with different metrics.
  await embedFontsInto(clone, texts)
  const svgStr = new XMLSerializer().serializeToString(clone)
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const W = 200, H = 240, scale = 2
      const canvas = document.createElement('canvas')
      canvas.width = W * scale
      canvas.height = H * scale
      const ctx = canvas.getContext('2d')
      ctx.scale(scale, scale)
      ctx.drawImage(img, 0, 0, W, H)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}
