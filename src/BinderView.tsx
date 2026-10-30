import { useState } from 'react'
import { TYPES, type Card } from './cards'
import { usePokemon } from './pokemon'

const PER_PAGE = 9

function Slot({ card, sprite, onOpen }: { card: Card | null; sprite: (id: number) => string; onOpen: (id: string) => void }) {
  const { info } = usePokemon(card?.name ?? '')
  if (!card) {
    return <li className="aspect-[5/7] rounded-lg border-2 border-dashed border-zinc-700 bg-black/30" aria-hidden />
  }
  const missing = card.status === 'Want it'
  const src = card.official?.image ?? (info ? sprite(info.id) : null)
  return (
    <li>
      <button
        onClick={() => onOpen(card.id)}
        aria-label={`${card.name}${missing ? ' (not collected yet)' : ''}`}
        className={`relative flex h-full w-full aspect-[5/7] items-center justify-center rounded-lg border-2 border-zinc-600 bg-zinc-800 overflow-hidden hover:scale-105 transition-transform ${missing ? 'opacity-40 grayscale' : ''}`}
      >
        {src ? (
          <img src={src} alt="" loading="lazy" className={card.official ? 'h-full w-full object-cover' : 'h-3/4 w-3/4 object-contain'} />
        ) : (
          <span className="text-4xl" aria-hidden>{TYPES[card.type]}</span>
        )}
        {card.quantity > 1 && (
          <span className="absolute bottom-1 right-1 rounded-full bg-black/80 px-1.5 text-xs font-bold text-white">×{card.quantity}</span>
        )}
        {missing && <span className="absolute inset-x-0 bottom-0 bg-black/70 text-[10px] py-0.5 text-slate-200">Want it</span>}
      </button>
    </li>
  )
}

export default function BinderView({ cards, sprite, onOpen }: { cards: Card[]; sprite: (id: number) => string; onOpen: (id: string) => void }) {
  const [requested, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(cards.length / PER_PAGE))
  const page = Math.min(requested, pages - 1)
  const slots: (Card | null)[] = cards.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
  while (slots.length < PER_PAGE) slots.push(null)

  const nav = 'rounded-xl bg-zinc-800 border border-zinc-600 px-4 py-2 font-bold disabled:opacity-30 hover:bg-zinc-700'

  return (
    <div className="max-w-md mx-auto bg-zinc-900 border-4 border-zinc-700 rounded-2xl p-3 shadow-lg shadow-black/60">
      <ul className="grid grid-cols-3 gap-2">
        {slots.map((c, i) => (
          <Slot key={c?.id ?? `empty-${i}`} card={c} sprite={sprite} onOpen={onOpen} />
        ))}
      </ul>
      <div className="flex items-center justify-between mt-3">
        <button className={nav} disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page">
          ◀
        </button>
        <span className="text-sm text-slate-300">Page {page + 1} of {pages}</span>
        <button className={nav} disabled={page >= pages - 1} onClick={() => setPage(page + 1)} aria-label="Next page">
          ▶
        </button>
      </div>
    </div>
  )
}
