import { describe, expect, it } from 'vitest'
import { buildDeck, DECK, DRINK_CALLS, MINI_GAMES, MODES, resizeDeck } from '../src'

const total = (cards: typeof DECK) => cards.reduce((n, c) => n + c.copies, 0)

describe('playable deck integrity', () => {
  it('has unique card ids and sensible size', () => {
    const ids = DECK.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(total(DECK.filter((c) => !c.house))).toBe(90)
    expect(total(DECK.filter((c) => c.house))).toBe(18)
    expect(DECK.every((c) => c.copies >= 1 && c.source === 'house-original' && !c.needsConfirmation)).toBe(true)
  })

  it('has about one Incident in ten cards and a healthy share of defences', () => {
    const base = DECK.filter((c) => !c.house)
    const share = (type: string) => total(base.filter((c) => c.type === type)) / total(base)
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
        const hitsEveryone = card.effects.every((e) => ('to' in e && e.to === 'all-players') || e.kind === 'interlude')
        expect(hitsEveryone || card.modifiers?.length).toBeTruthy()
        if (card.duration) expect(card.modifiers?.length, card.id).toBeGreaterThan(0)
      }
      expect(card.description.length, card.id).toBeGreaterThan(0)
    }
  })

  it('keeps the coffee break, mini-games and drink calls as switchable house cards', () => {
    for (const card of DECK.filter((c) => c.effects.some((e) => e.kind === 'interlude'))) {
      expect(card.house, card.id).toBe(true)
      expect(card.target, card.id).toBe(card.type === 'event' ? 'all-players' : 'none')
    }
    expect(MINI_GAMES.length).toBeGreaterThanOrEqual(15)
    expect(new Set(MINI_GAMES.map((g) => g.id)).size).toBe(MINI_GAMES.length)
    expect(DRINK_CALLS.length).toBeGreaterThanOrEqual(30)
    expect(new Set(DRINK_CALLS.map((g) => g.id)).size).toBe(DRINK_CALLS.length)
  })

  it('gives every attack, curse and artifact something to say out loud (incantation)', () => {
    for (const card of DECK.filter((c) => ['offensive', 'curse', 'artifact', 'defensive', 'support'].includes(c.type))) {
      expect(card.incantation, card.id).toBeTruthy()
    }
  })
})

describe('modes and table-sized decks', () => {
  it('puts more drinking into harsher modes and none into classic', () => {
    const drinkCards = (mode: (typeof MODES)[number]['id']) =>
      total(buildDeck(mode, 4).filter((c) => c.id === 'last-call' || c.id === 'git-blame')) / total(buildDeck(mode, 4))
    expect(drinkCards('classic')).toBe(0)
    expect(drinkCards('party')).toBeLessThan(drinkCards('heavy'))
    expect(drinkCards('heavy')).toBeLessThan(drinkCards('hardcore'))
    expect(MODES.map((m) => m.heat)).toEqual([1, 2, 3, 4, 5])
  })

  it('resizes a deck to the exact size and keeps every card in it', () => {
    const deck = buildDeck('party', 4)
    for (const size of [60, 100, 180]) {
      const resized = resizeDeck(deck, size)
      expect(total(resized)).toBe(size)
      expect(resized.every((c) => c.copies >= 1)).toBe(true)
    }
  })
})
