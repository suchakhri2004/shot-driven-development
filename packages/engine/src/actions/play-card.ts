import { openResponseWindow, topOfChain } from '../chain'
import { GameError } from '../errors'
import { addLog, emit } from '../log'
import { getDef, removeFromHand } from '../lookup'
import { spendMana } from '../resources'
import { assertPlayWindow, validateCostCards, validateTargets } from '../validation'
import type { GameState, PlayerState } from '../types'

interface PlayCardAction {
  cardId: string
  targets?: string[]
  targetCardId?: string
  costCardIds?: string[]
}

/**
 * R10: lay the card down, pay the cost, pick targets, then resolve.
 * Validation happens first so a rejected play never changes state.
 */
export function playCard(s: GameState, player: PlayerState, action: PlayCardAction): void {
  const inst = player.hand.find((c) => c.iid === action.cardId)
  if (!inst) throw new GameError('CARD_NOT_IN_HAND')
  const def = getDef(s, inst.defId)

  const window = assertPlayWindow(s, player, def)
  const { targets, targetCardId } = validateTargets(s, player, def, action)
  if (player.mana < def.cost.mana) throw new GameError('INSUFFICIENT_MANA', String(def.cost.mana - player.mana))
  const costCards = validateCostCards(s, player, def, inst, action.costCardIds ?? [])
  const answered = window === 'response' ? topOfChain(s) : undefined

  removeFromHand(player, inst.iid)
  spendMana(s, player, def.cost.mana)
  for (const card of costCards) {
    removeFromHand(player, card.iid)
    s.discardPile.push(card)
  }
  addLog(s, 'play', { actor: player.id, card: def.id, target: targets[0] })
  emit(s, { kind: 'play', owner: player.id, defId: def.id, targets })

  if (def.type === 'artifact') {
    player.artifacts.push(inst)
    return
  }

  s.chain.push({
    id: s.nextChainId++,
    inst,
    defId: def.id,
    ownerId: player.id,
    targets,
    targetCardId,
    negatedFor: [],
    counterOf: answered?.id ?? null,
    counterOwnerId: answered?.ownerId ?? null
  })
  s.phase = 'resolve'
  openResponseWindow(s)
}
