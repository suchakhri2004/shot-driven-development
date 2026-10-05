import { eliminate } from '../elimination'
import { GameError } from '../errors'
import { addLog } from '../log'
import { getPlayer, removeFromHand } from '../lookup'
import { shuffleInPlace } from '../rng'
import { declineShortfall } from '../shortfall'
import type { GameState, PlayerState } from '../types'

export function passResponse(s: GameState, player: PlayerState): void {
  const pending = s.pending
  if (pending?.kind !== 'response' || !pending.eligible.includes(player.id)) {
    throw new GameError('NOT_ELIGIBLE_TO_RESPOND')
  }
  if (!pending.passed.includes(player.id)) pending.passed.push(player.id)
}

export function declineShortfallAction(s: GameState, player: PlayerState): void {
  if (s.pending?.kind !== 'shortfall' || s.pending.playerId !== player.id) throw new GameError('NO_SHORTFALL')
  declineShortfall(s, player)
}

function discardChosen(s: GameState, player: PlayerState, cardIds: string[]): void {
  for (const id of cardIds) {
    const card = removeFromHand(player, id)
    if (card) s.discardPile.push(card)
  }
  addLog(s, 'discard', { target: player.id, amount: cardIds.length })
}

export function chooseDiscard(s: GameState, player: PlayerState, cardIds: string[]): void {
  const pending = s.pending
  if (pending?.kind !== 'discard' || pending.playerId !== player.id) throw new GameError('NO_DISCARD_PENDING')
  const unique = new Set(cardIds)
  const valid = cardIds.length === pending.count && unique.size === cardIds.length
  if (!valid || !cardIds.every((id) => player.hand.some((c) => c.iid === id))) {
    throw new GameError('BAD_DISCARD_CHOICE')
  }
  s.pending = null
  discardChosen(s, player, cardIds)
}

/** Server-driven: a decision ran out of time. Takes the least harmful default. */
export function timeoutPending(s: GameState, pendingId: number): void {
  const pending = s.pending
  if (!pending || pending.id !== pendingId) return
  switch (pending.kind) {
    case 'response':
      pending.passed = [...pending.eligible]
      return
    case 'shortfall':
      return declineShortfall(s, getPlayer(s, pending.playerId))
    case 'discard': {
      const player = getPlayer(s, pending.playerId)
      const random = shuffleInPlace(s, player.hand.map((c) => c.iid)).slice(0, pending.count)
      s.pending = null
      return discardChosen(s, player, random)
    }
  }
}

/** The "I can't go on" button: the official KO is a judgement call, so the player declares it. */
export function declareKo(s: GameState, player: PlayerState): void {
  eliminate(s, player, 'ko')
}
