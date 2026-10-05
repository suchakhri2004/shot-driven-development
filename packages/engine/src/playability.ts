import { GameError } from './errors'
import { getDef } from './lookup'
import { assertPlayWindow, canAssignCostCards, expandCostSlots, targetCandidates } from './validation'
import type { CardInstance, GameState, PlayerState } from './types'

export interface Playability {
  playable: boolean
  reason?: string
  shortBy?: number
}

/**
 * Hint for the UI: could this card be played right now? Mana shortfall is reported separately
 * because the player can fix it by drinking.
 */
export function describePlayability(s: GameState, player: PlayerState, inst: CardInstance): Playability {
  const def = getDef(s, inst.defId)
  try {
    assertPlayWindow(s, player, def)
  } catch (error) {
    return { playable: false, reason: error instanceof GameError ? error.code : 'UNKNOWN' }
  }

  const needsTarget = ['one-opponent', 'any-player', 'artifact'].includes(def.target)
  if (needsTarget && targetCandidates(s, player, def).length === 0) return { playable: false, reason: 'NO_TARGET' }

  const others = player.hand.filter((c) => c.iid !== inst.iid).map((c) => getDef(s, c.defId))
  if (!canAssignCostCards(expandCostSlots(def), others)) return { playable: false, reason: 'COST_CARDS_REQUIRED' }

  if (player.mana < def.cost.mana) {
    return { playable: false, reason: 'INSUFFICIENT_MANA', shortBy: def.cost.mana - player.mana }
  }
  return { playable: true }
}
