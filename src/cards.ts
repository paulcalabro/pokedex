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

export interface Card {
  id: string
  name: string
  type: CardType
  status: Status
  favorite: boolean
}

const KEY = 'pokedex-cards'

function loadLocal(): Card[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
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
      .select('id,name,type,status,favorite')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(error.message)
        else setCards(data as Card[])
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
      const card: Card = { id: crypto.randomUUID(), name, type, status, favorite: false }
      setCards((cs) => [card, ...cs])
      if (remote) {
        const { error } = await supabase!.from('cards').insert({ ...card, user_id: session!.user.id })
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
        const { error } = await supabase!.from('cards').update(patch).eq('id', id)
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
