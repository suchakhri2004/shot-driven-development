import { DECK } from '@sdd/cards'
import type { GameStatePayload } from '@sdd/protocol'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GameSession } from '../src/game/game-session'

const IDS = ['alice', 'bob', 'carol']

function makeSession(connected: Record<string, boolean> = {}) {
  const sent: Array<{ to: string; payload: GameStatePayload }> = []
  const session = new GameSession(
    {
      players: IDS.map((id) => ({ id, name: id, avatar: 'a' })),
      cards: DECK.map((c) => (c.type === 'defensive' || c.type === 'event' ? { ...c, copies: 0 } : c)),
      config: { openingShot: false, shortfallSec: 5, responseWindowSec: 5 },
      seed: 'timers'
    },
    {
      send: (to, payload) => sent.push({ to, payload }),
      isConnected: (id) => connected[id] ?? true,
      onFinished: () => undefined
    },
    60
  )
  return { session, sent }
}

/** Hand alice a Memory Leak and enough mana, bob an empty hand and no mana. */
function rigMemoryLeak(session: GameSession) {
  const s = session.state
  s.players[0].hand = [{ iid: 'rigged', defId: 'memory-leak' }]
  s.players[0].mana = 2
  s.players[1].hand = []
  s.players[1].mana = 0
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('server-side timers', () => {
  it('makes a player lose HP when a mana shortfall runs out of time', () => {
    const { session } = makeSession()
    rigMemoryLeak(session)
    session.start()
    session.handleAction('alice', 'a1', { type: 'play_card', cardId: 'rigged', targets: ['bob'] })
    expect(session.state.pending).toMatchObject({ kind: 'shortfall', playerId: 'bob', remaining: 3 })

    vi.advanceTimersByTime(4900)
    expect(session.state.pending).not.toBeNull()
    vi.advanceTimersByTime(200)
    expect(session.state.pending).toBeNull()
    expect(session.state.players[1].hp).toBe(7)
    session.stop()
  })

  it('does not time out a decision the player already made', () => {
    const { session } = makeSession()
    rigMemoryLeak(session)
    session.start()
    session.handleAction('alice', 'a1', { type: 'play_card', cardId: 'rigged', targets: ['bob'] })
    expect(session.handleAction('bob', 'b1', { type: 'drink' })).toEqual({ ok: true })
    vi.advanceTimersByTime(10_000)
    expect(session.state.players[1].hp).toBe(10)
    session.stop()
  })

  it('tells clients when the current decision expires', () => {
    const { session, sent } = makeSession()
    rigMemoryLeak(session)
    session.start()
    sent.length = 0
    session.handleAction('alice', 'a1', { type: 'play_card', cardId: 'rigged', targets: ['bob'] })
    const payload = sent.find((m) => m.to === 'carol')!.payload
    expect(payload.deadlineAt).toBe(payload.serverNow + 5000)
    session.stop()
  })

  it('plays finish_turn for a disconnected active player after the grace period', () => {
    const connected = { alice: false }
    const { session } = makeSession(connected)
    session.start()
    expect(session.state.activeId).toBe('alice')
    vi.advanceTimersByTime(59_000)
    expect(session.state.activeId).toBe('alice')
    vi.advanceTimersByTime(2000)
    expect(session.state.activeId).toBe('bob')
    session.stop()
  })

  it('cancels the auto move when the player comes back in time', () => {
    const connected: Record<string, boolean> = { alice: false }
    const { session } = makeSession(connected)
    session.start()
    vi.advanceTimersByTime(30_000)
    connected.alice = true
    session.onConnectionChange()
    vi.advanceTimersByTime(120_000)
    expect(session.state.activeId).toBe('alice')
    session.stop()
  })

  it('holds a coffee break until its owner, the host or the 10 minute timer ends it', () => {
    const { session } = makeSession({ alice: false })
    const s = session.state
    s.players[0].hand = [{ iid: 'brk', defId: 'coffee-break' }]
    session.start()
    // alice is offline but the break must not be skipped by her auto move
    session.handleAction('alice', 'a1', { type: 'play_card', cardId: 'brk' })
    expect(session.state.pending).toMatchObject({ kind: 'interlude', mode: 'pause' })
    vi.advanceTimersByTime(599_000)
    expect(session.state.pending?.kind).toBe('interlude')
    vi.advanceTimersByTime(2000)
    expect(session.state.pending).toBeNull()

    session.state.players[0].hand = [{ iid: 'brk2', defId: 'coffee-break' }]
    session.handleAction('alice', 'a2', { type: 'play_card', cardId: 'brk2' })
    expect(session.endInterlude()).toEqual({ ok: true })
    expect(session.state.pending).toBeNull()
    expect(session.endInterlude()).toMatchObject({ ok: false, error: 'NO_INTERLUDE' })
    session.stop()
  })

  it('answers a repeated actionId with the original result and does not act twice', () => {
    const { session } = makeSession()
    const first = session.handleAction('bob', 'dup-1', { type: 'drink' })
    const mana = session.state.players[1].mana
    expect(session.handleAction('bob', 'dup-1', { type: 'drink' })).toEqual(first)
    expect(session.state.players[1].mana).toBe(mana)
    session.stop()
  })
})
