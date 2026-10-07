import { DECK, TEST_DECK } from '@sdd/cards'
import { createGame, dispatch, projectFor } from '../src'
import type { CardDef, GameState } from '../src'
import { describe, expect, it } from 'vitest'
import { NAMES, totalCards } from './helpers'
import { nextRandomMove } from './random-player'

const MAX_ACTIONS = 5000

function checkInvariants(s: GameState, deckSize: number, bankSize: number | null): void {
  expect(totalCards(s)).toBe(deckSize)
  for (const p of s.players) {
    expect(p.hp).toBeLessThanOrEqual(s.config.maxHp)
    expect(p.mana).toBeGreaterThanOrEqual(0)
    if (!p.alive) {
      expect(p.hand).toHaveLength(0)
      expect(p.artifacts).toHaveLength(0)
    }
  }
  if (bankSize !== null) expect(s.manaBank! + s.players.reduce((n, p) => n + p.mana, 0)).toBe(bankSize)
  const pending = s.pending
  if (pending?.kind === 'response') {
    expect(pending.eligible.length).toBeGreaterThan(0)
    expect(pending.eligible.some((id) => !pending.passed.includes(id))).toBe(true)
  }
  if (!s.pending && s.phase === 'action') {
    expect(s.chain).toHaveLength(0)
    expect(s.queue).toHaveLength(0)
  }
}

function checkNoLeak(s: GameState): void {
  for (const viewer of s.players) {
    const view = JSON.stringify(projectFor(s, viewer.id))
    for (const other of s.players) {
      if (other.id === viewer.id) continue
      for (const card of other.hand) expect(view).not.toContain(`"${card.iid}"`)
    }
  }
}

function playRandomGame(deck: CardDef[], playerCount: number, seed: string, bankSize: number | null) {
  let s = createGame({
    players: NAMES.slice(0, playerCount).map((id) => ({ id, name: id, avatar: 'a' })),
    cards: deck,
    config: { manaBankSize: bankSize },
    seed
  })
  const deckSize = totalCards(s)
  const rng = { rng: Number.parseInt(seed.replace(/\D/g, '') || '1', 10) * 7919 }
  let actionsThisTurn = 0
  let lastTurn = s.turnNumber
  let actions = 0
  let rejected = 0

  while (!s.finished && actions < MAX_ACTIONS) {
    if (s.turnNumber !== lastTurn) {
      lastTurn = s.turnNumber
      actionsThisTurn = 0
    }
    const move = nextRandomMove(s, rng, actionsThisTurn)
    const result = dispatch(s, move.playerId, move.action)
    actions++
    actionsThisTurn++
    if (!result.ok) {
      rejected++
      // a random move can be illegal (e.g. mana spent in the meantime): the engine must say so and not change state
      const fallback = dispatch(s, s.activeId, { type: 'finish_turn' })
      if (fallback.ok) s = fallback.state
      else {
        const pass = s.pending?.kind === 'response' ? dispatch(s, s.pending.eligible[0], { type: 'pass_response' }) : fallback
        if (pass.ok) s = pass.state
      }
      continue
    }
    expect(result.state.version).toBe(s.version + 1)
    s = result.state
    checkInvariants(s, deckSize, bankSize)
    if (actions % 10 === 0) checkNoLeak(s)
  }
  return { s, actions, rejected }
}

const DECKS = { 'test deck': TEST_DECK, 'playable deck': DECK }

for (const [deckName, deck] of Object.entries(DECKS)) {
  describe(`random full games with the ${deckName}`, () => {
    for (const players of [2, 3, 4, 6, 8, 10]) {
      for (const [seed, bank] of [
        ['1', null],
        ['2', null],
        ['3', 30],
        ['4', 20]
      ] as const) {
        it(`${players} players, seed ${seed}, bank ${bank ?? 'unlimited'}: plays to a winner without breaking rules`, () => {
          const { s, actions } = playRandomGame(deck, players, seed, bank)
          expect(s.finished, `unfinished after ${actions} actions`).toBe(true)
          const alive = s.players.filter((p) => p.alive)
          expect(alive.length).toBeLessThanOrEqual(1)
          expect(s.winnerId).toBe(alive[0]?.id ?? null)
          expect(s.eliminationOrder.length).toBe(players - alive.length)
        })
      }
    }
  })
}
