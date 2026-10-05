import { addLog } from './log'
import { alivePlayers, findPlayer, getDef } from './lookup'
import { queueEffects } from './queue'
import type { CardDef, CardType, ChainItem, GameState } from './types'

export function canRespondWith(def: CardDef, itemType: CardType): boolean {
  return def.type === 'defensive' && (def.respondsTo ?? []).includes(itemType)
}

export function topOfChain(s: GameState): ChainItem | undefined {
  return s.chain[s.chain.length - 1]
}

/**
 * Who may answer this chain item right now.
 * - a defensive item can only be answered by the owner of the item it countered
 * - otherwise: the targeted players (config.responderScope 'targeted') or every other player ('all')
 * Players holding no card that could answer are left out (they auto-pass).
 */
function eligibleResponders(s: GameState, item: ChainItem): string[] {
  const itemType = getDef(s, item.defId).type
  let candidates: string[]
  if (itemType === 'defensive') candidates = item.counterOwnerId ? [item.counterOwnerId] : []
  else if (s.config.responderScope === 'all') candidates = alivePlayers(s).map((p) => p.id)
  else candidates = item.targets

  return [...new Set(candidates)].filter((id) => {
    const player = findPlayer(s, id)
    return (
      id !== item.ownerId &&
      player?.alive &&
      player.hand.some((card) => canRespondWith(getDef(s, card.defId), itemType))
    )
  })
}

/** Open a response window for the top item, or do nothing if nobody can respond. */
export function openResponseWindow(s: GameState): void {
  const top = topOfChain(s)
  const eligible = top ? eligibleResponders(s, top) : []
  s.pending = eligible.length
    ? { id: s.nextPendingId++, kind: 'response', eligible, passed: [], timeoutSec: s.config.responseWindowSec }
    : null
}

/** The window closes once every (still alive) eligible player has passed. */
export function closeResponseIfDone(s: GameState): boolean {
  const pending = s.pending
  if (pending?.kind !== 'response') return false
  if (!pending.eligible.every((id) => pending.passed.includes(id))) return false
  s.pending = null
  return true
}

function isFizzled(s: GameState, item: ChainItem): boolean {
  if (getDef(s, item.defId).type === 'defensive') return item.negatedFor.length > 0
  return item.targets.length > 0 && item.targets.every((id) => item.negatedFor.includes(id))
}

/** Resolve the newest chain item first (LIFO). Returns to the action phase when the chain is empty. */
export function resolveTopOfChain(s: GameState): void {
  const item = s.chain.pop()
  if (!item) {
    s.phase = 'action'
    return
  }
  const def = getDef(s, item.defId)
  s.discardPile.push(item.inst)
  if (isFizzled(s, item)) {
    addLog(s, 'fizzle', { actor: item.ownerId, card: def.id })
    return
  }
  queueEffects(s, def.effects, {
    sourceId: item.ownerId,
    targets: item.targets,
    targetCardId: item.targetCardId,
    excluded: item.negatedFor,
    defId: def.id,
    chainItemId: item.counterOf
  })
}
