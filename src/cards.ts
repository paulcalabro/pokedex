import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export const TYPES = {
  Fire: '🔥',
  Water: '💧',
  Grass: '🌿',
  Electric: '⚡',
  Psychic: '🔮',
  Fighting: '👊',
  Normal: '⭐',
  Dragon: '🐉',
} as const
export type CardType = keyof typeof TYPES

export const STATUSES = ['Got it', 'Want it', 'Trade'] as const
export type Status = (typeof STATUSES)[number]

export const CONDITIONS = ['Mint', 'Near Mint', 'Good', 'Played'] as const
export type Condition = (typeof CONDITIONS)[number]

// A specific printed card chosen from the Pokémon TCG API.
export interface Official {
  id: string
  setName: string
  number: string
  rarity: string | null
  image: string
}

export interface Card {
  id: string
  name: string
  type: CardType
  status: Status
  favorite: boolean
  quantity: number
  condition: Condition
  official: Official | null
}

const COLUMNS = 'id,name,type,status,favorite,quantity,condition,tcg_id,set_name,card_number,official_rarity,image_url'

type Row = Record<string, unknown>

function fromRow(r: Row): Card {
  return {
    id: r.id as string,
    name: r.name as string,
    type: r.type as CardType,
    status: r.status as Status,
    favorite: r.favorite as boolean,
    quantity: (r.quantity as number) ?? 1,
    condition: (r.condition as Condition) ?? 'Near Mint',
    official: r.tcg_id
      ? {
          id: r.tcg_id as string,
          setName: r.set_name as string,
          number: r.card_number as string,
          rarity: (r.official_rarity as string | null) ?? null,
          image: r.image_url as string,
        }
      : null,
  }
}

function toRow(c: Partial<Card>): Row {
  const row: Row = { ...c }
  delete row.official
  if ('official' in c) {
    row.tcg_id = c.official?.id ?? null
    row.set_name = c.official?.setName ?? null
    row.card_number = c.official?.number ?? null
    row.official_rarity = c.official?.rarity ?? null
    row.image_url = c.official?.image ?? null
  }
  return row
}

const KEY = 'pokedex-cards'

function loadLocal(): Card[] {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '[]') as Partial<Card>[]
    return saved.map((c) => ({ quantity: 1, condition: 'Near Mint', official: null, ...c }) as Card)
  } catch {
    return []
  }
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!supabase)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  return { session, ready }
}

// Uses Supabase when configured and signed in, otherwise localStorage.
export function useCards(session: Session | null) {
  const remote = !!supabase && !!session
  const [cards, setCards] = useState<Card[]>(() => (supabase ? [] : loadLocal()))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!remote) return
    let cancelled = false
    supabase!
      .from('cards')
      .select(COLUMNS)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(error.message)
        else setCards((data as Row[]).map(fromRow))
      })
    return () => {
      cancelled = true
    }
  }, [remote, session?.user.id])

  useEffect(() => {
    if (!supabase) localStorage.setItem(KEY, JSON.stringify(cards))
  }, [cards])

  const fail = (message: string) => setError(`Something went wrong: ${message}`)

  const add = useCallback(
    async (name: string, type: CardType, status: Status) => {
      const card: Card = {
        id: crypto.randomUUID(),
        name,
        type,
        status,
        favorite: false,
        quantity: 1,
        condition: 'Near Mint',
        official: null,
      }
      setCards((cs) => [card, ...cs])
      if (remote) {
        const { error } = await supabase!.from('cards').insert({ ...toRow(card), user_id: session!.user.id })
        if (error) {
          setCards((cs) => cs.filter((c) => c.id !== card.id))
          fail(error.message)
        }
      }
    },
    [remote, session],
  )

  const update = useCallback(
    async (id: string, patch: Partial<Card>) => {
      let previous: Card | undefined
      setCards((cs) =>
        cs.map((c) => {
          if (c.id !== id) return c
          previous = c
          return { ...c, ...patch }
        }),
      )
      if (remote) {
        const { error } = await supabase!.from('cards').update(toRow(patch)).eq('id', id)
        if (error) {
          setCards((cs) => cs.map((c) => (c.id === id && previous ? previous : c)))
          fail(error.message)
        }
      }
    },
    [remote],
  )

  const remove = useCallback(
    async (id: string) => {
      let removed: Card | undefined
      setCards((cs) => {
        removed = cs.find((c) => c.id === id)
        return cs.filter((c) => c.id !== id)
      })
      if (remote) {
        const { error } = await supabase!.from('cards').delete().eq('id', id)
        if (error) {
          if (removed) setCards((cs) => [removed!, ...cs])
          fail(error.message)
        }
      }
    },
    [remote],
  )

  return { cards, add, update, remove, error, clearError: () => setError(null) }
}
