import { useEffect, useMemo, useState } from 'react'

const TYPES = {
  Fire: '🔥',
  Water: '💧',
  Grass: '🌿',
  Electric: '⚡',
  Psychic: '🔮',
  Fighting: '👊',
  Normal: '⭐',
  Dragon: '🐉',
} as const
type CardType = keyof typeof TYPES

const STATUSES = ['Got it', 'Want it', 'Trade'] as const
type Status = (typeof STATUSES)[number]

interface Card {
  id: string
  name: string
  type: CardType
  status: Status
  favorite: boolean
}

const COLORS: Record<CardType, string> = {
  Fire: 'bg-orange-200 border-orange-400',
  Water: 'bg-sky-200 border-sky-400',
  Grass: 'bg-green-200 border-green-400',
  Electric: 'bg-yellow-200 border-yellow-400',
  Psychic: 'bg-purple-200 border-purple-400',
  Fighting: 'bg-red-200 border-red-400',
  Normal: 'bg-stone-200 border-stone-400',
  Dragon: 'bg-indigo-200 border-indigo-400',
}

const KEY = 'pokedex-cards'

function load(): Card[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export default function App() {
  const [cards, setCards] = useState<Card[]>(load)
  const [name, setName] = useState('')
  const [type, setType] = useState<CardType>('Normal')
  const [status, setStatus] = useState<Status>('Got it')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<CardType | 'All'>('All')
  const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All')
  const [favsOnly, setFavsOnly] = useState(false)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(cards))
  }, [cards])

  const shown = useMemo(
    () =>
      cards.filter(
        (c) =>
          c.name.toLowerCase().includes(search.trim().toLowerCase()) &&
          (typeFilter === 'All' || c.type === typeFilter) &&
          (statusFilter === 'All' || c.status === statusFilter) &&
          (!favsOnly || c.favorite),
      ),
    [cards, search, typeFilter, statusFilter, favsOnly],
  )

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    setCards([{ id: crypto.randomUUID(), name: n, type, status, favorite: false }, ...cards])
    setName('')
  }

  const update = (id: string, patch: Partial<Card>) =>
    setCards(cards.map((c) => (c.id === id ? { ...c, ...patch } : c)))

  const field = 'rounded-xl border-2 border-yellow-400 px-3 py-2 bg-white'

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-yellow-100 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-extrabold text-red-600 text-center mb-1">📒 My Card Binder</h1>
        <p className="text-center text-slate-600 mb-6">
          Keep track of your Pokémon cards! {cards.length} card{cards.length === 1 ? '' : 's'} so far.
        </p>

        <form onSubmit={add} className="flex flex-wrap gap-2 bg-white/70 rounded-2xl p-4 mb-4">
          <input
            className={`${field} flex-1 min-w-40`}
            placeholder="Card name (like Pikachu)"
            aria-label="Card name"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
          />
          <select className={field} aria-label="Type" value={type} onChange={(e) => setType(e.target.value as CardType)}>
            {Object.entries(TYPES).map(([t, e]) => (
              <option key={t} value={t}>{e} {t}</option>
            ))}
          </select>
          <select className={field} aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button className="rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold px-5 py-2">
            Add card
          </button>
        </form>

        <div className="flex flex-wrap gap-2 mb-6">
          <input className={`${field} flex-1 min-w-40`} placeholder="🔍 Search" aria-label="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className={field} aria-label="Filter by type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as CardType | 'All')}>
            <option value="All">All types</option>
            {Object.keys(TYPES).map((t) => <option key={t}>{t}</option>)}
          </select>
          <select className={field} aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as Status | 'All')}>
            <option value="All">All statuses</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <label className={`${field} flex items-center gap-2`}>
            <input type="checkbox" checked={favsOnly} onChange={(e) => setFavsOnly(e.target.checked)} />
            ❤️ Favorites
          </label>
        </div>

        {shown.length === 0 ? (
          <p className="text-center text-slate-500 py-10">
            {cards.length === 0 ? 'Your binder is empty. Add your first card!' : 'No cards match. Try a different search.'}
          </p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {shown.map((c) => (
              <li key={c.id} className={`rounded-2xl border-4 p-3 shadow ${COLORS[c.type]}`}>
                <div className="flex justify-between">
                  <span className="text-3xl" aria-hidden>{TYPES[c.type]}</span>
                  <button
                    aria-label={c.favorite ? `Unfavorite ${c.name}` : `Favorite ${c.name}`}
                    onClick={() => update(c.id, { favorite: !c.favorite })}
                    className="text-2xl"
                  >
                    {c.favorite ? '❤️' : '🤍'}
                  </button>
                </div>
                <h2 className="font-bold text-lg break-words">{c.name}</h2>
                <p className="text-sm mb-2">{c.type}</p>
                <select
                  className="w-full rounded-lg bg-white/80 px-2 py-1 text-sm"
                  aria-label={`Status of ${c.name}`}
                  value={c.status}
                  onChange={(e) => update(c.id, { status: e.target.value as Status })}
                >
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <button
                  className="mt-2 text-xs underline text-slate-700"
                  onClick={() => confirm(`Remove ${c.name}?`) && setCards(cards.filter((x) => x.id !== c.id))}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="text-center text-xs text-slate-500 mt-10">
          Fan-made organizer. Pokémon is a trademark of Nintendo, Game Freak and The Pokémon Company. Your cards are saved only in this browser.
        </p>
      </div>
    </div>
  )
}
