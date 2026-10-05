import { GameError } from '../errors'
import { addLog } from '../log'
import type { GameState, PlayerState } from '../types'

export function finishTurn(s: GameState, player: PlayerState): void {
  if (s.activeId !== player.id) throw new GameError('NOT_YOUR_TURN')
  if (s.pending) throw new GameError('DECISION_PENDING')
  if (s.phase !== 'action') throw new GameError('WRONG_PHASE')
  addLog(s, 'end_turn', { actor: player.id })
  s.phase = 'turn_end'
}
