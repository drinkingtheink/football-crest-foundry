// Social crawlers don't run JS, so they only see the static index.html <head>.
// For shared-crest links (/?c=<token>) we fetch the crest server-side and swap
// the OG/title tags (between the SHARE-META markers) so previews are per-crest.

export default async (request, context) => {
  const url = new URL(request.url)
  const token = url.searchParams.get('c')

  const response = await context.next()
  if (!token) return response

  // Per-token responses must not be cached under the query-less key, or every
  // token (and the default) would collide. Also tag the outcome for debugging.
  const passthrough = (status) => {
    const headers = new Headers(response.headers)
    headers.set('x-share-og', status)
    headers.set('cache-control', 'no-store')
    return new Response(response.body, { status: response.status, headers })
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/html')) return response

  const SUPABASE_URL = Netlify.env.get('VITE_SUPABASE_URL')
  const SUPABASE_KEY = Netlify.env.get('VITE_SUPABASE_ANON_KEY')
  if (!SUPABASE_URL || !SUPABASE_KEY) return passthrough('no-env')

  let design = null
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_shared_design`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })
    if (!res.ok) return passthrough(`rpc-${res.status}`)
    const rows = await res.json()
    design = Array.isArray(rows) ? rows[0] : rows
  } catch {
    return passthrough('rpc-error')
  }

  if (!design) return passthrough('no-design')
  if (!design.og_image_url) return passthrough('no-image')

  const esc = (s) => String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const title = `${esc(design.title || 'Crest')} — Crest Foundry`
  const image = esc(design.og_image_url)
  const desc = 'A crest forged on Crest Foundry — view, download, or remix it.'
  const pageUrl = esc(url.href)

  const meta = [
    '<!-- SHARE-META:START -->',
    `<title>${title}</title>`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${desc}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:url" content="${pageUrl}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${desc}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    '<!-- SHARE-META:END -->',
  ].join('\n    ')

  const html = await response.text()
  const replaced = html.replace(/<!-- SHARE-META:START -->[\s\S]*?<!-- SHARE-META:END -->/, meta)

  const headers = new Headers(response.headers)
  headers.delete('content-length')
  headers.set('x-share-og', 'injected')
  headers.set('cache-control', 'no-store')
  return new Response(replaced, { status: response.status, headers })
}

export const config = { path: '/' }
