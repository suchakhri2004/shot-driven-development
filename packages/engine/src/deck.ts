import { addLog, emit } from './log'
import { getDef } from './lookup'
import { queueEffects } from './queue'
import { shuffleInPlace } from './rng'
import type { CardInstance, GameState, PlayerState } from './types'

export type DrawResult = { kind: 'card' } | { kind: 'event'; queued: number } | { kind: 'empty' }

/** Draw pile runs out -> shuffle the discard pile back in. */
export function takeFromDrawPile(s: GameState): CardInstance | undefined {
  if (s.drawPile.length === 0 && s.discardPile.length > 0) {
    s.drawPile = shuffleInPlace(s, s.discardPile.splice(0))
    addLog(s, 'reshuffle')
  }
  return s.drawPile.shift()
}

/**
 * Draw one card. R8: an Event is revealed and resolved immediately instead of entering the hand;
 * the caller must then draw a replacement (after the event's queued steps have run).
 */
export function drawCard(s: GameState, player: PlayerState): DrawResult {
  const inst = takeFromDrawPile(s)
  if (!inst) return { kind: 'empty' }
  if (getDef(s, inst.defId).type === 'event') return { kind: 'event', queued: revealEvent(s, inst) }
  player.hand.push(inst)
  emit(s, { kind: 'draw', target: player.id, count: 1 })
  return { kind: 'card' }
}

function revealEvent(s: GameState, inst: CardInstance): number {
  const def = getDef(s, inst.defId)
  addLog(s, 'event', { card: def.id })
  emit(s, { kind: 'event', defId: def.id })
  if (def.duration) s.tableEvents.push({ inst, remaining: def.duration.turns })
  else s.discardPile.push(inst)
  return queueEffects(s, def.effects, {
    sourceId: null,
    targets: [],
    excluded: [],
    defId: def.id,
    chainItemId: null
  })
}
