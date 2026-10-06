import { advance } from './advance'
import { chooseDiscard, declareKo, declineShortfallAction, passResponse, timeoutPending } from './actions/decisions'
import { drink } from './actions/drink'
import { discardCard, exchangeCard } from './actions/hand-actions'
import { endInterlude, takeDrink } from './actions/interlude'
import { playCard } from './actions/play-card'
import { finishTurn } from './actions/turn-actions'
import { GameError } from './errors'
import { getPlayer } from './lookup'
import type { Action, DispatchResult, GameState, PlayerState } from './types'

/** Reserved id for server-initiated actions (timeouts). Clients can never act as this player. */
export const SYSTEM_PLAYER = 'system'

function perform(s: GameState, player: PlayerState, action: Exclude<Action, { type: 'timeout' }>): void {
  switch (action.type) {
    case 'drink':
      return drink(s, player)
    case 'play_card':
      return playCard(s, player, action)
    case 'discard_card':
      return discardCard(s, player, action.cardId)
    case 'exchange_card':
      return exchangeCard(s, player, action.cardId)
    case 'finish_turn':
      return finishTurn(s, player)
    case 'pass_response':
      return passResponse(s, player)
    case 'decline_shortfall':
      return declineShortfallAction(s, player)
    case 'choose_discard':
      return chooseDiscard(s, player, action.cardIds)
    case 'declare_ko':
      return declareKo(s, player)
    case 'end_interlude':
      return endInterlude(s, player)
    case 'take_drink':
      return takeDrink(s, player)
  }
}

function apply(s: GameState, playerId: string, action: Action): void {
  if (s.finished) throw new GameError('GAME_FINISHED')
  if (action.type === 'timeout') {
    if (playerId !== SYSTEM_PLAYER) throw new GameError('FORBIDDEN')
    return timeoutPending(s, action.pendingId)
  }
  const player = getPlayer(s, playerId)
  if (!player.alive) throw new GameError('ELIMINATED')
  perform(s, player, action)
}

/**
 * The single entry point for changing a game. Pure from the caller's view: `prev` is never mutated.
 * Returns the new state plus animation cues, or a typed error (state unchanged).
 */
export function dispatch(prev: GameState, playerId: string, action: Action): DispatchResult {
  const s = structuredClone(prev)
  s.fx = []
  try {
    apply(s, playerId, action)
    advance(s)
  } catch (error) {
    if (error instanceof GameError) return { ok: false, error: error.code, message: error.message }
    throw error
  }
  s.version += 1
  const fx = s.fx
  s.fx = []
  return { ok: true, state: s, fx }
}
