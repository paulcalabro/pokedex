import { useEffect, useState } from 'react'
import { TYPES, type Card } from './cards'
import { RARITY_STYLE, usePokemon } from './pokemon'

export default function StatsModal({ card, sprite, onClose }: { card: Card; sprite: (id: number) => string; onClose: () => void }) {
  const { info, loading } = usePokemon(card.name)
  const [shown, setShown] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0, mx: 50, my: 50 })
  const rarity = info ? RARITY_STYLE[info.rarity] : null

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const t = requestAnimationFrame(() => setShown(true))
    return () => {
      window.removeEventListener('keydown', onKey)
      cancelAnimationFrame(t)
    }
  }, [onClose])

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    setTilt({ x: (0.5 - py) * 16, y: (px - 0.5) * 16, mx: px * 100, my: py * 100 })
  }

  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${card.name} stats`}
    >
      <div className="card-scene" onClick={(e) => e.stopPropagation()}>
        <div
          className={`holo-card ${shown ? 'is-open' : ''}`}
          onPointerMove={onMove}
          onPointerLeave={() => setTilt({ x: 0, y: 0, mx: 50, my: 50 })}
          style={
            {
              '--rx': `${tilt.x}deg`,
              '--ry': `${tilt.y}deg`,
              '--mx': `${tilt.mx}%`,
              '--my': `${tilt.my}%`,
              '--glow': rarity?.glow ?? '#94a3b8',
            } as React.CSSProperties
          }
        >
          <div className="holo-shine" aria-hidden />
          <button onClick={onClose} aria-label="Close" className="absolute top-2 right-3 text-2xl text-slate-300 hover:text-white z-10">
            ×
          </button>

          <div className="flex items-center justify-between pr-8">
            <h2 className="text-2xl font-extrabold capitalize">{card.name}</h2>
            <span aria-hidden className="text-2xl">{TYPES[card.type]}</span>
          </div>

          {info && rarity && (
            <p className={`inline-block rounded-full px-3 py-0.5 text-sm font-bold my-2 ${rarity.badge}`}>
              {rarity.symbol} {info.rarity}
            </p>
          )}

          {info && (
            <img
              src={sprite(info.id)}
              alt={card.name}
              className="h-40 w-full object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,0.7)] float-art"
            />
          )}

          {loading && <p className="text-center text-slate-400 py-10">Loading stats…</p>}
          {!loading && !info && (
            <p className="text-center text-slate-400 py-10">
              We couldn't find stats for “{card.name}”. Try a real Pokémon name like Pikachu!
            </p>
          )}

          {info && (
            <>
              <ul className="space-y-1.5 mt-2">
                {info.stats.map((s, i) => (
                  <li key={s.name} className="flex items-center gap-2 text-sm">
                    <span className="w-16 text-slate-300">{s.name}</span>
                    <span className="w-8 text-right font-bold">{s.value}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-black/50 overflow-hidden">
                      <div
                        className="h-full rounded-full stat-bar"
                        style={{
                          width: shown ? `${Math.min(100, (s.value / 150) * 100)}%` : '0%',
                          transitionDelay: `${300 + i * 90}ms`,
                          background: `linear-gradient(90deg, ${rarity!.glow}, #fff)`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-400 mt-3 flex justify-between">
                <span>Total {info.total}</span>
                <span>{info.height} m · {info.weight} kg</span>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
