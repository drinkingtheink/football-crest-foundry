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

// Update an existing snapshot in place (routed by its store, not current auth,
// since cloud ids and local ids live in different namespaces).
export async function updateSnapshot(id, source, name, config, svgEl) {
  const thumbnail = svgEl ? await captureThumb(svgEl, config.texts) : null
  const cleanConfig = JSON.parse(JSON.stringify(config))
  if (source === 'cloud') {
    const { data, error } = await supabase
      .from('designs')
      .update({ title: name, config: cleanConfig, thumbnail_url: thumbnail })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return fromRow(data)
  }
  return updateLocal(id, name, cleanConfig, thumbnail)
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

// --- Sharing (link-only / unlisted) ---

function makeShareToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(9)) // 72 bits, unguessable
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Ensure a cloud design has a share link and is shared. Reuses an existing
// token so the URL is stable across shares. Also (re)generates a social-preview
// (OG) image from the design's thumbnail and uploads it to public storage.
// Returns { token, url }.
export async function shareDesign(id) {
  const { data: row, error: e1 } = await supabase
    .from('designs').select('share_token, thumbnail_url, config').eq('id', id).single()
  if (e1) throw e1

  const token = row?.share_token || makeShareToken()

  // Best-effort OG image — sharing still succeeds if this fails.
  let ogImageUrl = null
  try {
    const blob = await makeOgImage(row?.thumbnail_url, row?.config?.palette || [])
    if (blob) {
      const path = `${id}.png`
      const { error: upErr } = await supabase.storage
        .from('og-images')
        .upload(path, blob, { upsert: true, contentType: 'image/png', cacheControl: '3600' })
      if (!upErr) ogImageUrl = supabase.storage.from('og-images').getPublicUrl(path).data.publicUrl
    }
  } catch { /* leave ogImageUrl null */ }

  const patch = { share_token: token, is_shared: true, shared_at: new Date().toISOString() }
  if (ogImageUrl) patch.og_image_url = ogImageUrl
  const { error } = await supabase.from('designs').update(patch).eq('id', id)
  if (error) throw error
  return { token, url: `${location.origin}/?c=${token}` }
}

// Composite the crest thumbnail onto a 1200×630 palette-tinted canvas — the
// standard social-card size. Returns a PNG Blob (or null if no thumbnail).
async function makeOgImage(thumbDataUrl, palette) {
  if (!thumbDataUrl) return null
  const W = 1200, H = 630
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  const c0 = palette[0] || '#13131a'
  const c1 = palette[1] || palette[0] || '#07070e'
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, c0)
  grad.addColorStop(1, c1)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'   // darken for crest contrast
  ctx.fillRect(0, 0, W, H)

  const img = await loadImageEl(thumbDataUrl)
  const scale = (H * 0.82) / img.height
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh)

  return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

function loadImageEl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export async function unshareDesign(id) {
  const { error } = await supabase.from('designs').update({ is_shared: false }).eq('id', id)
  if (error) throw error
}

// Resolve a share link (anon-safe RPC). Returns the crest, or null if the link
// is invalid / no longer shared.
export async function getSharedDesign(token) {
  const { data, error } = await supabase.rpc('get_shared_design', { token })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null
  return { id: row.id, name: row.title ?? 'Untitled', config: row.config, thumbnail: row.thumbnail_url ?? null }
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

function updateLocal(id, name, config, thumbnail) {
  const entry = { id, name, timestamp: Date.now(), config, thumbnail, source: 'local' }
  try {
    localStorage.setItem(PREFIX + id, JSON.stringify(entry))
    localStorage.removeItem(LEGACY_PREFIX + id)   // fold any legacy-keyed original into the canonical key
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
