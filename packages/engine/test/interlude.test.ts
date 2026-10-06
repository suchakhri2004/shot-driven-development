import { DECK, TEST_DECK } from '@sdd/cards'
import { describe, expect, it } from 'vitest'
import { createGame, dispatch, SYSTEM_PLAYER } from '../src'
import type { GameConfig, GameState } from '../src'
import { act, giveHand, NAMES, play, player, reject, rigNextDraw, setMana } from './helpers'

const HOUSE = DECK.filter((c) => c.house)

/** Like newGame(), plus the coffee break and mini-game definitions (0 copies: tests hand them out). */
function houseGame(config: Partial<GameConfig> = {}, manaBankSize: number | null = null): GameState {
  const base = TEST_DECK.map((c) => (c.type === 'defensive' || c.type === 'event' ? { ...c, copies: 0 } : c))
  return createGame({
    players: NAMES.slice(0, 3).map((id) => ({ id, name: id, avatar: 'a' })),
    cards: [...base, ...HOUSE.map((c) => ({ ...c, copies: 0 }))],
    config: { openingShot: false, manaBankSize, ...config },
    seed: 'house'
  })
}

function timeout(state: GameState): GameState {
  const result = dispatch(state, SYSTEM_PLAYER, { type: 'timeout', pendingId: state.pending!.id })
  if (!result.ok) throw new Error(result.error)
  return result.state
}

describe('coffee break (house rule H3)', () => {
  const paused = () => play(giveHand(houseGame(), 'alice', ['coffee-break', 'null-pointer']), 'alice', 'coffee-break')

  it('stops the game until the player who played it ends the break', () => {
    let s = paused()
    expect(s.pending).toMatchObject({ kind: 'interlude', mode: 'pause', playerId: 'alice', timeoutSec: 600 })
    expect(reject(s, 'alice', { type: 'finish_turn' })).toBe('DECISION_PENDING')
    expect(reject(s, 'bob', { type: 'end_interlude' })).toBe('NOT_INTERLUDE_OWNER')
    expect(reject(s, 'bob', { type: 'take_drink' })).toBe('NO_DRINK_CALL')

    s = act(s, 'alice', { type: 'end_interlude' })
    expect(s.pending).toBeNull()
    expect(s.phase).toBe('action')
    expect(s.activeId).toBe('alice')
    s = setMana(s, 'alice', 2)
    s = play(s, 'alice', 'null-pointer', { targets: ['bob'] })
    expect(player(s, 'bob').hp).toBe(7)
  })

  it('ends by itself when the timer runs out', () => {
    const s = timeout(paused())
    expect(s.pending).toBeNull()
    expect(s.log.map((l) => l.kind)).toContain('pause_end')
  })
})

describe('mini-game (house rule H3)', () => {
  const started = (bank: number | null = null) => {
    let s = houseGame({}, bank)
    s = setMana(giveHand(s, 'alice', ['hackathon']), 'alice', 1)
    if (bank !== null) s = { ...s, manaBank: bank - 1 }
    return play(s, 'alice', 'hackathon')
  }

  it('picks a mini-game and takes Shot Stack from each loser once', () => {
    let s = started()
    expect(s.pending).toMatchObject({ kind: 'interlude', mode: 'minigame', playerId: 'alice', losers: [] })
    expect(s.pending?.kind === 'interlude' && Number.isInteger(s.pending.roll)).toBe(true)

    s = setMana(setMana(s, 'bob', 5), 'carol', 2)
    const result = dispatch(s, 'bob', { type: 'take_drink' })
    expect(result.ok && result.fx).toEqual([{ kind: 'penalty_drink', target: 'bob', amount: 3 }])
    s = act(s, 'bob', { type: 'take_drink' })
    s = act(s, 'carol', { type: 'take_drink' })
    expect(player(s, 'bob').mana).toBe(2)
    expect(player(s, 'carol').mana).toBe(0)
    expect(reject(s, 'bob', { type: 'take_drink' })).toBe('ALREADY_TOOK_DRINK')

    s = act(s, 'alice', { type: 'end_interlude' })
    expect(s.pending).toBeNull()
    expect(reject(s, 'carol', { type: 'take_drink' })).toBe('NO_DRINK_CALL')
  })

  it('returns lost Shot Stack to the bank', () => {
    let s = started(30)
    s = setMana(s, 'bob', 4)
    const before = s.manaBank!
    s = act(s, 'bob', { type: 'take_drink' })
    expect(s.manaBank).toBe(before + 3)
  })
})

describe('switching house cards off', () => {
  it('leaves them out of the deck', () => {
    const deck = (houseCards: boolean) =>
      createGame({ players: NAMES.slice(0, 3).map((id) => ({ id, name: id, avatar: 'a' })), cards: DECK, config: { houseCards } })
    const all = (s: GameState) => [...s.drawPile, ...s.discardPile, ...s.players.flatMap((p) => p.hand)].map((c) => c.defId)

    expect(all(deck(true)).filter((id) => id === 'coffee-break' || id === 'hackathon')).toHaveLength(6)
    expect(all(deck(false)).some((id) => id === 'coffee-break' || id === 'hackathon')).toBe(false)
    expect(deck(false).defs['hackathon']).toBeUndefined()
  })
})

describe('drinking house rules', () => {
  it('Last Call: whoever it applies to drinks once, gains nothing, and the game resumes after', () => {
    let s = setMana(rigNextDraw(houseGame(), 'bob', 'last-call'), 'bob', 2)
    // alice ends her turn, bob draws the Last Call at the start of his
    s = act(s, 'alice', { type: 'finish_turn' })
    expect(s.pending).toMatchObject({ kind: 'interlude', mode: 'drinkcall', playerId: 'bob', timeoutSec: 60 })
    s = act(s, 'carol', { type: 'take_drink' })
    s = act(s, 'bob', { type: 'take_drink' })
    expect(player(s, 'bob').mana).toBe(2)
    expect(player(s, 'carol').potionsDrunk).toBe(1)
    expect(reject(s, 'carol', { type: 'take_drink' })).toBe('ALREADY_TOOK_DRINK')
    s = timeout(s)
    expect(s.pending).toBeNull()
    expect(s.activeId).toBe('bob')
  })

  it('git blame: the target drinks and loses 3 Shot Stack', () => {
    let s = setMana(giveHand(houseGame(), 'alice', ['git-blame']), 'alice', 1)
    s = setMana(s, 'bob', 5)
    const result = dispatch(s, 'alice', { type: 'play_card', cardId: s.players[0].hand[0].iid, targets: ['bob'] })
    expect(result.ok && result.fx.filter((f) => f.kind === 'penalty_drink')).toEqual([{ kind: 'penalty_drink', target: 'bob', amount: 3 }])
    s = play(s, 'alice', 'git-blame', { targets: ['bob'] })
    expect(player(s, 'bob').mana).toBe(2)
    expect(player(s, 'bob').potionsDrunk).toBe(1)
  })

  it('going out costs 2 real shots (none with knockoutShots 0)', () => {
    const out = act(houseGame(), 'bob', { type: 'declare_ko' })
    expect(player(out, 'bob').potionsDrunk).toBe(2)
    expect(out.log.at(-1)).toMatchObject({ kind: 'eliminated', target: 'bob', amount: 2 })
    expect(player(act(houseGame({ knockoutShots: 0 }), 'bob', { type: 'declare_ko' }), 'bob').potionsDrunk).toBe(0)
  })
})
