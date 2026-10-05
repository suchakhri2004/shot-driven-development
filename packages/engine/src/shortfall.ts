import { addLog, emit } from './log'
import { canDrink, spendMana } from './resources'
import type { GameState, PlayerState } from './types'

function loseHp(s: GameState, player: PlayerState, amount: number): void {
  player.hp -= amount
  addLog(s, 'shortfall_hp', { target: player.id, amount })
  emit(s, { kind: 'shortfall', target: player.id, amount })
}

/**
 * R14/R15: pay `amount` mana. Whatever the player cannot pay becomes a shortfall:
 * they must drink right away, otherwise they lose HP equal to what is still missing.
 */
export function payManaOrShortfall(s: GameState, player: PlayerState, amount: number): void {
  const paid = Math.min(player.mana, amount)
  if (paid > 0) {
    spendMana(s, player, paid)
    addLog(s, 'mana', { target: player.id, amount: -paid })
    emit(s, { kind: 'mana', target: player.id, delta: -paid })
  }
  const missing = amount - paid
  if (missing <= 0) return
  if (!canDrink(s)) return loseHp(s, player, missing)
  s.pending = {
    id: s.nextPendingId++,
    kind: 'shortfall',
    playerId: player.id,
    remaining: missing,
    timeoutSec: s.config.shortfallSec
  }
}

/** Called after the shortfall player drinks: freshly drunk mana is consumed immediately. */
export function settleShortfall(s: GameState, player: PlayerState): void {
  const pending = s.pending
  if (pending?.kind !== 'shortfall' || pending.playerId !== player.id) return
  const paid = Math.min(player.mana, pending.remaining)
  spendMana(s, player, paid)
  pending.remaining -= paid
  addLog(s, 'mana', { target: player.id, amount: -paid, extra: 'shortfall' })
  emit(s, { kind: 'mana', target: player.id, delta: -paid })
  if (pending.remaining === 0) s.pending = null
  else if (!canDrink(s)) declineShortfall(s, player)
}

export function declineShortfall(s: GameState, player: PlayerState): void {
  const pending = s.pending
  if (pending?.kind !== 'shortfall' || pending.playerId !== player.id) return
  s.pending = null
  loseHp(s, player, pending.remaining)
}
