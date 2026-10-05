import { canRespondWith, topOfChain } from './chain'
import { GameError } from './errors'
import { alivePlayersFrom, findPlayer, getDef } from './lookup'
import type { CardDef, CardInstance, DiscardCost, GameState, PlayerState } from './types'

export type PlayWindow = 'action' | 'response'

/** Is this player allowed to play this card at this moment? (turn, phase, response rules) */
export function assertPlayWindow(s: GameState, player: PlayerState, def: CardDef): PlayWindow {
  const pending = s.pending
  if (pending?.kind === 'response') {
    if (!pending.eligible.includes(player.id) || pending.passed.includes(player.id)) {
      throw new GameError('NOT_ELIGIBLE_TO_RESPOND')
    }
    const top = topOfChain(s)
    if (!top || !canRespondWith(def, getDef(s, top.defId).type)) throw new GameError('CANNOT_RESPOND_WITH_CARD')
    return 'response'
  }
  if (pending) throw new GameError('DECISION_PENDING')
  if (s.phase !== 'action' || s.activeId !== player.id) throw new GameError('NOT_YOUR_TURN')
  if (def.type === 'event') throw new GameError('EVENT_NOT_PLAYABLE')
  if (def.type === 'defensive') throw new GameError('DEFENSIVE_ONLY_IN_RESPONSE')
  return 'action'
}

export function targetCandidates(s: GameState, player: PlayerState, def: CardDef): string[] {
  const others = alivePlayersFrom(s, player.id).filter((p) => p.id !== player.id)
  switch (def.target) {
    case 'one-opponent':
      return others.map((p) => p.id)
    case 'any-player':
      return alivePlayersFrom(s, player.id).map((p) => p.id)
    case 'artifact':
      return alivePlayersFrom(s, player.id)
        .filter((p) => p.artifacts.length > 0)
        .map((p) => p.id)
    default:
      return []
  }
}

export interface ChosenTargets {
  targets: string[]
  targetCardId?: string
}

export function validateTargets(
  s: GameState,
  player: PlayerState,
  def: CardDef,
  chosen: { targets?: string[]; targetCardId?: string }
): ChosenTargets {
  switch (def.target) {
    case 'none':
      return { targets: [] }
    case 'self':
      return { targets: [player.id] }
    case 'all-opponents':
      return { targets: alivePlayersFrom(s, player.id).filter((p) => p.id !== player.id).map((p) => p.id) }
    case 'all-players':
      return { targets: alivePlayersFrom(s, player.id).map((p) => p.id) }
    case 'one-opponent':
    case 'any-player':
    case 'artifact': {
      const id = chosen.targets?.[0]
      if (!id || !targetCandidates(s, player, def).includes(id)) throw new GameError('BAD_TARGET')
      if (def.target !== 'artifact') return { targets: [id] }
      const hasArtifact = findPlayer(s, id)?.artifacts.some((a) => a.iid === chosen.targetCardId)
      if (!hasArtifact) throw new GameError('BAD_TARGET')
      return { targets: [id], targetCardId: chosen.targetCardId }
    }
  }
}

function matchesSlot(slot: DiscardCost, card: CardDef): boolean {
  return (!slot.element || card.element === slot.element) && (!slot.type || card.type === slot.type)
}

/** Can every discard requirement be paid by a distinct card? (small backtracking search) */
export function canAssignCostCards(slots: DiscardCost[], cards: CardDef[]): boolean {
  const used = cards.map(() => false)
  const assign = (slotIndex: number): boolean => {
    if (slotIndex === slots.length) return true
    for (let i = 0; i < cards.length; i++) {
      if (used[i] || !matchesSlot(slots[slotIndex], cards[i])) continue
      used[i] = true
      if (assign(slotIndex + 1)) return true
      used[i] = false
    }
    return false
  }
  return assign(0)
}

export function expandCostSlots(def: CardDef): DiscardCost[] {
  return (def.cost.discard ?? []).flatMap((c) => Array.from({ length: c.count }, () => c))
}

/** R11: cards discarded as part of a cost (e.g. "discard 1 Fire spell"). */
export function validateCostCards(
  s: GameState,
  player: PlayerState,
  def: CardDef,
  played: CardInstance,
  ids: string[]
): CardInstance[] {
  const slots = expandCostSlots(def)
  if (new Set(ids).size !== ids.length || ids.length !== slots.length) throw new GameError('COST_CARDS_REQUIRED')
  const cards = ids.map((iid) => {
    const card = player.hand.find((c) => c.iid === iid)
    if (!card || card.iid === played.iid) throw new GameError('COST_CARDS_REQUIRED')
    return card
  })
  if (!canAssignCostCards(slots, cards.map((c) => getDef(s, c.defId)))) throw new GameError('COST_CARDS_MISMATCH')
  return cards
}
