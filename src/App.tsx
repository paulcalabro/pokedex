import type { Session } from '@supabase/supabase-js'
import { useMemo, useRef, useState } from 'react'
import BinderView from './BinderView'
import { createBackup, parseBackup } from './backup'
import { CONDITIONS, STATUSES, TYPES, useCards, useSession, type Card, type CardType, type Condition, type Status } from './cards'
import NameAutocomplete from './NameAutocomplete'
import { RARITY_STYLE, usePokemon } from './pokemon'
import Progress from './Progress'
import SignIn from './SignIn'
import StatsModal from './StatsModal'
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
          Fan-made organizer. Pokémon is a trademark of Nintendo, Game Freak and The Pokémon Company. Pokémon data from PokéAPI, the Pokémon TCG API and TCGdex.
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

function RarityBadge({ card }: { card: Card }) {
  const { info } = usePokemon(card.name)
  if (card.official?.rarity) {
    return <span className="inline-block rounded-full px-2 py-0.5 text-xs font-bold bg-zinc-700 text-slate-100">{card.official.rarity}</span>
  }
  if (!info) return null
  const r = RARITY_STYLE[info.rarity]
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${r.badge}`}>{r.symbol} {info.rarity}</span>
}

function CardArt({ name, type, image }: { name: string; type: CardType; image?: string }) {
  const { info } = usePokemon(name)
  const id = info?.id ?? null
  const [failed, setFailed] = useState(false)
  if (image) {
    return <img src={image} alt={name} loading="lazy" className="h-40 w-full object-contain rounded" />
  }
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
  const { cards, add: addCard, importCards, update, remove, error, clearError } = useCards(session)
  const fileInput = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ message: string; error: boolean } | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<CardType>('Normal')
  const [status, setStatus] = useState<Status>('Got it')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<CardType | 'All'>('All')
  const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All')
  const [favsOnly, setFavsOnly] = useState(false)
  const [view, setView] = useState<'grid' | 'binder'>('grid')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = cards.find((c) => c.id === selectedId)

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

  const exportCollection = () => {
    const blob = new Blob([createBackup(cards)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pokedex-binder-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const importCollection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    try {
      const imported = parseBackup(await file.text())
      if (await importCards(imported)) {
        setImportResult({
          message: `Added ${imported.length} card${imported.length === 1 ? '' : 's'} from backup. Existing cards were kept.`,
          error: false,
        })
      }
    } catch (e) {
      setImportResult({
        message: e instanceof Error ? `Import failed: ${e.message}` : 'Import failed. Please choose a valid backup file.',
        error: true,
      })
    } finally {
      setImporting(false)
      e.target.value = ''
    }
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

        <Progress cards={cards} />

        <form onSubmit={add} className="flex flex-wrap gap-2 bg-zinc-900/80 border border-zinc-700 rounded-2xl p-4 mb-4">
          <NameAutocomplete value={name} onChange={setName} className={field} sprite={SPRITE} />
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
          <div className="flex rounded-xl overflow-hidden border-2 border-zinc-600" role="group" aria-label="View">
            {(['grid', 'binder'] as const).map((v) => (
              <button
                key={v}
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={`px-3 py-2 text-sm font-bold ${view === v ? 'bg-slate-300 text-zinc-950' : 'bg-zinc-800 text-slate-300'}`}
              >
                {v === 'grid' ? '▦ Cards' : '📖 Binder'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            type="button"
            className="rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-bold hover:bg-zinc-700"
            onClick={exportCollection}
          >
            Export backup
          </button>
          <button
            type="button"
            className="rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-bold hover:bg-zinc-700 disabled:opacity-50"
            onClick={() => fileInput.current?.click()}
            disabled={importing}
          >
            {importing ? 'Importing…' : 'Import backup'}
          </button>
          <input ref={fileInput} type="file" accept=".json,application/json" className="sr-only" aria-label="Choose a JSON backup" onChange={importCollection} />
          <span className="text-xs text-slate-400">Import adds each card separately; it won’t replace your collection.</span>
        </div>
        {importResult && (
          <p role={importResult.error ? 'alert' : 'status'} className={`text-sm text-center mb-3 ${importResult.error ? 'text-red-400' : 'text-green-300'}`}>
            {importResult.message}
          </p>
        )}

        {shown.length === 0 ? (
          <p className="text-center text-slate-400 py-10">
            {cards.length === 0 ? 'Your binder is empty. Add your first card!' : 'No cards match. Try a different search.'}
          </p>
        ) : view === 'binder' ? (
          <BinderView cards={shown} sprite={SPRITE} onOpen={setSelectedId} />
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
                <button
                  className="block w-full text-left cursor-pointer transition-transform hover:scale-105"
                  onClick={() => setSelectedId(c.id)}
                  aria-label={`View stats for ${c.name}`}
                >
                  <CardArt name={c.name} type={c.type} image={c.official?.image} />
                  <h2 className="font-bold text-lg break-words">{c.name}</h2>
                </button>
                <p className="text-sm mb-2 flex items-center justify-between gap-1">
                  {c.type} <RarityBadge card={c} />
                </p>
                <select
                  className="w-full rounded-lg bg-zinc-900 text-slate-100 px-2 py-1 text-sm"
                  aria-label={`Status of ${c.name}`}
                  value={c.status}
                  onChange={(e) => update(c.id, { status: e.target.value as Status })}
                >
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <div className="flex items-center gap-1 mt-2 text-sm">
                  <button
                    className="h-7 w-7 rounded-lg bg-zinc-900 font-bold disabled:opacity-30"
                    aria-label={`Fewer ${c.name}`}
                    disabled={c.quantity <= 1}
                    onClick={() => update(c.id, { quantity: c.quantity - 1 })}
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-bold" aria-label={`Quantity of ${c.name}`}>×{c.quantity}</span>
                  <button
                    className="h-7 w-7 rounded-lg bg-zinc-900 font-bold disabled:opacity-30"
                    aria-label={`More ${c.name}`}
                    disabled={c.quantity >= 999}
                    onClick={() => update(c.id, { quantity: c.quantity + 1 })}
                  >
                    +
                  </button>
                  <select
                    className="flex-1 min-w-0 rounded-lg bg-zinc-900 text-slate-100 px-1 py-1 text-xs"
                    aria-label={`Condition of ${c.name}`}
                    value={c.condition}
                    onChange={(e) => update(c.id, { condition: e.target.value as Condition })}
                  >
                    {CONDITIONS.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </div>
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

      {selected && <StatsModal card={selected} sprite={SPRITE} onClose={() => setSelectedId(null)} onUpdate={(patch) => update(selected.id, patch)} />}
    </Shell>
  )
}
