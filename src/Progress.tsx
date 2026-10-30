import { useEffect, useMemo, useState } from 'react'
import type { Card } from './cards'
import { fetchPokemonNames } from './pokemon'

const REGIONS = [
  { name: 'Kanto', first: 1, last: 151 },
  { name: 'Johto', first: 152, last: 251 },
  { name: 'Hoenn', first: 252, last: 386 },
  { name: 'Sinnoh', first: 387, last: 493 },
  { name: 'Unova', first: 494, last: 649 },
  { name: 'Kalos', first: 650, last: 721 },
  { name: 'Alola', first: 722, last: 809 },
  { name: 'Galar', first: 810, last: 898 },
  { name: 'Hisui', first: 899, last: 905 },
  { name: 'Paldea', first: 906, last: 1025 },
]
const MILESTONES = [
  { count: 1, label: 'First catch', icon: '🥚' },
  { count: 10, label: 'Rookie trainer', icon: '🎒' },
  { count: 25, label: 'Pokémon fan', icon: '⭐' },
  { count: 50, label: 'Gym challenger', icon: '🏅' },
  { count: 100, label: 'Elite trainer', icon: '🏆' },
  { count: 250, label: 'Pokémon expert', icon: '💎' },
  { count: 500, label: 'Pokémon champion', icon: '🏆' },
  { count: 1000, label: 'Legendary collector', icon: '👑' },
]

export default function Progress({ cards }: { cards: Card[] }) {
  const [names, setNames] = useState<Awaited<ReturnType<typeof fetchPokemonNames>> | null>(null)

  useEffect(() => {
    fetchPokemonNames().then(setNames)
  }, [])

  const { total, caught, regions } = useMemo(() => {
    const speciesIds = new Map((names ?? []).map((p) => [p.name, p.id]))
    const allIds = new Set(speciesIds.values())
    const caughtIds = new Set<number>()
    for (const card of cards) {
      if (card.status !== 'Got it') continue
      const id = speciesIds.get(card.name.trim().toLowerCase().replace(/\s+/g, '-'))
      if (id) caughtIds.add(id)
    }

    const regionProgress = REGIONS.map(({ name, first, last }) => {
      const ids = [...allIds].filter((id) => id >= first && id <= last)
      return {
        name,
        total: ids.length,
        caught: ids.filter((id) => caughtIds.has(id)).length,
      }
    }).filter((region) => region.total > 0)
    const otherIds = [...allIds].filter((id) => !REGIONS.some((region) => id >= region.first && id <= region.last))
    if (otherIds.length > 0) {
      regionProgress.push({
        name: 'Other regions',
        total: otherIds.length,
        caught: otherIds.filter((id) => caughtIds.has(id)).length,
      })
    }

    return { total: allIds.size, caught: caughtIds.size, regions: regionProgress }
  }, [cards, names])

  if (names === null) {
    return (
      <section aria-label="Collection progress" className="bg-zinc-900/80 border border-zinc-700 rounded-2xl p-4 mb-4">
        <p className="text-sm text-slate-400">Loading Pokédex progress…</p>
      </section>
    )
  }

  if (total === 0) {
    return (
      <section aria-label="Collection progress" className="bg-zinc-900/80 border border-zinc-700 rounded-2xl p-4 mb-4">
        <p role="status" className="text-sm text-slate-400">Pokédex progress is unavailable right now.</p>
      </section>
    )
  }

  const pct = Math.round((caught / total) * 100)
  const milestones = MILESTONES.filter((milestone) => milestone.count <= total)
  if (!milestones.some((milestone) => milestone.count === total)) {
    milestones.push({ count: total, label: 'Pokédex master', icon: '👑' })
  }

  return (
    <section aria-label="Collection progress" className="bg-zinc-900/80 border border-zinc-700 rounded-2xl p-4 mb-4">
      <p className="flex justify-between text-sm mb-1">
        <span className="font-bold text-slate-100">Pokédex progress</span>
        <span>{caught} of {total} species collected</span>
      </p>
      <div
        className="h-3 rounded-full bg-black/60 overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={caught}
        aria-label="Overall Pokédex progress"
      >
        <div className="h-full bg-gradient-to-r from-red-500 to-yellow-300 transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <ul className="flex flex-wrap gap-2 mt-3">
        {milestones.map((m) => {
          const earned = caught >= m.count
          return (
            <li
              key={m.count}
              title={`${m.label}: collect ${m.count}`}
              className={`rounded-full px-3 py-1 text-xs font-bold border ${earned ? 'bg-amber-400 text-zinc-950 border-amber-300' : 'border-zinc-700 text-slate-500 grayscale opacity-60'}`}
            >
              {m.icon} {m.label}
            </li>
          )
        })}
      </ul>
      <ul aria-label="Progress by region" className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        {regions.map((region) => {
          const regionPct = Math.round((region.caught / region.total) * 100)
          return (
            <li key={region.name} className="text-sm">
              <p className="flex justify-between mb-1">
                <span>{region.name}</span>
                <span>{region.caught} of {region.total}</span>
              </p>
              <div
                className="h-2 rounded-full bg-black/60 overflow-hidden"
                role="progressbar"
                aria-label={`${region.name} Pokédex progress`}
                aria-valuemin={0}
                aria-valuemax={region.total}
                aria-valuenow={region.caught}
              >
                <div className="h-full bg-gradient-to-r from-red-500 to-yellow-300 transition-all duration-700" style={{ width: `${regionPct}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
