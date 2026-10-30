import { useEffect, useId, useMemo, useState } from 'react'
import { fetchPokemonNames, type NameEntry } from './pokemon'

const pretty = (n: string) => n.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

export default function NameAutocomplete({
  value,
  onChange,
  className,
  sprite,
}: {
  value: string
  onChange: (v: string) => void
  className: string
  sprite: (id: number) => string
}) {
  const [names, setNames] = useState<NameEntry[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()

  useEffect(() => {
    if (open && names.length === 0) fetchPokemonNames().then(setNames)
  }, [open, names.length])

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase().replace(/\s+/g, '-')
    if (!q) return []
    const starts = names.filter((n) => n.name.startsWith(q))
    const contains = names.filter((n) => !n.name.startsWith(q) && n.name.includes(q))
    return [...starts, ...contains].slice(0, 8)
  }, [names, value])

  const pick = (n: NameEntry) => {
    onChange(pretty(n.name))
    setOpen(false)
  }

  const visible = open && matches.length > 0

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' && matches.length) {
      e.preventDefault()
      setOpen(true)
      setActive((a) => (a + 1) % matches.length)
    } else if (e.key === 'ArrowUp' && matches.length) {
      e.preventDefault()
      setActive((a) => (a - 1 + matches.length) % matches.length)
    } else if (e.key === 'Enter' && visible) {
      e.preventDefault()
      pick(matches[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative flex-1 min-w-40">
      <input
        className={`${className} w-full`}
        placeholder="Card name (like Pikachu)"
        aria-label="Card name"
        role="combobox"
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        maxLength={40}
        onChange={(e) => {
          onChange(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {visible && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded-xl border border-zinc-600 bg-zinc-900 shadow-xl shadow-black/60"
        >
          {matches.map((n, i) => (
            <li
              key={n.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(n)
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex items-center gap-2 px-3 py-1 cursor-pointer text-slate-100 ${i === active ? 'bg-zinc-700' : ''}`}
            >
              <img src={sprite(n.id)} alt="" loading="lazy" className="h-8 w-8 object-contain" />
              {pretty(n.name)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
