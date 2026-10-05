import { GameError } from '../errors'
import { addLog } from '../log'
import { removeFromHand } from '../lookup'
import { spendMana } from '../resources'
import type { GameState, PlayerState } from '../types'

function assertOwnActionPhase(s: GameState, player: PlayerState): void {
  if (s.activeId !== player.id) throw new GameError('NOT_YOUR_TURN')
  if (s.pending) throw new GameError('DECISION_PENDING')
  if (s.phase !== 'action') throw new GameError('WRONG_PHASE')
}

/** R9: discarding is free during your action phase. */
export function discardCard(s: GameState, player: PlayerState, cardId: string): void {
  assertOwnActionPhase(s, player)
  const card = removeFromHand(player, cardId)
  if (!card) throw new GameError('CARD_NOT_IN_HAND')
  s.discardPile.push(card)
  addLog(s, 'discard', { actor: player.id, target: player.id, amount: 1, card: card.defId })
}

/** R13: discard 1, pay (exchanges already made this turn + 1) mana, draw 1. The counter resets each turn. */
export function exchangeCard(s: GameState, player: PlayerState, cardId: string): void {
  assertOwnActionPhase(s, player)
  const cost = s.exchangeCount + 1
  if (player.mana < cost) throw new GameError('INSUFFICIENT_MANA', String(cost - player.mana))
  const card = removeFromHand(player, cardId)
  if (!card) throw new GameError('CARD_NOT_IN_HAND')

  spendMana(s, player, cost)
  s.discardPile.push(card)
  s.exchangeCount += 1
  addLog(s, 'exchange', { actor: player.id, amount: cost, card: card.defId })
  s.queue.unshift({
    effect: { kind: 'draw', count: 1, to: 'self' },
    targetId: player.id,
    ctx: { sourceId: player.id, targets: [], excluded: [], defId: card.defId, chainItemId: null }
  })
}
