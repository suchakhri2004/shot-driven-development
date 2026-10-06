import { GameError } from '../errors'
import { addLog, emit } from '../log'
import { nextRandom } from '../rng'
import type { GameState, InterludeMode, PlayerState } from '../types'
import { penaltyDrink } from './drink'

/**
 * House rule H3. A coffee break, a mini-game or a drink call stops the game: nothing else can be played
 * until its owner ends it, the host ends it (server side, via timeout) or its time runs out.
 * Mini-games and drink calls happen for real around the table; the app only shows what to do.
 * The owner is whoever played the card, or the active player for a drink call (an Incident).
 */
export function startInterlude(s: GameState, ownerId: string, mode: InterludeMode): void {
  s.pending = {
    id: s.nextPendingId++,
    kind: 'interlude',
    mode,
    playerId: ownerId,
    roll: Math.floor(nextRandom(s) * 2 ** 31),
    losers: [],
    timeoutSec: mode === 'drinkcall' ? s.config.drinkCallSec : s.config.interludeSec
  }
  addLog(s, `${mode}_start`, { actor: ownerId })
  emit(s, { kind: 'interlude', mode, owner: ownerId })
}

/** Also used when the timer runs out. */
export function closeInterlude(s: GameState): void {
  if (s.pending?.kind !== 'interlude') return
  addLog(s, `${s.pending.mode}_end`, { actor: s.pending.playerId })
  s.pending = null
  emit(s, { kind: 'interlude_end' })
}

export function endInterlude(s: GameState, player: PlayerState): void {
  if (s.pending?.kind !== 'interlude') throw new GameError('NO_INTERLUDE')
  if (s.pending.playerId !== player.id) throw new GameError('NOT_INTERLUDE_OWNER')
  closeInterlude(s)
}

/** "I drank": lost the mini-game (and loses `miniGamePenalty` Shot Stack) or the drink call was about me. */
export function takeDrink(s: GameState, player: PlayerState): void {
  const pending = s.pending
  if (pending?.kind !== 'interlude' || pending.mode === 'pause') throw new GameError('NO_DRINK_CALL')
  if (pending.losers.includes(player.id)) throw new GameError('ALREADY_TOOK_DRINK')
  pending.losers.push(player.id)
  penaltyDrink(s, player, pending.mode === 'minigame' ? s.config.miniGamePenalty : 0)
}
