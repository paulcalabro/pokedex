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

// Pokémon TCG API (api.pokemontcg.io); works without an API key at a low rate limit.
export async function searchOfficialCards(name: string, signal?: AbortSignal): Promise<Official[]> {
  const q = name.trim().replace(/["\\]/g, '')
  if (!q) return []
  const hit = cache.get(q.toLowerCase())
  if (hit) return hit
  const url = new URL('https://api.pokemontcg.io/v2/cards')
  url.searchParams.set('q', `name:"${q}"`)
  url.searchParams.set('pageSize', '24')
  url.searchParams.set('select', 'id,name,number,rarity,set,images')
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Card search failed (${res.status})`)
  const body = (await res.json()) as { data: TcgCard[] }
  const cards = body.data
    .filter((c) => c.images.small.startsWith('https://images.pokemontcg.io/'))
    .map((c) => ({
      id: c.id,
      setName: c.set.name,
      number: c.number,
      rarity: c.rarity ?? null,
      image: c.images.small,
    }))
  cache.set(q.toLowerCase(), cards)
  return cards
}
