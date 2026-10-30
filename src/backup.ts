import { CONDITIONS, STATUSES, TYPES, type Card, type CardType, type Condition, type Status } from './cards'

const FORMAT = 'pokedex-card-binder'
const VERSION = 1
const IMAGE_HOSTS = new Set(['images.pokemontcg.io', 'assets.tcgdex.net'])

export type BackupCard = Omit<Card, 'id'>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isOfficial(value: unknown): value is Card['official'] {
  if (value === null) return true
  if (!isRecord(value)) return false

  const { id, setName, number, rarity, image } = value
  if (
    typeof id !== 'string' || id.length === 0 || id.length > 120 ||
    typeof setName !== 'string' || setName.length > 200 ||
    typeof number !== 'string' || number.length > 40 ||
    !(rarity === null || (typeof rarity === 'string' && rarity.length <= 100)) ||
    typeof image !== 'string'
  ) return false

  try {
    const url = new URL(image)
    return url.protocol === 'https:' && IMAGE_HOSTS.has(url.hostname)
  } catch {
    return false
  }
}

function parseCard(value: unknown, index: number): BackupCard {
  if (!isRecord(value)) throw new Error(`Card ${index + 1} must be an object.`)
  const { name, type, status, favorite, quantity, condition, official } = value

  if (typeof name !== 'string' || name.trim().length === 0 || name.length > 40) {
    throw new Error(`Card ${index + 1} has an invalid name.`)
  }
  if (typeof type !== 'string' || !Object.hasOwn(TYPES, type)) {
    throw new Error(`Card ${index + 1} has an invalid type.`)
  }
  if (typeof status !== 'string' || !(STATUSES as readonly string[]).includes(status)) {
    throw new Error(`Card ${index + 1} has an invalid status.`)
  }
  if (typeof favorite !== 'boolean') throw new Error(`Card ${index + 1} has an invalid favorite value.`)
  if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > 999) {
    throw new Error(`Card ${index + 1} has an invalid quantity.`)
  }
  if (typeof condition !== 'string' || !(CONDITIONS as readonly string[]).includes(condition)) {
    throw new Error(`Card ${index + 1} has an invalid condition.`)
  }
  if (!isOfficial(official)) throw new Error(`Card ${index + 1} has invalid official card data.`)

  return {
    name,
    type: type as CardType,
    status: status as Status,
    favorite,
    quantity: quantity as number,
    condition: condition as Condition,
    official,
  }
}

export function createBackup(cards: Card[]): string {
  const backup = {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    cards: cards.map(({ id: _id, ...card }) => card),
  }
  return JSON.stringify(backup, null, 2)
}

export function parseBackup(text: string): BackupCard[] {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new Error('This file is not valid JSON.')
  }

  if (!isRecord(value) || value.format !== FORMAT || value.version !== VERSION || !Array.isArray(value.cards)) {
    throw new Error('This is not a supported Pokédex Card Binder backup.')
  }
  return value.cards.map(parseCard)
}
