import { describe, expect, it } from 'vitest'
import { dispatch, SYSTEM_PLAYER } from '../src'
import type { GameState } from '../src'
import { act, edit, giveHand, iidOf, newGame, play, player, reject, setHp, setMana } from './helpers'

/** What the server does when a decision runs out of time. */
function timeoutPending(state: GameState): GameState {
  const result = dispatch(state, SYSTEM_PLAYER, { type: 'timeout', pendingId: state.pending!.id })
  if (!result.ok) throw new Error(result.error)
  return result.state
}

describe('playing cards (R10, R11)', () => {
  it('pays mana, resolves the effect and discards the card', () => {
    let s = giveHand(setMana(newGame(), 'alice', 3), 'alice', ['null-pointer'])
    s = play(s, 'alice', 'null-pointer', { targets: ['bob'] })
    expect(player(s, 'bob').hp).toBe(7)
    expect(player(s, 'alice').mana).toBe(1)
    expect(s.discardPile.some((c) => c.defId === 'null-pointer')).toBe(true)
    expect(s.chain).toHaveLength(0)
  })

  it('refuses without enough mana and leaves the state untouched', () => {
    const s = giveHand(setMana(newGame(), 'alice', 1), 'alice', ['null-pointer'])
    const before = JSON.stringify(s)
    expect(
      reject(s, 'alice', { type: 'play_card', cardId: iidOf(s, 'alice', 'null-pointer'), targets: ['bob'] })
    ).toBe('INSUFFICIENT_MANA')
    expect(JSON.stringify(s)).toBe(before)
  })

  it('requires a matching card to discard as part of the cost (Merge Conflict)', () => {
    const base = setMana(newGame(), 'alice', 3)
    const wrong = giveHand(base, 'alice', ['merge-conflict', 'null-pointer', 'rubber-duck'])
    const id = iidOf(wrong, 'alice', 'merge-conflict')
    expect(reject(wrong, 'alice', { type: 'play_card', cardId: id, targets: ['bob'] })).toBe('COST_CARDS_REQUIRED')
    expect(
      reject(wrong, 'alice', {
        type: 'play_card',
        cardId: id,
        targets: ['bob'],
        costCardIds: [iidOf(wrong, 'alice', 'rubber-duck')]
      })
    ).toBe('COST_CARDS_MISMATCH')

    let ok = giveHand(base, 'alice', ['merge-conflict', 'null-pointer', 'rubber-duck'])
    ok = play(ok, 'alice', 'merge-conflict', { targets: ['bob'], costDefIds: ['null-pointer'] })
    expect(player(ok, 'bob').hp).toBe(8)
    expect(player(ok, 'alice').mana).toBe(2)
    expect(player(ok, 'alice').hand.map((c) => c.defId)).toEqual(['rubber-duck'])
  })

  it('cannot target yourself, a dead player or nobody with an opponent spell', () => {
    const s = giveHand(setMana(newGame(), 'alice', 3), 'alice', ['null-pointer'])
    const cardId = iidOf(s, 'alice', 'null-pointer')
    expect(reject(s, 'alice', { type: 'play_card', cardId, targets: ['alice'] })).toBe('BAD_TARGET')
    expect(reject(s, 'alice', { type: 'play_card', cardId })).toBe('BAD_TARGET')
    const dead = act(s, 'bob', { type: 'declare_ko' })
    expect(reject(dead, 'alice', { type: 'play_card', cardId, targets: ['bob'] })).toBe('BAD_TARGET')
  })

  it('cannot play a card that is not in your hand', () => {
    const s = newGame()
    expect(reject(s, 'alice', { type: 'play_card', cardId: 'nope', targets: ['bob'] })).toBe('CARD_NOT_IN_HAND')
    const bobsCard = player(s, 'bob').hand[0].iid
    expect(reject(s, 'alice', { type: 'play_card', cardId: bobsCard })).toBe('CARD_NOT_IN_HAND')
  })

  it('hits every opponent with an all-opponents spell, but not the caster', () => {
    let s = giveHand(setMana(newGame({ players: 4 }), 'alice', 4), 'alice', ['prod-fire'])
    s = play(s, 'alice', 'prod-fire')
    expect(s.players.map((p) => p.hp)).toEqual([10, 8, 8, 8])
  })

  it('applies artifact damage reduction and curse damage increase', () => {
    let s = giveHand(newGame(), 'bob', ['gaming-chair'])
    s = setMana(s, 'bob', 3)
    s = edit(s, (d) => {
      d.activeId = 'bob'
    })
    s = play(s, 'bob', 'gaming-chair')
    s = act(s, 'bob', { type: 'finish_turn' })
    s = giveHand(setMana(s, 'carol', 3), 'carol', ['null-pointer'])
    s = play(s, 'carol', 'null-pointer', { targets: ['bob'] })
    expect(player(s, 'bob').hp).toBe(8)
  })

  it('swaps hands (Context Switch)', () => {
    let s = giveHand(setMana(newGame(), 'alice', 2), 'alice', ['context-switch', 'rubber-duck'])
    s = giveHand(s, 'bob', ['null-pointer', 'null-pointer', 'null-pointer'])
    s = play(s, 'alice', 'context-switch', { targets: ['bob'] })
    expect(player(s, 'alice').hand).toHaveLength(3)
    expect(player(s, 'bob').hand.map((c) => c.defId)).toEqual(['rubber-duck'])
  })

  it('destroys an artifact (Spilled Coffee)', () => {
    let s = giveHand(newGame(), 'bob', ['gaming-chair'])
    s = setMana(s, 'bob', 3)
    s = edit(s, (d) => {
      d.activeId = 'bob'
    })
    s = play(s, 'bob', 'gaming-chair')
    const chair = player(s, 'bob').artifacts[0].iid
    s = act(s, 'bob', { type: 'finish_turn' })
    s = giveHand(setMana(s, 'carol', 2), 'carol', ['spilled-coffee'])
    s = play(s, 'carol', 'spilled-coffee', { targets: ['bob'], targetCardId: chair })
    expect(player(s, 'bob').artifacts).toHaveLength(0)
  })
})

describe('response windows and chains (R12)', () => {
  function setupAttack() {
    let s = giveHand(setMana(newGame(), 'alice', 2), 'alice', ['null-pointer'])
    s = setMana(giveHand(s, 'bob', ['try-catch', 'force-push']), 'bob', 3)
    return play(s, 'alice', 'null-pointer', { targets: ['bob'] })
  }

  it('opens a window for the targeted player who holds a defensive card', () => {
    const s = setupAttack()
    expect(s.pending).toMatchObject({ kind: 'response', eligible: ['bob'] })
    expect(player(s, 'bob').hp).toBe(10)
  })

  it('does not open a window when nobody can respond', () => {
    let s = giveHand(setMana(newGame(), 'alice', 2), 'alice', ['null-pointer'])
    s = giveHand(s, 'bob', ['rubber-duck'])
    s = play(s, 'alice', 'null-pointer', { targets: ['bob'] })
    expect(s.pending).toBeNull()
    expect(player(s, 'bob').hp).toBe(7)
  })

  it('resolves the attack when the defender passes', () => {
    const s = act(setupAttack(), 'bob', { type: 'pass_response' })
    expect(s.pending).toBeNull()
    expect(player(s, 'bob').hp).toBe(7)
    expect(s.phase).toBe('action')
  })

  it('cancels the attack with a defensive card played out of turn', () => {
    const s = play(setupAttack(), 'bob', 'try-catch')
    expect(s.pending).toBeNull()
    expect(player(s, 'bob').hp).toBe(10)
    expect(player(s, 'bob').mana).toBe(2)
    expect(s.chain).toHaveLength(0)
  })

  it('offers the attacker a window to answer a defence, and Force Push makes the attack land', () => {
    let s = giveHand(setMana(newGame(), 'alice', 4), 'alice', ['null-pointer', 'force-push'])
    s = setMana(giveHand(s, 'bob', ['try-catch']), 'bob', 1)
    s = play(s, 'alice', 'null-pointer', { targets: ['bob'] })
    s = play(s, 'bob', 'try-catch')
    expect(s.pending).toMatchObject({ kind: 'response', eligible: ['alice'] })
    expect(s.chain).toHaveLength(2)
    s = play(s, 'alice', 'force-push')
    expect(s.pending).toBeNull()
    expect(s.chain).toHaveLength(0)
    expect(player(s, 'bob').hp).toBe(7)
    expect(s.phase).toBe('action')
  })

  it('lets the attacker simply pass, so the defence stands', () => {
    let s = giveHand(setMana(newGame(), 'alice', 4), 'alice', ['null-pointer', 'force-push'])
    s = setMana(giveHand(s, 'bob', ['try-catch']), 'bob', 1)
    s = play(s, 'alice', 'null-pointer', { targets: ['bob'] })
    s = play(s, 'bob', 'try-catch')
    s = act(s, 'alice', { type: 'pass_response' })
    expect(player(s, 'bob').hp).toBe(10)
  })

  it('rejects out-of-turn plays that are not valid responses', () => {
    const s = setMana(giveHand(newGame(), 'bob', ['null-pointer']), 'bob', 5)
    expect(reject(s, 'bob', { type: 'play_card', cardId: iidOf(s, 'bob', 'null-pointer'), targets: ['carol'] })).toBe(
      'NOT_YOUR_TURN'
    )
    const attack = setupAttack()
    const carol = giveHand(attack, 'carol', ['try-catch'])
    expect(reject(carol, 'carol', { type: 'play_card', cardId: iidOf(carol, 'carol', 'try-catch') })).toBe(
      'NOT_ELIGIBLE_TO_RESPOND'
    )
    expect(reject(attack, 'alice', { type: 'finish_turn' })).toBe('DECISION_PENDING')
  })

  it('allows drinking inside the response window to afford a defence', () => {
    let s = giveHand(setMana(newGame(), 'alice', 2), 'alice', ['null-pointer'])
    s = giveHand(s, 'bob', ['try-catch'])
    s = play(s, 'alice', 'null-pointer', { targets: ['bob'] })
    s = act(s, 'bob', { type: 'drink' })
    s = play(s, 'bob', 'try-catch')
    expect(player(s, 'bob').hp).toBe(10)
  })

  it('only protects the responder when a spell hits several players', () => {
    let s = giveHand(setMana(newGame({ players: 4 }), 'alice', 4), 'alice', ['prod-fire'])
    s = setMana(giveHand(s, 'bob', ['try-catch']), 'bob', 1)
    s = play(s, 'alice', 'prod-fire')
    s = play(s, 'bob', 'try-catch')
    expect(s.players.map((p) => p.hp)).toEqual([10, 10, 8, 8])
  })

  it('treats a timeout as everyone passing', () => {
    const attack = setupAttack()
    expect(player(timeoutPending(attack), 'bob').hp).toBe(7)
  })
})

describe('mana shortfall and forced discard (R14, R15)', () => {
  it('asks the player to drink when a mana loss cannot be paid, and the drink pays it', () => {
    let s = giveHand(setMana(newGame(), 'alice', 2), 'alice', ['memory-leak'])
    s = setMana(s, 'bob', 1)
    s = play(s, 'alice', 'memory-leak', { targets: ['bob'] })
    expect(s.pending).toMatchObject({ kind: 'shortfall', playerId: 'bob', remaining: 2 })
    s = act(s, 'bob', { type: 'drink' })
    expect(s.pending).toBeNull()
    expect(player(s, 'bob').mana).toBe(1)
    expect(player(s, 'bob').hp).toBe(10)
  })

  it('costs HP equal to the missing mana when the player refuses', () => {
    let s = giveHand(setMana(newGame(), 'alice', 2), 'alice', ['memory-leak'])
    s = setMana(s, 'bob', 1)
    s = play(s, 'alice', 'memory-leak', { targets: ['bob'] })
    s = act(s, 'bob', { type: 'decline_shortfall' })
    expect(player(s, 'bob').hp).toBe(8)
    expect(player(s, 'bob').mana).toBe(0)
  })

  it('costs HP straight away when the bank has no mana to drink', () => {
    const emptyBank = edit(newGame({ config: { manaBankSize: 3 } }), (d) => {
      d.manaBank = 0
      d.queue.push({
        effect: { kind: 'loseMana', amount: 3, to: 'targets' },
        targetId: 'bob',
        ctx: { sourceId: 'alice', targets: ['bob'], excluded: [], defId: 'memory-leak', chainItemId: null }
      })
    })
    const s = act(emptyBank, 'alice', { type: 'finish_turn' })
    expect(s.pending).toBeNull()
    expect(player(s, 'bob').hp).toBe(7)
  })

  it('costs HP when the shortfall times out', () => {
    let s = giveHand(setMana(newGame(), 'alice', 2), 'alice', ['memory-leak'])
    s = play(s, 'alice', 'memory-leak', { targets: ['bob'] })
    s = timeoutPending(s)
    expect(player(s, 'bob').hp).toBe(7)
  })

  it('lets the victim choose which cards to discard', () => {
    let s = giveHand(setMana(newGame(), 'alice', 2), 'alice', ['code-freeze'])
    s = giveHand(s, 'bob', ['null-pointer', 'rubber-duck', 'copilot'])
    s = play(s, 'alice', 'code-freeze', { targets: ['bob'] })
    expect(s.pending).toMatchObject({ kind: 'discard', playerId: 'bob', count: 1 })
    expect(reject(s, 'bob', { type: 'choose_discard', cardIds: [] })).toBe('BAD_DISCARD_CHOICE')
    s = act(s, 'bob', { type: 'choose_discard', cardIds: [iidOf(s, 'bob', 'rubber-duck')] })
    expect(player(s, 'bob').hand.map((c) => c.defId)).toEqual(['null-pointer', 'copilot'])
    expect(player(s, 'bob').hp).toBe(8)
  })

  it('charges 1 mana per card that cannot be discarded (R14)', () => {
    let s = giveHand(setMana(newGame(), 'alice', 2), 'alice', ['scope-creep'])
    s = setMana(giveHand(s, 'bob', ['rubber-duck']), 'bob', 5)
    s = play(s, 'alice', 'scope-creep', { targets: ['bob'] })
    expect(player(s, 'bob').hand).toHaveLength(0)
    expect(player(s, 'bob').mana).toBe(4)
  })

  it('chains a discard shortfall into a drink prompt when out of mana too', () => {
    let s = giveHand(setMana(newGame(), 'alice', 2), 'alice', ['scope-creep'])
    s = giveHand(s, 'bob', [])
    s = play(s, 'alice', 'scope-creep', { targets: ['bob'] })
    expect(s.pending).toMatchObject({ kind: 'shortfall', playerId: 'bob', remaining: 2 })
  })
})

describe('elimination and winning (R17-R19)', () => {
  it('eliminates a player the moment HP hits 0, mid-turn', () => {
    let s = setHp(giveHand(setMana(newGame(), 'alice', 2), 'alice', ['null-pointer']), 'bob', 3)
    s = play(s, 'alice', 'null-pointer', { targets: ['bob'] })
    expect(player(s, 'bob')).toMatchObject({ alive: false, eliminatedBy: 'hp' })
    expect(player(s, 'bob').hand).toHaveLength(0)
    expect(s.finished).toBe(false)
    expect(s.phase).toBe('action')
  })

  it('lets a player declare KO and removes them from turn order', () => {
    let s = act(newGame({ players: 4 }), 'carol', { type: 'declare_ko' })
    expect(player(s, 'carol')).toMatchObject({ alive: false, eliminatedBy: 'ko' })
    s = act(s, 'alice', { type: 'finish_turn' })
    s = act(s, 'bob', { type: 'finish_turn' })
    expect(s.activeId).toBe('dave')
  })

  it('ends the game when one player is left', () => {
    let s = act(newGame(), 'bob', { type: 'declare_ko' })
    s = act(s, 'carol', { type: 'declare_ko' })
    expect(s.finished).toBe(true)
    expect(s.winnerId).toBe('alice')
    expect(s.eliminationOrder.map((e) => e.playerId)).toEqual(['bob', 'carol'])
    expect(reject(s, 'alice', { type: 'finish_turn' })).toBe('GAME_FINISHED')
  })

  it('moves to the next player when the active player dies on their own turn', () => {
    const s = act(newGame(), 'alice', { type: 'declare_ko' })
    expect(s.activeId).toBe('bob')
    expect(player(s, 'bob').hand).toHaveLength(5)
  })

  it('applies the optional potion limit KO rule', () => {
    let s = newGame({ config: { koMode: 'potion-limit', potionLimit: 2 } })
    s = act(s, 'bob', { type: 'drink' })
    s = act(s, 'bob', { type: 'drink' })
    expect(player(s, 'bob').alive).toBe(true)
    s = act(s, 'bob', { type: 'drink' })
    expect(player(s, 'bob')).toMatchObject({ alive: false, eliminatedBy: 'ko' })
  })

  it('lets a dead player no longer act', () => {
    const s = act(newGame({ players: 4 }), 'bob', { type: 'declare_ko' })
    expect(reject(s, 'bob', { type: 'drink' })).toBe('ELIMINATED')
  })
})

describe('statuses', () => {
  it('skips the next turn of a player hit by a 3-Hour Meeting', () => {
    let s = giveHand(setMana(newGame(), 'alice', 3), 'alice', ['three-hour-meeting'])
    s = play(s, 'alice', 'three-hour-meeting', { targets: ['bob'] })
    s = act(s, 'alice', { type: 'finish_turn' })
    expect(s.activeId).toBe('carol')
    s = act(s, 'carol', { type: 'finish_turn' })
    s = act(s, 'alice', { type: 'finish_turn' })
    expect(s.activeId).toBe('bob')
  })

  it('wears off a timed status after its duration', () => {
    let s = giveHand(setMana(newGame(), 'alice', 1), 'alice', ['dependency-lock'])
    s = play(s, 'alice', 'dependency-lock', { targets: ['bob'] })
    expect(player(s, 'bob').statuses).toHaveLength(1)
    for (let round = 0; round < 2; round++) {
      s = act(s, 'alice', { type: 'finish_turn' })
      s = act(s, 'bob', { type: 'finish_turn' })
      s = act(s, 'carol', { type: 'finish_turn' })
    }
    expect(player(s, 'bob').statuses).toHaveLength(0)
  })
})
