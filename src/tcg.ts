import { useEffect, useState } from 'react'
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

export interface OfficialDetails {
  supertype: string
  subtypes: string[]
  hp: number | null
  types: string[]
  attacks: { name: string; cost: string[]; damage: string; text: string }[]
  weaknesses: { type: string; value: string }[]
  resistances: { type: string; value: string }[]
  retreatCost: number
  artist: string | null
  flavorText: string | null
  large: string
}

interface TcgDetail {
  supertype: string
  subtypes?: string[]
  hp?: string
  types?: string[]
  attacks?: { name: string; cost?: string[]; damage?: string; text?: string }[]
  weaknesses?: { type: string; value: string }[]
  resistances?: { type: string; value: string }[]
  convertedRetreatCost?: number
  artist?: string
  flavorText?: string
  images: { small: string; large: string }
}

const detailCache = new Map<string, Promise<OfficialDetails>>()

export function fetchOfficialDetails(id: string): Promise<OfficialDetails> {
  let p = detailCache.get(id)
  if (!p) {
    p = fetch(`https://api.pokemontcg.io/v2/cards/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Card details failed (${r.status})`))))
      .then(({ data: d }: { data: TcgDetail }) => ({
        supertype: d.supertype,
        subtypes: d.subtypes ?? [],
        hp: d.hp ? Number(d.hp) || null : null,
        types: d.types ?? [],
        attacks: (d.attacks ?? []).map((a) => ({ name: a.name, cost: a.cost ?? [], damage: a.damage ?? '', text: a.text ?? '' })),
        weaknesses: d.weaknesses ?? [],
        resistances: d.resistances ?? [],
        retreatCost: d.convertedRetreatCost ?? 0,
        artist: d.artist ?? null,
        flavorText: d.flavorText ?? null,
        large: d.images.large.startsWith('https://images.pokemontcg.io/') ? d.images.large : d.images.small,
      }))
    p.catch(() => detailCache.delete(id))
    detailCache.set(id, p)
  }
  return p
}

export function useOfficialDetails(id: string | undefined) {
  const [state, setState] = useState<{ id: string; details: OfficialDetails | null } | null>(null)
  useEffect(() => {
    if (!id) return
    let cancelled = false
    fetchOfficialDetails(id)
      .then((details) => !cancelled && setState({ id, details }))
      .catch(() => !cancelled && setState({ id, details: null }))
    return () => {
      cancelled = true
    }
  }, [id])
  const loading = !!id && state?.id !== id
  return { details: id && state?.id === id ? state.details : null, loading }
}

// Maps a printed rarity label (e.g. "Rare Holo VMAX") onto the app's rarity tiers for colors.
export function officialTier(rarity: string | null): Rarity {
  const r = (rarity ?? '').toLowerCase()
  if (!r || r === 'common') return 'Common'
  if (r === 'uncommon') return 'Uncommon'
  if (/(ultra|secret|illustration|hyper|rainbow|vmax|vstar|\bex\b|\bgx\b|\bv\b|amazing|radiant|shiny)/.test(r)) return 'Ultra Rare'
  return 'Rare'
}
