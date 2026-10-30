import { useEffect, useMemo, useState } from 'react'
import type { Card } from './cards'
import { fetchPokemonNames } from './pokemon'

const KANTO = 151
const MILESTONES = [
  { count: 1, label: 'First catch', icon: '🥚' },
  { count: 10, label: 'Rookie trainer', icon: '🎒' },
  { count: 25, label: 'Pokémon fan', icon: '⭐' },
  { count: 50, label: 'Gym challenger', icon: '🏅' },
  { count: 100, label: 'Elite trainer', icon: '🏆' },
  { count: 151, label: 'Kanto master', icon: '👑' },
]

export default function Progress({ cards }: { cards: Card[] }) {
  const [ids, setIds] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    fetchPokemonNames().then((names) => setIds(new Map(names.map((n) => [n.name, n.id]))))
  }, [])

  const caught = useMemo(() => {
    const seen = new Set<number>()
    for (const c of cards) {
      if (c.status !== 'Got it') continue
      const id = ids.get(c.name.trim().toLowerCase().replace(/\s+/g, '-'))
      if (id && id <= KANTO) seen.add(id)
    }
    return seen.size
  }, [cards, ids])

  const pct = Math.round((caught / KANTO) * 100)

  return (
    <section aria-label="Collection progress" className="bg-zinc-900/80 border border-zinc-700 rounded-2xl p-4 mb-4">
      <p className="flex justify-between text-sm mb-1">
        <span className="font-bold text-slate-100">Kanto Pokédex</span>
        <span>{caught} of {KANTO} collected</span>
      </p>
      <div
        className="h-3 rounded-full bg-black/60 overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={KANTO}
        aria-valuenow={caught}
      >
        <div className="h-full bg-gradient-to-r from-red-500 to-yellow-300 transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <ul className="flex flex-wrap gap-2 mt-3">
        {MILESTONES.map((m) => {
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
    </section>
  )
}
