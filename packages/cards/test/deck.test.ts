import { describe, expect, it } from 'vitest'
import { DECK } from '../src'

const total = (cards: typeof DECK) => cards.reduce((n, c) => n + c.copies, 0)

describe('playable deck integrity', () => {
  it('has unique card ids and sensible size', () => {
    const ids = DECK.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(total(DECK)).toBe(90)
    expect(DECK.every((c) => c.copies >= 1 && c.source === 'house-original' && !c.needsConfirmation)).toBe(true)
  })

  it('has about one Incident in ten cards and a healthy share of defences', () => {
    const share = (type: string) => total(DECK.filter((c) => c.type === type)) / total(DECK)
    expect(share('event')).toBeGreaterThanOrEqual(0.08)
    expect(share('event')).toBeLessThanOrEqual(0.12)
    expect(share('defensive')).toBeGreaterThanOrEqual(0.12)
    expect(share('offensive')).toBeGreaterThan(0.25)
  })

  it('keeps costs in a playable range', () => {
    for (const card of DECK) {
      expect(card.cost.mana, card.id).toBeGreaterThanOrEqual(0)
      expect(card.cost.mana, card.id).toBeLessThanOrEqual(4)
    }
  })

  it('has enough cards of an element to pay every "discard a <element>" cost', () => {
    const elementCopies = (element: string) => total(DECK.filter((c) => c.element === element))
    for (const card of DECK) {
      for (const slot of card.cost.discard ?? []) {
        if (slot.element) expect(elementCopies(slot.element), card.id).toBeGreaterThanOrEqual(slot.count + 4)
      }
    }
  })

  it('wires targets and effects consistently', () => {
    for (const card of DECK) {
      const kinds = card.effects.map((e) => e.kind)
      const usesTargets = card.effects.some((e) => 'to' in e && e.to === 'targets')

      if (usesTargets) expect(['one-opponent', 'any-player'], card.id).toContain(card.target)
      if (kinds.includes('swapHands')) expect(card.target, card.id).toBe('one-opponent')
      expect(kinds.includes('destroyArtifact'), card.id).toBe(card.target === 'artifact')
      expect(kinds.includes('counter'), card.id).toBe(card.type === 'defensive')
      if (card.target === 'all-opponents') expect(card.type, card.id).toBe('offensive')
    }
  })

  it('defines each type completely', () => {
    for (const card of DECK) {
      if (card.type === 'defensive') {
        expect(card.respondsTo?.length, card.id).toBeGreaterThan(0)
        expect(card.target).toBe('none')
      }
      if (card.type === 'offensive') expect(card.element, card.id).toBeDefined()
      if (card.type === 'artifact') {
        expect(card.modifiers?.length, card.id).toBeGreaterThan(0)
        expect(card.effects).toHaveLength(0)
        expect(card.target).toBe('none')
      }
      if (card.type === 'event') {
        expect(card.cost.mana).toBe(0)
        expect(card.target).toBe('all-players')
        expect(card.effects.every((e) => 'to' in e && e.to === 'all-players') || card.modifiers?.length).toBeTruthy()
        if (card.duration) expect(card.modifiers?.length, card.id).toBeGreaterThan(0)
      }
      expect(card.description.length, card.id).toBeGreaterThan(0)
    }
  })

  it('gives every attack, curse and artifact something to say out loud (incantation)', () => {
    for (const card of DECK.filter((c) => ['offensive', 'curse', 'artifact', 'defensive', 'support'].includes(c.type))) {
      expect(card.incantation, card.id).toBeTruthy()
    }
  })
})
