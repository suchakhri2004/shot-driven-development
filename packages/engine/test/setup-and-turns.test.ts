import { TEST_DECK } from '@sdd/cards'
import { createGame, projectFor } from '../src'
import { describe, expect, it } from 'vitest'
import { act, giveHand, iidOf, newGame, NAMES, play, player, reject, rigNextDraw, setMana } from './helpers'

describe('setup (R1-R3)', () => {
  it('starts every player with 10 HP, 0 mana and 5 cards', () => {
    const s = newGame({ players: 4 })
    for (const p of s.players) {
      expect(p.hp).toBe(10)
      expect(p.mana).toBe(0)
      expect(p.hand).toHaveLength(5)
    }
  })

  it('never deals an Event into a starting hand (R2)', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      const s = newGame({ players: 6, events: true, seed })
      const events = TEST_DECK.filter((c) => c.type === 'event').map((c) => c.id)
      for (const p of s.players) expect(p.hand.every((c) => !events.includes(c.defId))).toBe(true)
    }
  })

  it('the first player is the one we name', () => {
    const s = createGame({
      players: NAMES.slice(0, 3).map((id) => ({ id, name: id, avatar: 'a' })),
      cards: TEST_DECK,
      firstPlayerId: 'carol',
      config: { openingShot: false }
    })
    expect(s.activeId).toBe('carol')
    expect(s.phase).toBe('action')
  })
})

describe('opening shot (house rule H1)', () => {
  it('holds the first turn until everyone has drunk once, and gives +3 mana each', () => {
    let s = newGame({ players: 3, config: { openingShot: true } })
    expect(s.phase).toBe('opening_shot')
    s = act(s, 'alice', { type: 'drink' })
    s = act(s, 'bob', { type: 'drink' })
    expect(s.phase).toBe('opening_shot')
    s = act(s, 'carol', { type: 'drink' })
    expect(s.phase).toBe('action')
    expect(s.players.map((p) => p.mana)).toEqual([3, 3, 3])
  })

  it('does not allow a second opening drink', () => {
    let s = newGame({ players: 3, config: { openingShot: true } })
    s = act(s, 'alice', { type: 'drink' })
    expect(reject(s, 'alice', { type: 'drink' })).toBe('ALREADY_DRANK')
  })

  it('can be switched off to match the original rules exactly', () => {
    const s = newGame({ players: 3, config: { openingShot: false } })
    expect(s.players.every((p) => p.mana === 0)).toBe(true)
  })
})

describe('drinking (R4-R6)', () => {
  it('gives 3 mana and works at any time, even out of turn', () => {
    let s = newGame()
    expect(s.activeId).toBe('alice')
    s = act(s, 'bob', { type: 'drink' })
    expect(player(s, 'bob').mana).toBe(3)
    expect(player(s, 'bob').potionsDrunk).toBe(1)
  })

  it('has no mana cap', () => {
    let s = newGame()
    for (let i = 0; i < 10; i++) s = act(s, 'alice', { type: 'drink' })
    expect(player(s, 'alice').mana).toBe(30)
  })

  it('gives nothing once the bank is empty (R6)', () => {
    let s = newGame({ config: { manaBankSize: 4 } })
    s = act(s, 'alice', { type: 'drink' })
    expect(player(s, 'alice').mana).toBe(3)
    s = act(s, 'bob', { type: 'drink' })
    expect(player(s, 'bob').mana).toBe(1)
    expect(s.manaBank).toBe(0)
    expect(reject(s, 'carol', { type: 'drink' })).toBe('BANK_EMPTY')
  })

  it('applies potion yield modifiers from artifacts', () => {
    let s = newGame()
    s = giveHand(s, 'alice', ['mechanical-keyboard'])
    s = setMana(s, 'alice', 2)
    s = play(s, 'alice', 'mechanical-keyboard')
    s = act(s, 'alice', { type: 'drink' })
    expect(player(s, 'alice').mana).toBe(4)
  })
})

describe('turn order and drawing (R3, R7, R8)', () => {
  it('passes the turn clockwise and refills the hand to 5', () => {
    let s = newGame()
    s = act(s, 'alice', { type: 'discard_card', cardId: player(s, 'alice').hand[0].iid })
    s = act(s, 'alice', { type: 'finish_turn' })
    expect(s.activeId).toBe('bob')
    expect(player(s, 'bob').hand).toHaveLength(5)
    s = act(s, 'bob', { type: 'finish_turn' })
    s = act(s, 'carol', { type: 'finish_turn' })
    expect(s.activeId).toBe('alice')
    expect(player(s, 'alice').hand).toHaveLength(5)
  })

  it('skips eliminated players', () => {
    let s = newGame({ players: 4 })
    s = act(s, 'bob', { type: 'declare_ko' })
    s = act(s, 'alice', { type: 'finish_turn' })
    expect(s.activeId).toBe('carol')
  })

  it('rejects actions from the wrong player', () => {
    const s = newGame()
    expect(reject(s, 'bob', { type: 'finish_turn' })).toBe('NOT_YOUR_TURN')
    expect(reject(s, 'bob', { type: 'discard_card', cardId: player(s, 'bob').hand[0].iid })).toBe('NOT_YOUR_TURN')
  })

  it('draws up to a raised hand limit (Ultrawide Monitor)', () => {
    let s = newGame()
    s = giveHand(s, 'alice', ['ultrawide-monitor'])
    s = setMana(s, 'alice', 2)
    s = play(s, 'alice', 'ultrawide-monitor')
    s = act(s, 'alice', { type: 'finish_turn' })
    s = act(s, 'bob', { type: 'finish_turn' })
    s = act(s, 'carol', { type: 'finish_turn' })
    expect(player(s, 'alice').hand).toHaveLength(6)
  })

  it('resolves a drawn Event immediately and draws a replacement (R8)', () => {
    let s = rigNextDraw(newGame({ events: true }), 'bob', 'prod-down')
    const before = player(s, 'bob').hp
    s = act(s, 'alice', { type: 'finish_turn' })
    expect(s.activeId).toBe('bob')
    expect(player(s, 'bob').hp).toBe(before - 1)
    expect(player(s, 'alice').hp).toBe(9)
    expect(player(s, 'bob').hand).toHaveLength(5)
    expect(s.discardPile.some((c) => c.defId === 'prod-down')).toBe(true)
  })

  it('keeps a timed Event on the table and applies its modifier, then removes it', () => {
    let s = rigNextDraw(newGame({ events: true }), 'bob', 'freeze-week')
    s = act(s, 'alice', { type: 'finish_turn' })
    expect(s.tableEvents).toHaveLength(1)
    expect(projectFor(s, 'bob').handLimit).toBe(4)
    expect(player(s, 'bob').hand).toHaveLength(4)
    for (let i = 0; i < 4; i++) s = act(s, s.activeId, { type: 'finish_turn' })
    expect(s.tableEvents).toHaveLength(0)
  })
})

describe('exchanging cards (R13)', () => {
  it('costs 1, then 2, then 3 mana in the same turn', () => {
    let s = newGame()
    s = setMana(s, 'alice', 6)
    for (let n = 1; n <= 3; n++) {
      expect(projectFor(s, 'alice').exchangeCost).toBe(n)
      s = act(s, 'alice', { type: 'exchange_card', cardId: player(s, 'alice').hand[0].iid })
    }
    expect(player(s, 'alice').mana).toBe(0)
    expect(player(s, 'alice').hand).toHaveLength(5)
  })

  it('refuses when mana is short and resets next turn', () => {
    let s = newGame()
    s = setMana(s, 'alice', 1)
    s = act(s, 'alice', { type: 'exchange_card', cardId: player(s, 'alice').hand[0].iid })
    s = setMana(s, 'alice', 1)
    expect(reject(s, 'alice', { type: 'exchange_card', cardId: player(s, 'alice').hand[0].iid })).toBe(
      'INSUFFICIENT_MANA'
    )
    s = act(s, 'alice', { type: 'finish_turn' })
    s = act(s, 'bob', { type: 'finish_turn' })
    s = act(s, 'carol', { type: 'finish_turn' })
    expect(s.exchangeCount).toBe(0)
    expect(projectFor(s, 'alice').exchangeCost).toBe(1)
  })

  it('spent mana returns to the bank', () => {
    let s = newGame({ config: { manaBankSize: 10 } })
    s = act(s, 'alice', { type: 'drink' })
    expect(s.manaBank).toBe(7)
    s = act(s, 'alice', { type: 'exchange_card', cardId: player(s, 'alice').hand[0].iid })
    expect(s.manaBank).toBe(8)
  })
})

describe('information hiding', () => {
  it('shows opponents only as a card count', () => {
    const s = newGame()
    const view = projectFor(s, 'alice')
    expect(view.hand).toHaveLength(5)
    expect(view.players.find((p) => p.id === 'bob')!.handCount).toBe(5)
    expect(JSON.stringify(view)).not.toContain(player(s, 'bob').hand[0].iid)
    expect('drawPile' in view).toBe(false)
  })

  it('marks cards the viewer cannot play right now', () => {
    let s = newGame()
    s = giveHand(s, 'bob', ['null-pointer'])
    const bobView = projectFor(s, 'bob')
    expect(bobView.hand[0]).toMatchObject({ playable: false, reason: 'NOT_YOUR_TURN' })
    s = giveHand(s, 'alice', ['null-pointer'])
    expect(projectFor(s, 'alice').hand[0]).toMatchObject({ playable: false, reason: 'INSUFFICIENT_MANA', shortBy: 2 })
    expect(projectFor(setMana(s, 'alice', 2), 'alice').hand[0].playable).toBe(true)
  })

  it('exposes a stable card id for Merge Conflict style costs', () => {
    const s = giveHand(newGame(), 'alice', ['merge-conflict', 'null-pointer'])
    expect(iidOf(s, 'alice', 'merge-conflict')).toBeTruthy()
  })
})
