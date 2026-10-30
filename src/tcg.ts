import type { Rarity } from './pokemon'
import type { Official } from './cards'

interface TcgCard {
  id: string
  name: string
  number: string
  rarity?: string
  set: { name: string }
  images: { small: string }
}

const cache = new Map<string, Official[]>()
const TCG_HOST = 'https://images.pokemontcg.io/'
const DEX_HOST = 'https://assets.tcgdex.net/'

async function getJson<T>(url: string | URL, signal?: AbortSignal): Promise<T> {
  // Each service gets a limited time so a slow one doesn't block the fallback.
  const timeout = AbortSignal.timeout(8000)
  const res = await fetch(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as T
}

// Primary: Pokémon TCG API (keyless access is rate limited and can be slow).
async function searchPokemonTcg(q: string, signal?: AbortSignal): Promise<Official[]> {
  const url = new URL('https://api.pokemontcg.io/v2/cards')
  url.searchParams.set('q', `name:"${q}"`)
  url.searchParams.set('pageSize', '24')
  url.searchParams.set('select', 'id,name,number,rarity,set,images')
  const body = await getJson<{ data: TcgCard[] }>(url, signal)
  return body.data
    .filter((c) => c.images.small.startsWith(TCG_HOST))
    .map((c) => ({ id: c.id, setName: c.set.name, number: c.number, rarity: c.rarity ?? null, image: c.images.small }))
}

// Fallback: TCGdex (free, no key). Its list view has no set name or rarity; completeOfficial fills them in.
async function searchTcgdex(q: string, signal?: AbortSignal): Promise<Official[]> {
  const url = new URL('https://api.tcgdex.net/v2/en/cards')
  url.searchParams.set('name', q)
  url.searchParams.set('pagination:page', '1')
  url.searchParams.set('pagination:itemsPerPage', '24')
  const body = await getJson<{ id: string; localId: string; name: string; image?: string }[]>(url, signal)
  return body
    .filter((c) => c.image?.startsWith(DEX_HOST))
    .map((c) => ({ id: c.id, setName: '', number: c.localId, rarity: null, image: `${c.image}/low.webp` }))
}

export async function searchOfficialCards(name: string, signal?: AbortSignal): Promise<Official[]> {
  const q = name.trim().replace(/["\\]/g, '')
  if (!q) return []
  const key = q.toLowerCase()
  const hit = cache.get(key)
  if (hit) return hit
  let cards: Official[]
  try {
    cards = await searchPokemonTcg(q, signal)
  } catch (e) {
    if (signal?.aborted) throw e
    cards = await searchTcgdex(q, signal)
  }
  cache.set(key, cards)
  return cards
}

// Fills in set name and rarity for fallback-service cards after one is picked.
export async function completeOfficial(o: Official): Promise<Official> {
  if (!o.image.startsWith(DEX_HOST) || o.setName) return o
  try {
    const d = await getJson<{ rarity?: string; set?: { name?: string } }>(`https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(o.id)}`)
    return { ...o, setName: d.set?.name ?? o.setName, rarity: d.rarity ?? null }
  } catch {
    return o
  }
}

// Larger version of a stored card image; callers should fall back to the stored one on error.
export function largeImage(url: string): string {
  if (url.startsWith(DEX_HOST)) return url.replace(/\/low\.webp$/, '/high.webp')
  return url.replace(/\.png$/, '_hires.png')
}

// Maps a printed rarity label (e.g. "Rare Holo VMAX") onto the app's rarity tiers for colors.
export function officialTier(rarity: string | null): Rarity {
  const r = (rarity ?? '').toLowerCase()
  if (!r || r === 'common') return 'Common'
  if (r === 'uncommon') return 'Uncommon'
  if (/(ultra|secret|illustration|hyper|rainbow|vmax|vstar|\bex\b|\bgx\b|\bv\b|amazing|radiant|shiny)/.test(r)) return 'Ultra Rare'
  return 'Rare'
}
