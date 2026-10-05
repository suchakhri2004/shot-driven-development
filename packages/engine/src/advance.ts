import { closeResponseIfDone, resolveTopOfChain } from './chain'
import { runStep } from './effects'
import { checkEliminations } from './elimination'
import { getActivePlayer } from './lookup'
import { drawTowardHandLimit, endTurn } from './turn'
import type { GameState } from './types'

const MAX_ITERATIONS = 10_000

/**
 * The game loop. After every action we keep moving the game forward until it needs a human:
 *   pending decision -> stop
 *   queued effect    -> run it
 *   otherwise        -> do whatever the current phase says
 * All "resumable" behaviour (events, shortfalls, response windows) works because state lives in
 * `queue` + `pending`, so this loop can stop anywhere and pick up again on the next action.
 */
export function advance(s: GameState): void {
  for (let guard = 0; !s.finished; guard++) {
    if (guard > MAX_ITERATIONS) throw new Error('advance() did not settle')

    checkEliminations(s)
    if (s.finished) return

    if (s.pending?.kind === 'response' && closeResponseIfDone(s)) continue
    if (s.pending) return

    const step = s.queue.shift()
    if (step) {
      runStep(s, step)
      continue
    }

    const active = getActivePlayer(s)
    switch (s.phase) {
      case 'opening_shot':
        return
      case 'draw':
        if (!active.alive) s.phase = 'turn_end'
        else if (!drawTowardHandLimit(s, active)) s.phase = 'action'
        continue
      case 'action':
        if (active.alive) return
        s.phase = 'turn_end'
        continue
      case 'resolve':
        resolveTopOfChain(s)
        continue
      case 'turn_end':
        endTurn(s)
        continue
      case 'game_over':
        return
    }
  }
}
