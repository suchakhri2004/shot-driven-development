import { GameError } from '../errors'
import { addLog, emit } from '../log'
import { nextRandom } from '../rng'
import { spendMana } from '../resources'
import type { GameState, InterludeMode, PlayerState } from '../types'

/**
 * House rule H3. A coffee break or a mini-game stops the game: nothing else can be played until the
 * card's owner ends it, the host ends it (server side, via timeout) or `config.interludeSec` runs out.
 * The mini-game itself is played for real around the table; the app only shows its rules.
 */
export function startInterlude(s: GameState, ownerId: string, mode: InterludeMode): void {
  s.pending = {
    id: s.nextPendingId++,
    kind: 'interlude',
    mode,
    playerId: ownerId,
    roll: Math.floor(nextRandom(s) * 2 ** 31),
    losers: [],
    timeoutSec: s.config.interludeSec
  }
  addLog(s, mode === 'pause' ? 'pause_start' : 'minigame_start', { actor: ownerId })
  emit(s, { kind: 'interlude', mode, owner: ownerId })
}

/** Also used when the timer runs out. */
export function closeInterlude(s: GameState): void {
  if (s.pending?.kind !== 'interlude') return
  addLog(s, s.pending.mode === 'pause' ? 'pause_end' : 'minigame_end', { actor: s.pending.playerId })
  s.pending = null
  emit(s, { kind: 'interlude_end' })
}

export function endInterlude(s: GameState, player: PlayerState): void {
  if (s.pending?.kind !== 'interlude') throw new GameError('NO_INTERLUDE')
  if (s.pending.playerId !== player.id) throw new GameError('NOT_INTERLUDE_OWNER')
  closeInterlude(s)
}

/** "I lost": the player drinks for real and loses up to `miniGamePenalty` Shot Stack (never below 0). */
export function loseMiniGame(s: GameState, player: PlayerState): void {
  const pending = s.pending
  if (pending?.kind !== 'interlude' || pending.mode !== 'minigame') throw new GameError('NO_MINIGAME')
  if (pending.losers.includes(player.id)) throw new GameError('ALREADY_LOST')
  pending.losers.push(player.id)
  const amount = Math.min(player.mana, s.config.miniGamePenalty)
  spendMana(s, player, amount)
  addLog(s, 'minigame_loss', { target: player.id, amount })
  emit(s, { kind: 'minigame_loss', target: player.id, amount })
}
