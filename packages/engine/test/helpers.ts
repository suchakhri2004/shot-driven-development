import { TEST_DECK } from '@sdd/cards'
import { createGame, dispatch } from '../src'
import type { Action, GameConfig, GameState } from '../src'

export const NAMES = ['alice', 'bob', 'carol', 'dave', 'erin', 'frank']

interface NewGameOptions {
  players?: number
  config?: Partial<GameConfig>
  events?: boolean
  seed?: string
}

/**
 * A game with no opening shot. Events and defensive cards are left out of the random deck so that
 * dealt hands cannot trigger surprise response windows; tests add such cards with giveHand().
 */
export function newGame({ players = 3, config = {}, events = false, seed = 'test' }: NewGameOptions = {}): GameState {
  const skipped = (type: string) => type === 'defensive' || (!events && type === 'event')
  return createGame({
    players: NAMES.slice(0, players).map((id) => ({ id, name: id, avatar: 'a' })),
    cards: TEST_DECK.map((c) => (skipped(c.type) ? { ...c, copies: 0 } : c)),
    config: { openingShot: false, ...config },
    seed
  })
}

export function edit(state: GameState, change: (draft: GameState) => void): GameState {
  const draft = structuredClone(state)
  change(draft)
  return draft
}

export function player(state: GameState, id: string) {
  return state.players.find((p) => p.id === id)!
}

/** Replace a player's hand with fresh cards of the given definitions. */
export function giveHand(state: GameState, id: string, defIds: string[]): GameState {
  return edit(state, (s) => {
    const p = player(s, id)
    s.discardPile.push(...p.hand)
    p.hand = defIds.map((defId) => ({ iid: `t${s.nextIid++}`, defId }))
  })
}

export function setMana(state: GameState, id: string, mana: number): GameState {
  return edit(state, (s) => {
    player(s, id).mana = mana
  })
}

export function setHp(state: GameState, id: string, hp: number): GameState {
  return edit(state, (s) => {
    player(s, id).hp = hp
  })
}

/** Put a specific card on top of the draw pile and leave `id` one card short of a full hand. */
export function rigNextDraw(state: GameState, id: string, defId: string): GameState {
  return edit(state, (s) => {
    const index = s.drawPile.findIndex((c) => c.defId === defId)
    const [card] = index >= 0 ? s.drawPile.splice(index, 1) : [{ iid: `t${s.nextIid++}`, defId }]
    s.drawPile.unshift(card)
    s.discardPile.push(...player(s, id).hand.splice(0, 1))
  })
}

export function iidOf(state: GameState, id: string, defId: string): string {
  const card = player(state, id).hand.find((c) => c.defId === defId)
  if (!card) throw new Error(`${id} has no ${defId} in hand`)
  return card.iid
}

export function act(state: GameState, id: string, action: Action): GameState {
  const result = dispatch(state, id, action)
  if (!result.ok) throw new Error(`${action.type} by ${id} rejected: ${result.error}`)
  return result.state
}

export function reject(state: GameState, id: string, action: Action): string {
  const result = dispatch(state, id, action)
  if (result.ok) throw new Error(`${action.type} by ${id} should have been rejected`)
  return result.error
}

/** Play a card from hand by definition id. */
export function play(
  state: GameState,
  id: string,
  defId: string,
  extra: { targets?: string[]; targetCardId?: string; costDefIds?: string[] } = {}
): GameState {
  const costCardIds = (extra.costDefIds ?? []).map((cost) => iidOf(state, id, cost))
  return act(state, id, {
    type: 'play_card',
    cardId: iidOf(state, id, defId),
    targets: extra.targets,
    targetCardId: extra.targetCardId,
    costCardIds
  })
}

export function totalCards(state: GameState): number {
  const held = state.players.reduce((n, p) => n + p.hand.length + p.artifacts.length, 0)
  return (
    state.drawPile.length +
    state.discardPile.length +
    held +
    state.chain.length +
    state.tableEvents.length
  )
}
