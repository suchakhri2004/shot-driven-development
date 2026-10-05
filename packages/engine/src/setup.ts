import { advance } from './advance'
import { takeFromDrawPile } from './deck'
import { GameError } from './errors'
import { newInstance } from './lookup'
import { hashSeed, shuffleInPlace } from './rng'
import { DEFAULT_CONFIG } from './types'
import type { CardDef, GameConfig, GameState, PlayerInit, PlayerState } from './types'

export interface CreateGameOptions {
  players: PlayerInit[]
  cards: CardDef[]
  config?: Partial<GameConfig>
  seed?: string | number
  /** Seat order is the order of `players` (clockwise). Defaults to the first player. */
  firstPlayerId?: string
}

function createPlayer(init: PlayerInit, seat: number, config: GameConfig): PlayerState {
  return {
    id: init.id,
    name: init.name,
    avatar: init.avatar,
    nonAlcoholic: init.nonAlcoholic ?? false,
    seat,
    hp: config.startHp,
    mana: 0,
    hand: [],
    artifacts: [],
    statuses: [],
    alive: true,
    eliminatedBy: null,
    potionsDrunk: 0,
    openingShotDone: false
  }
}

/** R1/R2: everyone starts with full HP, 0 mana and a starting hand that contains no Event. */
function dealStartingHands(s: GameState): void {
  for (const player of s.players) {
    while (player.hand.length < s.config.startHand) {
      const card = takeFromDrawPile(s)
      if (!card) break
      if (s.defs[card.defId].type === 'event') s.discardPile.push(card)
      else player.hand.push(card)
    }
  }
}

export function createGame(options: CreateGameOptions): GameState {
  if (options.players.length < 2) throw new GameError('NOT_ENOUGH_PLAYERS')
  const config: GameConfig = { ...DEFAULT_CONFIG, ...options.config }
  const cards = config.houseCards ? options.cards : options.cards.filter((def) => !def.house)

  const s: GameState = {
    version: 0,
    phase: config.openingShot ? 'opening_shot' : 'draw',
    players: options.players.map((init, seat) => createPlayer(init, seat, config)),
    activeId: options.firstPlayerId ?? options.players[0].id,
    turnNumber: 1,
    exchangeCount: 0,
    drawPile: [],
    discardPile: [],
    tableEvents: [],
    manaBank: config.manaBankSize,
    chain: [],
    queue: [],
    pending: null,
    log: [],
    logSeq: 0,
    config,
    defs: Object.fromEntries(cards.map((def) => [def.id, def])),
    rng: hashSeed(options.seed ?? Date.now()),
    nextIid: 1,
    nextPendingId: 1,
    nextChainId: 1,
    finished: false,
    winnerId: null,
    eliminationOrder: [],
    fx: []
  }

  for (const def of cards) {
    for (let i = 0; i < def.copies; i++) s.drawPile.push(newInstance(s, def.id))
  }
  shuffleInPlace(s, s.drawPile)
  dealStartingHands(s)
  advance(s)
  s.fx = []
  return s
}
