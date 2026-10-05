export type Element = 'hotfix' | 'freeze' | 'deploy'
export type CardType = 'offensive' | 'defensive' | 'support' | 'curse' | 'artifact' | 'event'
export type TargetKind =
  | 'none'
  | 'self'
  | 'one-opponent'
  | 'any-player'
  | 'all-opponents'
  | 'all-players'
  | 'artifact'

export type Stat = 'handLimit' | 'potionYield' | 'damageTaken' | 'damageDealt'
export interface Modifier {
  stat: Stat
  delta: number
}

export type EffectTarget = 'targets' | 'self' | 'all-opponents' | 'all-players'

export interface StatusDef {
  id: string
  name: string
  modifiers: Modifier[]
  turns: number
  skipTurn?: boolean
}

/** House rule H3: a card can stop the game for a coffee break or a real-life mini-game. */
export type InterludeMode = 'pause' | 'minigame'

export type Effect =
  | { kind: 'damage'; amount: number; to: EffectTarget }
  | { kind: 'heal'; amount: number; to: EffectTarget }
  | { kind: 'gainMana'; amount: number; to: EffectTarget }
  | { kind: 'loseMana'; amount: number; to: EffectTarget }
  | { kind: 'draw'; count: number; to: EffectTarget }
  | { kind: 'discard'; count: number; to: EffectTarget }
  | { kind: 'status'; status: StatusDef; to: EffectTarget }
  | { kind: 'swapHands' }
  | { kind: 'counter' }
  | { kind: 'destroyArtifact' }
  | { kind: 'interlude'; mode: InterludeMode }

export interface DiscardCost {
  count: number
  element?: Element
  type?: CardType
}

export interface CardDef {
  id: string
  name: string
  description: string
  type: CardType
  element?: Element
  cost: { mana: number; discard?: DiscardCost[] }
  target: TargetKind
  respondsTo?: CardType[]
  effects: Effect[]
  modifiers?: Modifier[]
  duration?: { turns: number }
  incantation?: string
  copies: number
  image?: string
  source: 'test-fixture' | 'official-reskin' | 'house-original'
  needsConfirmation?: boolean
  /** House-rule card: left out of the deck when `config.houseCards` is off. */
  house?: boolean
}

export interface CardInstance {
  iid: string
  defId: string
}

export interface StatusInstance {
  id: string
  name: string
  modifiers: Modifier[]
  remaining: number
  skipTurn?: boolean
  fromCard: string
}

export interface TableEvent {
  inst: CardInstance
  remaining: number
}

export interface GameConfig {
  startHp: number
  maxHp: number
  startHand: number
  handLimit: number
  potionYield: number
  manaBankSize: number | null
  openingShot: boolean
  koMode: 'self-declare' | 'potion-limit'
  potionLimit: number | null
  responseWindowSec: number
  shortfallSec: number
  discardChoiceSec: number
  responderScope: 'targeted' | 'all'
  /** House rule H3: shuffle the coffee break and mini-game cards into the deck. */
  houseCards: boolean
  /** How long a coffee break or a mini-game may last before the game resumes by itself. */
  interludeSec: number
  /** Shot Stack lost by each player who presses "I lost" in a mini-game (they also drink for real). */
  miniGamePenalty: number
}

export const DEFAULT_CONFIG: GameConfig = {
  startHp: 10,
  maxHp: 10,
  startHand: 5,
  handLimit: 5,
  potionYield: 3,
  manaBankSize: null,
  openingShot: true,
  koMode: 'self-declare',
  potionLimit: null,
  responseWindowSec: 10,
  shortfallSec: 15,
  discardChoiceSec: 20,
  responderScope: 'targeted',
  houseCards: true,
  interludeSec: 600,
  miniGamePenalty: 3
}

export interface PlayerInit {
  id: string
  name: string
  avatar: string
  nonAlcoholic?: boolean
}

export interface PlayerState {
  id: string
  name: string
  avatar: string
  nonAlcoholic: boolean
  seat: number
  hp: number
  mana: number
  hand: CardInstance[]
  artifacts: CardInstance[]
  statuses: StatusInstance[]
  alive: boolean
  eliminatedBy: 'hp' | 'ko' | null
  potionsDrunk: number
  openingShotDone: boolean
}

export type Phase = 'opening_shot' | 'draw' | 'action' | 'resolve' | 'turn_end' | 'game_over'

export interface ChainItem {
  id: number
  inst: CardInstance
  defId: string
  ownerId: string
  targets: string[]
  targetCardId?: string
  negatedFor: string[]
  counterOf: number | null
  counterOwnerId: string | null
}

export interface EffectCtx {
  sourceId: string | null
  targets: string[]
  targetCardId?: string
  excluded: string[]
  defId: string
  chainItemId: number | null
}

export interface Step {
  effect: Effect
  targetId: string | null
  ctx: EffectCtx
}

export type Pending =
  | { id: number; kind: 'response'; eligible: string[]; passed: string[]; timeoutSec: number }
  | { id: number; kind: 'shortfall'; playerId: string; remaining: number; timeoutSec: number }
  | { id: number; kind: 'discard'; playerId: string; count: number; timeoutSec: number }
  /**
   * The game is stopped for a break or a mini-game. `playerId` played the card and may end it early.
   * `roll` picks the mini-game from the list on the client; `losers` pressed "I lost" (once each).
   */
  | {
      id: number
      kind: 'interlude'
      mode: InterludeMode
      playerId: string
      roll: number
      losers: string[]
      timeoutSec: number
    }

export interface LogEntry {
  seq: number
  turn: number
  kind: string
  actor?: string
  target?: string
  card?: string
  amount?: number
  extra?: string
}

export type Fx =
  | { kind: 'damage'; target: string; amount: number }
  | { kind: 'heal'; target: string; amount: number }
  | { kind: 'mana'; target: string; delta: number }
  | { kind: 'drink'; target: string; amount: number }
  | { kind: 'play'; owner: string; defId: string; targets: string[] }
  | { kind: 'counter'; owner: string; defId: string }
  | { kind: 'event'; defId: string }
  | { kind: 'draw'; target: string; count: number }
  | { kind: 'turn'; player: string }
  | { kind: 'eliminated'; target: string; by: 'hp' | 'ko' }
  | { kind: 'shortfall'; target: string; amount: number }
  | { kind: 'opening_done' }
  | { kind: 'winner'; player: string | null }
  | { kind: 'interlude'; mode: InterludeMode; owner: string }
  | { kind: 'interlude_end' }
  | { kind: 'minigame_loss'; target: string; amount: number }

export interface EliminationRecord {
  playerId: string
  turn: number
  by: 'hp' | 'ko'
}

export interface GameState {
  version: number
  phase: Phase
  players: PlayerState[]
  activeId: string
  turnNumber: number
  exchangeCount: number
  drawPile: CardInstance[]
  discardPile: CardInstance[]
  tableEvents: TableEvent[]
  manaBank: number | null
  chain: ChainItem[]
  queue: Step[]
  pending: Pending | null
  log: LogEntry[]
  logSeq: number
  config: GameConfig
  defs: Record<string, CardDef>
  rng: number
  nextIid: number
  nextPendingId: number
  nextChainId: number
  finished: boolean
  winnerId: string | null
  eliminationOrder: EliminationRecord[]
  fx: Fx[]
}

export type Action =
  | { type: 'drink' }
  | { type: 'play_card'; cardId: string; targets?: string[]; targetCardId?: string; costCardIds?: string[] }
  | { type: 'discard_card'; cardId: string }
  | { type: 'exchange_card'; cardId: string }
  | { type: 'finish_turn' }
  | { type: 'pass_response' }
  | { type: 'decline_shortfall' }
  | { type: 'choose_discard'; cardIds: string[] }
  | { type: 'declare_ko' }
  | { type: 'end_interlude' }
  | { type: 'lose_minigame' }
  | { type: 'timeout'; pendingId: number }

export type DispatchResult =
  | { ok: true; state: GameState; fx: Fx[] }
  | { ok: false; error: string; message: string }

export interface PublicPlayer {
  id: string
  name: string
  avatar: string
  nonAlcoholic: boolean
  seat: number
  hp: number
  maxHp: number
  mana: number
  handCount: number
  artifacts: CardInstance[]
  statuses: { id: string; name: string; remaining: number }[]
  alive: boolean
  eliminatedBy: 'hp' | 'ko' | null
  potionsDrunk: number
  openingShotDone: boolean
}

export interface HandCard {
  iid: string
  defId: string
  playable: boolean
  reason?: string
  shortBy?: number
}

export interface PublicChainItem {
  id: number
  defId: string
  ownerId: string
  targets: string[]
  negatedFor: string[]
}

export interface PublicState {
  version: number
  phase: Phase
  me: string
  activeId: string
  turnNumber: number
  exchangeCount: number
  exchangeCost: number
  players: PublicPlayer[]
  hand: HandCard[]
  handLimit: number
  potionYield: number
  drawPileCount: number
  discardCount: number
  discardTop: CardInstance | null
  tableEvents: TableEvent[]
  manaBank: number | null
  chain: PublicChainItem[]
  pending: Pending | null
  log: LogEntry[]
  finished: boolean
  winnerId: string | null
  eliminationOrder: EliminationRecord[]
  config: GameConfig
}
