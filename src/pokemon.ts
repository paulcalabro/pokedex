import { useEffect, useState } from 'react'

export interface Stat {
  name: string
  value: number
}

export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Ultra Rare' | 'Legendary' | 'Mythical'

export interface PokemonInfo {
  id: number
  types: string[]
  height: number
  weight: number
  stats: Stat[]
  total: number
  rarity: Rarity
}

export const RARITY_STYLE: Record<Rarity, { symbol: string; badge: string; glow: string }> = {
  Common: { symbol: '●', badge: 'bg-zinc-700 text-slate-200', glow: '#94a3b8' },
  Uncommon: { symbol: '◆', badge: 'bg-emerald-700 text-emerald-50', glow: '#34d399' },
  Rare: { symbol: '★', badge: 'bg-sky-700 text-sky-50', glow: '#38bdf8' },
  'Ultra Rare': { symbol: '★★', badge: 'bg-purple-700 text-purple-50', glow: '#c084fc' },
  Legendary: { symbol: '✦', badge: 'bg-amber-500 text-zinc-950', glow: '#fbbf24' },
  Mythical: { symbol: '✧', badge: 'bg-pink-600 text-pink-50', glow: '#f472b6' },
}

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

// Rarity is based on how hard the Pokémon is to catch (PokéAPI capture rate), plus legendary/mythical flags.
function rarityOf(species: { is_legendary: boolean; is_mythical: boolean; capture_rate: number }, total: number): Rarity {
  if (species.is_mythical) return 'Mythical'
  if (species.is_legendary) return 'Legendary'
  if (species.capture_rate <= 45) return total >= 500 ? 'Ultra Rare' : 'Rare'
  if (species.capture_rate <= 120) return 'Uncommon'
  return 'Common'
}

const cache = new Map<string, Promise<PokemonInfo | null>>()

function fetchPokemon(slug: string): Promise<PokemonInfo | null> {
  let p = cache.get(slug)
  if (!p) {
    const base = 'https://pokeapi.co/api/v2'
    p = (async () => {
      const [pr, sr] = await Promise.all([
        fetch(`${base}/pokemon/${encodeURIComponent(slug)}`),
        fetch(`${base}/pokemon-species/${encodeURIComponent(slug)}`),
      ])
      if (!pr.ok || !sr.ok) return null
      const [pk, sp] = await Promise.all([pr.json(), sr.json()])
      const stats: Stat[] = pk.stats.map((s: { base_stat: number; stat: { name: string } }) => ({
        name: STAT_LABELS[s.stat.name] ?? s.stat.name,
        value: s.base_stat,
      }))
      const total = stats.reduce((n, s) => n + s.value, 0)
      return {
        id: pk.id,
        types: pk.types.map((t: { type: { name: string } }) => t.type.name),
        height: pk.height / 10,
        weight: pk.weight / 10,
        stats,
        total,
        rarity: rarityOf(sp, total),
      }
    })().catch(() => {
      cache.delete(slug)
      return null
    })
    cache.set(slug, p)
  }
  return p
}

export function usePokemon(name: string) {
  const slug = name.trim().toLowerCase().replace(/\s+/g, '-')
  const [state, setState] = useState<{ slug: string; info: PokemonInfo | null } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchPokemon(slug).then((info) => {
      if (!cancelled) setState({ slug, info })
    })
    return () => {
      cancelled = true
    }
  }, [slug])

  const loading = state?.slug !== slug
  return { info: loading ? null : state!.info, loading }
}
