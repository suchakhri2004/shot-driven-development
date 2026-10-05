import type { CardDef, DiscardCost } from '@sdd/engine'

export function costSlots(def: CardDef): DiscardCost[] {
  return (def.cost.discard ?? []).flatMap((c) => Array.from({ length: c.count }, () => c))
}

export function matchesSlot(slot: DiscardCost, card: CardDef): boolean {
  return (!slot.element || card.element === slot.element) && (!slot.type || card.type === slot.type)
}

/** Can every discard requirement be paid by a distinct card among `cards`? */
export function canPayDiscard(slots: DiscardCost[], cards: CardDef[]): boolean {
  const used = cards.map(() => false)
  const assign = (i: number): boolean => {
    if (i === slots.length) return true
    for (let c = 0; c < cards.length; c++) {
      if (used[c] || !matchesSlot(slots[i], cards[c])) continue
      used[c] = true
      if (assign(i + 1)) return true
      used[c] = false
    }
    return false
  }
  return assign(0)
}

export const needsPlayerTarget = (def: CardDef) =>
  def.target === 'one-opponent' || def.target === 'any-player' || def.target === 'artifact'
