import { describe, expect, it } from 'vitest'
import { createBackup, parseBackup } from './backup'
import type { Card } from './cards'

const official = {
  id: 'base1-4',
  setName: 'Base',
  number: '4',
  rarity: 'Rare',
  image: 'https://images.pokemontcg.io/base1/4.png',
}

const card: Card = {
  id: 'local-1',
  name: 'Charizard',
  type: 'Fire',
  status: 'Got it',
  favorite: true,
  quantity: 2,
  condition: 'Mint',
  official,
}

function backupWith(cardOverrides: Record<string, unknown>, top: Record<string, unknown> = {}) {
  return JSON.stringify({
    format: 'pokedex-card-binder',
    version: 1,
    cards: [{ ...card, id: undefined, ...cardOverrides }],
    ...top,
  })
}

describe('backup round trip', () => {
  it('strips local ids and restores cards', () => {
    const text = createBackup([card])
    expect(JSON.parse(text).cards[0]).not.toHaveProperty('id')
    const { id: _id, ...expected } = card
    expect(parseBackup(text)).toEqual([expected])
  })

  it('accepts null official data', () => {
    expect(parseBackup(backupWith({ official: null }))[0].official).toBeNull()
  })
})

describe('parseBackup rejects bad input', () => {
  it('rejects invalid JSON', () => {
    expect(() => parseBackup('{nope')).toThrow('not valid JSON')
  })

  it.each([
    ['wrong format', { format: 'other' }],
    ['wrong version', { version: 2 }],
    ['non-array cards', { cards: {} }],
  ])('rejects %s', (_label, top) => {
    expect(() => parseBackup(backupWith({}, top))).toThrow('not a supported')
  })

  it('rejects non-object cards', () => {
    const text = JSON.stringify({ format: 'pokedex-card-binder', version: 1, cards: [[]] })
    expect(() => parseBackup(text)).toThrow('Card 1 must be an object')
  })

  it.each([
    ['blank name', { name: '   ' }, 'invalid name'],
    ['too-long name', { name: 'x'.repeat(41) }, 'invalid name'],
    ['inherited type key', { type: 'toString' }, 'invalid type'],
    ['unknown status', { status: 'Maybe' }, 'invalid status'],
    ['non-boolean favorite', { favorite: 'yes' }, 'invalid favorite'],
    ['zero quantity', { quantity: 0 }, 'invalid quantity'],
    ['fractional quantity', { quantity: 1.5 }, 'invalid quantity'],
    ['quantity over 999', { quantity: 1000 }, 'invalid quantity'],
    ['unknown condition', { condition: 'Torn' }, 'invalid condition'],
    ['http image', { official: { ...official, image: 'http://images.pokemontcg.io/a.png' } }, 'official card data'],
    ['untrusted image host', { official: { ...official, image: 'https://evil.example/a.png' } }, 'official card data'],
    ['malformed image URL', { official: { ...official, image: 'not a url' } }, 'official card data'],
    ['empty official id', { official: { ...official, id: '' } }, 'official card data'],
  ])('rejects %s', (_label, overrides, message) => {
    expect(() => parseBackup(backupWith(overrides))).toThrow(message)
  })

  it('reports the 1-based index of the failing card', () => {
    const text = JSON.stringify({
      format: 'pokedex-card-binder',
      version: 1,
      cards: [{ ...card, id: undefined }, { ...card, id: undefined, quantity: 0 }],
    })
    expect(() => parseBackup(text)).toThrow('Card 2 has an invalid quantity')
  })
})
