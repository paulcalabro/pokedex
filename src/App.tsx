import type { Session } from '@supabase/supabase-js'
import { useEffect, useMemo, useState } from 'react'
import { STATUSES, TYPES, useCards, useSession, type CardType, type Status } from './cards'
import SignIn from './SignIn'
import { supabase } from './supabase'

const COLORS: Record<CardType, string> = {
  Fire: 'bg-zinc-800 border-orange-500',
  Water: 'bg-zinc-800 border-sky-500',
  Grass: 'bg-zinc-800 border-green-500',
  Electric: 'bg-zinc-800 border-yellow-400',
  Psychic: 'bg-zinc-800 border-purple-500',
  Fighting: 'bg-zinc-800 border-red-500',
  Normal: 'bg-zinc-800 border-slate-400',
  Dragon: 'bg-zinc-800 border-indigo-500',
}

// Sprites are loaded from the community PokéAPI project; nothing is bundled here.
const SPRITE = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
const STARTERS = [
  { id: 1, name: 'Bulbasaur' },
  { id: 4, name: 'Charmander' },
  { id: 25, name: 'Pikachu' },
  { id: 7, name: 'Squirtle' },
  { id: 133, name: 'Eevee' },
]

function Shell({ children, signedIn, onSignOut }: { children: React.ReactNode; signedIn: boolean; onSignOut: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-slate-900 text-slate-200 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-center gap-3 mb-1">
          <Pokeball className="h-10 w-10" />
          <h1 className="text-4xl font-extrabold text-slate-100">My Pokédex Binder</h1>
        </div>
        <div className="flex justify-center gap-2 mb-3">
          {STARTERS.map((p) => (
            <img key={p.id} src={SPRITE(p.id)} alt={p.name} className="h-16 w-16 object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]" />
          ))}
        </div>
        {children}

        <Pokeball className="h-8 w-8 mx-auto mt-10 opacity-60" />
        <p className="text-center text-xs text-slate-500 mt-2">
          Fan-made organizer. Pokémon is a trademark of Nintendo, Game Freak and The Pokémon Company. Pokémon art loaded from PokéAPI.
          {supabase ? ' Your cards are saved to your account.' : ' Your cards are saved only in this browser.'}
        </p>
        {signedIn && (
          <p className="text-center mt-2">
            <button className="text-xs underline text-slate-400 hover:text-slate-200" onClick={onSignOut}>Sign out</button>
          </p>
        )}
      </div>
    </div>
  )
}

function Pokeball({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <circle cx="50" cy="50" r="46" fill="#fff" stroke="#111" strokeWidth="6" />
      <path d="M4 50a46 46 0 0 1 92 0z" fill="#ef4444" stroke="#111" strokeWidth="6" />
      <path d="M4 50h92" stroke="#111" strokeWidth="8" />
      <circle cx="50" cy="50" r="13" fill="#fff" stroke="#111" strokeWidth="6" />
    </svg>
  )
}

function useSpriteId(name: string) {
  const [id, setId] = useState<number | null>(null)
  useEffect(() => {
    const slug = name.trim().toLowerCase().replace(/\s+/g, '-')
    const ctrl = new AbortController()
    fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(slug)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setId(d?.id ?? null))
      .catch(() => {})
    return () => ctrl.abort()
  }, [name])
  return id
}

function CardArt({ name, type }: { name: string; type: CardType }) {
  const id = useSpriteId(name)
  const [failed, setFailed] = useState(false)
  if (id === null || failed) {
    return <span className="text-5xl block h-24 text-center leading-[6rem]" aria-hidden>{TYPES[type]}</span>
  }
  return (
    <img
      src={SPRITE(id)}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-24 w-full object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]"
    />
  )
}

export default function App() {
  const { session, ready } = useSession()
  if (!ready) return null
  if (supabase && !session) {
    return (
      <Shell signedIn={false} onSignOut={() => {}}>
        <SignIn />
      </Shell>
    )
  }
  return <Binder session={session} />
}

function Binder({ session }: { session: Session | null }) {
  const { cards, add: addCard, update, remove, error, clearError } = useCards(session)
  const [name, setName] = useState('')
  const [type, setType] = useState<CardType>('Normal')
  const [status, setStatus] = useState<Status>('Got it')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<CardType | 'All'>('All')
  const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All')
  const [favsOnly, setFavsOnly] = useState(false)

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
    addCard(n, type, status)
    setName('')
  }

  const field = 'rounded-xl border-2 border-zinc-600 px-3 py-2 bg-zinc-800 text-slate-100 placeholder:text-slate-500 focus:border-slate-300 outline-none'

  return (
    <Shell onSignOut={() => supabase?.auth.signOut()} signedIn={!!session}>
        {error && (
          <p role="alert" className="text-red-400 text-sm text-center mb-3">
            {error} <button className="underline" onClick={clearError}>Dismiss</button>
          </p>
        )}
        <p className="text-center text-slate-400 mb-6">
          Keep track of your Pokémon cards! {cards.length} card{cards.length === 1 ? '' : 's'} so far.
        </p>

        <form onSubmit={add} className="flex flex-wrap gap-2 bg-zinc-900/80 border border-zinc-700 rounded-2xl p-4 mb-4">
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
          <button className="rounded-xl bg-slate-300 hover:bg-white text-zinc-950 font-bold px-5 py-2">
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
          <p className="text-center text-slate-400 py-10">
            {cards.length === 0 ? 'Your binder is empty. Add your first card!' : 'No cards match. Try a different search.'}
          </p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {shown.map((c) => (
              <li key={c.id} className={`rounded-2xl border-4 p-3 shadow-lg shadow-black/50 ${COLORS[c.type]}`}>
                <div className="flex justify-between">
                  <span className="text-2xl" aria-hidden>{TYPES[c.type]}</span>
                  <button
                    aria-label={c.favorite ? `Unfavorite ${c.name}` : `Favorite ${c.name}`}
                    onClick={() => update(c.id, { favorite: !c.favorite })}
                    className="text-2xl"
                  >
                    {c.favorite ? '❤️' : '🤍'}
                  </button>
                </div>
                <CardArt name={c.name} type={c.type} />
                <h2 className="font-bold text-lg break-words">{c.name}</h2>
                <p className="text-sm mb-2">{c.type}</p>
                <select
                  className="w-full rounded-lg bg-zinc-900 text-slate-100 px-2 py-1 text-sm"
                  aria-label={`Status of ${c.name}`}
                  value={c.status}
                  onChange={(e) => update(c.id, { status: e.target.value as Status })}
                >
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <button
                  className="mt-2 text-xs underline text-slate-400 hover:text-slate-200"
                  onClick={() => confirm(`Remove ${c.name}?`) && remove(c.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

    </Shell>
  )
}
