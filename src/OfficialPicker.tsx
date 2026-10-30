import { useEffect, useState } from 'react'
import type { Official } from './cards'
import { completeOfficial, searchOfficialCards } from './tcg'

export default function OfficialPicker({
  name,
  current,
  onPick,
}: {
  name: string
  current: Official | null
  onPick: (o: Official | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<Official[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!open) return
    const ctrl = new AbortController()
    searchOfficialCards(name, ctrl.signal)
      .then((r) => {
        setResults(r)
        setError(null)
      })
      .catch((e: Error) => {
        if (e.name !== 'AbortError') setError(`Couldn't load official cards (${e.message}).`)
      })
    return () => ctrl.abort()
  }, [open, name, attempt])

  return (
    <div className="mt-3 border-t border-white/10 pt-3 text-sm">
      {current ? (
        <button className="underline text-slate-400 hover:text-white" onClick={() => onPick(null)}>
          Remove official card ({current.setName} #{current.number})
        </button>
      ) : (
        <button className="underline text-slate-300 hover:text-white" onClick={() => setOpen((o) => !o)}>
          {open ? 'Hide official cards' : '🃏 Pick the official card'}
        </button>
      )}

      {open && !current && (
        <div className="mt-2">
          {error && (
            <p className="text-red-400">
              {error}{' '}
              <button
                className="underline"
                onClick={() => {
                  setError(null)
                  setResults(null)
                  setAttempt((n) => n + 1)
                }}
              >
                Try again
              </button>
            </p>
          )}
          {!error && results === null && <p className="text-slate-400">Searching…</p>}
          {results?.length === 0 && <p className="text-slate-400">No official cards found for “{name}”.</p>}
          <ul className="grid grid-cols-3 gap-2 max-h-56 overflow-auto">
            {results?.map((o) => (
              <li key={o.id}>
                <button
                  className="block w-full hover:scale-105 transition-transform"
                  onClick={async () => {
                    setOpen(false)
                    onPick(await completeOfficial(o))
                  }}
                  aria-label={`${o.setName} number ${o.number}`}
                >
                  <img src={o.image} alt="" loading="lazy" className="w-full rounded" />
                  <span className="block text-[10px] text-slate-400 truncate">{o.setName || `#${o.number}`}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
