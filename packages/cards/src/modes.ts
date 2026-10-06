import type { CardDef, GameConfig } from '@sdd/engine'
import { DECK } from './deck'
import { DECK_PLAN } from './deck-plan'

/**
 * Table modes the host picks in the lobby, from tame to brutal. A mode only changes numbers:
 * how many house-rule cards (drink calls, git blame, mini-games…) go into the deck and a few config
 * values. The rules themselves stay the same, and "classic" is the original game with no house cards.
 */
export type GameMode = 'classic' | 'party' | 'rush' | 'heavy' | 'hardcore'

export interface ModeDef {
  id: GameMode
  name: string
  /** One line for the lobby. */
  blurb: string
  /** 1 (tame) .. 5 (brutal): drawn as a meter in the lobby. */
  heat: number
  /** Copies of each house-rule card. Cards not listed keep the deck's own count. */
  house: Record<string, number>
  config: Partial<GameConfig>
}

export const MODES: ModeDef[] = [
  {
    id: 'classic',
    name: 'คลาสสิก',
    blurb: 'ตามเกมต้นฉบับ ไม่มีการ์ดพิเศษ',
    heat: 1,
    house: { 'coffee-break': 0, hackathon: 0, 'git-blame': 0, 'last-call': 0 },
    config: { houseCards: false, knockoutShots: 0 }
  },
  {
    id: 'party',
    name: 'ปาร์ตี้',
    blurb: 'มาตรฐานวงเหล้า มีพักเกม มินิเกม และเหตุการณ์ดื่ม',
    heat: 2,
    house: { 'coffee-break': 2, hackathon: 4, 'git-blame': 4, 'last-call': 8 },
    config: { houseCards: true }
  },
  {
    id: 'rush',
    name: 'เร่งรอบ',
    blurb: 'Uptime เหลือ 7 ตอบโต้ไวขึ้น เกมจบเร็ว',
    heat: 3,
    house: { 'coffee-break': 1, hackathon: 4, 'git-blame': 4, 'last-call': 8 },
    config: { houseCards: true, startHp: 7, maxHp: 7, responseWindowSec: 7 }
  },
  {
    id: 'heavy',
    name: 'ดื่มหนัก',
    blurb: 'เหตุการณ์ดื่มกับ git blame มากขึ้น 2 เท่า',
    heat: 4,
    house: { 'coffee-break': 2, hackathon: 6, 'git-blame': 8, 'last-call': 16 },
    config: { houseCards: true }
  },
  {
    id: 'hardcore',
    name: 'โหดสุด',
    blurb: 'Uptime 7 ซดได้แค่ +2 เหตุการณ์ดื่ม 3 เท่า ระวังเมา',
    heat: 5,
    house: { 'coffee-break': 1, hackathon: 8, 'git-blame': 10, 'last-call': 24 },
    config: { houseCards: true, startHp: 7, maxHp: 7, potionYield: 2, responseWindowSec: 7 }
  }
]

export const DEFAULT_MODE: GameMode = 'party'

/** Duel (house rule H2): a 2-player game starts with less Uptime so it stays short. */
export const DUEL_PLAYERS = 2
export const DUEL_HP = 6

export function getMode(id: GameMode): ModeDef {
  return MODES.find((m) => m.id === id) ?? MODES.find((m) => m.id === DEFAULT_MODE)!
}

/** The config a table starts with: the room's settings, then the mode, then the duel rule. */
export function tableConfig(mode: GameMode, players: number, base: Partial<GameConfig> = {}): Partial<GameConfig> {
  const config = { ...base, ...getMode(mode).config }
  if (players !== DUEL_PLAYERS) return config
  const hp = Math.min(config.startHp ?? 10, DUEL_HP)
  return { ...config, startHp: hp, maxHp: hp }
}

/** Full-size deck for a mode: the base cards plus that mode's house-rule cards. */
export function modeDeck(mode: GameMode): CardDef[] {
  const { house } = getMode(mode)
  return DECK.map((c) => (c.id in house ? { ...c, copies: house[c.id] } : c)).filter((c) => c.copies > 0)
}

const total = (cards: CardDef[]) => cards.reduce((n, c) => n + c.copies, 0)

/**
 * Resize a deck to `size` cards, keeping the mix of cards (largest-remainder rounding, at least one
 * copy of every card that was in it). Growing works the same way, so big tables never run dry.
 */
export function resizeDeck(cards: CardDef[], size: number): CardDef[] {
  const full = total(cards)
  if (size === full) return cards
  const exact = cards.map((c) => (c.copies * size) / full)
  const copies = exact.map((x) => Math.max(1, Math.floor(x)))
  let left = size - copies.reduce((a, b) => a + b, 0)
  const order = exact.map((x, i) => ({ i, frac: x - Math.floor(x) })).sort((a, b) => b.frac - a.frac)
  for (const { i } of order) {
    if (left <= 0) break
    copies[i]++
    left--
  }
  return cards.map((c, i) => ({ ...c, copies: copies[i] }))
}

/** The deck a table of `players` uses in `mode`: sized by the analysis in deck-plan.ts. */
export function buildDeck(mode: GameMode, players: number): CardDef[] {
  const deck = modeDeck(mode)
  const planned = DECK_PLAN[mode]?.[players]?.deckSize
  return planned ? resizeDeck(deck, planned) : deck
}
