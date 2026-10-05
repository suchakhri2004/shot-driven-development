import { eliminate } from '../elimination'
import { GameError } from '../errors'
import { addLog, emit } from '../log'
import { alivePlayers } from '../lookup'
import { canDrink, giveMana } from '../resources'
import { settleShortfall } from '../shortfall'
import { getStat } from '../stats'
import type { GameState, PlayerState } from '../types'

/**
 * R4: drinking a potion gives mana, and may be done at ANY time, including out of turn and while
 * answering an attack. During the opening shot (house rule H1) each player drinks exactly once.
 */
export function drink(s: GameState, player: PlayerState): void {
  const opening = s.phase === 'opening_shot'
  if (opening && player.openingShotDone) throw new GameError('ALREADY_DRANK')
  if (!canDrink(s)) throw new GameError('BANK_EMPTY')

  const amount = giveMana(s, player, getStat(s, player, 'potionYield'))
  player.potionsDrunk += 1
  addLog(s, 'drink', { actor: player.id, amount })
  emit(s, { kind: 'drink', target: player.id, amount })

  settleShortfall(s, player)
  if (opening) {
    player.openingShotDone = true
    startFirstTurnWhenReady(s)
  }
  enforcePotionLimit(s, player)
}

function startFirstTurnWhenReady(s: GameState): void {
  if (!alivePlayers(s).every((p) => p.openingShotDone)) return
  s.phase = 'draw'
  addLog(s, 'game_start', { actor: s.activeId })
  emit(s, { kind: 'opening_done' })
  emit(s, { kind: 'turn', player: s.activeId })
}

/** Optional house rule (koMode 'potion-limit'): drinking past the limit is a KO. */
function enforcePotionLimit(s: GameState, player: PlayerState): void {
  const { koMode, potionLimit } = s.config
  if (koMode === 'potion-limit' && potionLimit !== null && player.potionsDrunk > potionLimit) {
    eliminate(s, player, 'ko')
  }
}
