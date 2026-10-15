import { GameError } from '../errors'
import { addLog, emit } from '../log'
import { alivePlayersFrom } from '../lookup'
import { nextRandom } from '../rng'
import type { DrinkCallPick, GameState, InterludeMode, PlayerState } from '../types'
import { penaltyDrink } from './drink'

/**
 * House rule H3. A coffee break, a mini-game or a drink call stops the game: nothing else can be played
 * until its owner ends it, the host ends it (server side, via timeout) or its time runs out.
 * Mini-games and drink calls happen for real around the table; the app only shows what to do.
 * The owner is whoever played the card, or the active player for a drink call (an Incident).
 */
export function startInterlude(s: GameState, ownerId: string, mode: InterludeMode): void {
  const roll = Math.floor(nextRandom(s) * 2 ** 31)
  const pick = mode === 'drinkcall' && s.drinkCallPicks.length ? s.drinkCallPicks[roll % s.drinkCallPicks.length] : null
  const named = pick ? pickPlayers(s, pick) : null
  const pending = {
    id: s.nextPendingId++,
    kind: 'interlude' as const,
    mode,
    playerId: ownerId,
    roll,
    losers: [] as string[],
    named: named?.map((p) => p.id) ?? null,
    timeoutSec: mode === 'drinkcall' ? s.config.drinkCallSec : s.config.interludeSec
  }
  s.pending = pending
  addLog(s, `${mode}_start`, { actor: ownerId })
  emit(s, { kind: 'interlude', mode, owner: ownerId })
  // the game already knows who this call is about: count their shot now (the screen lists them).
  // A shot can knock its drinker out (potion-limit KO) and close the call, so keep our own reference.
  for (const player of named ?? []) {
    pending.losers.push(player.id)
    penaltyDrink(s, player, 0, { notice: false })
  }
}

/** Everyone a drink call names, from what the whole table can see. Ties all drink. */
function pickPlayers(s: GameState, pick: DrinkCallPick): PlayerState[] {
  const alive = s.players.filter((p) => p.alive)
  const most = (value: (p: PlayerState) => number) => {
    const top = Math.max(...alive.map(value))
    return alive.filter((p) => value(p) === top)
  }
  const least = (value: (p: PlayerState) => number) => most((p) => -value(p))
  switch (pick) {
    case 'everyone':
      return alive
    case 'lowest-hp':
      return least((p) => p.hp)
    case 'highest-hp':
      return most((p) => p.hp)
    case 'most-mana':
      return most((p) => p.mana)
    case 'zero-mana':
      return alive.filter((p) => p.mana === 0)
    case 'most-cards':
      return most((p) => p.hand.length)
    case 'most-shots':
      return most((p) => p.potionsDrunk)
    case 'fewest-shots':
      return least((p) => p.potionsDrunk)
    case 'active':
      return alive.filter((p) => p.id === s.activeId)
    case 'neighbours': {
      // seat order starting at the active player: the next one is on the left, the last one on the right
      const order = alivePlayersFrom(s, s.activeId).filter((p) => p.id !== s.activeId)
      return [...new Set([order[0], order[order.length - 1]])].filter((p) => !!p)
    }
    case 'artifact':
      return alive.filter((p) => p.artifacts.length > 0)
    case 'status':
      return alive.filter((p) => p.statuses.length > 0)
  }
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
  // the game already named who drinks: nobody else self-reports on this one
  if (pending.named) throw new GameError('DRINK_CALL_DECIDED')
  if (pending.losers.includes(player.id)) throw new GameError('ALREADY_TOOK_DRINK')
  pending.losers.push(player.id)
  penaltyDrink(s, player, pending.mode === 'minigame' ? s.config.miniGamePenalty : 0)
}
