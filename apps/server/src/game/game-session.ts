import { createGame, dispatch, projectFor, SYSTEM_PLAYER } from '@sdd/engine'
import type { Action, CreateGameOptions, Fx, GameState } from '@sdd/engine'
import type { Ack, GameStatePayload } from '@sdd/protocol'

export interface GameSessionHooks {
  send(playerId: string, payload: GameStatePayload): void
  isConnected(playerId: string): boolean
  onFinished(): void
}

const MAX_REMEMBERED_ACTIONS = 500

interface Timer {
  key: string
  handle: NodeJS.Timeout
  deadlineAt: number
}

/**
 * One running game inside a room. Owns the authoritative engine state, the server-side timers and
 * the fan-out of per-player snapshots. Everything here is synchronous per action, so two players
 * acting "at the same time" are simply processed one after the other.
 */
export class GameSession {
  state: GameState
  readonly startedAt = Date.now()
  endedAt: number | null = null

  private pendingTimer: Timer | null = null
  private autoMoveTimer: Timer | null = null
  private readonly handled = new Map<string, Ack>()

  constructor(
    options: CreateGameOptions,
    private readonly hooks: GameSessionHooks,
    private readonly disconnectGraceSec: number
  ) {
    this.state = createGame(options)
  }

  start(): void {
    this.syncTimers()
    this.broadcast([])
  }

  stop(): void {
    this.clear('pendingTimer')
    this.clear('autoMoveTimer')
  }

  /** `actionId` makes retries (double taps, reconnect resends) harmless: a repeat returns the first result. */
  handleAction(playerId: string, actionId: string, action: Action): Ack {
    const key = `${playerId}:${actionId}`
    const previous = this.handled.get(key)
    if (previous) return previous

    const result = this.apply(playerId, action)
    this.handled.set(key, result)
    if (this.handled.size > MAX_REMEMBERED_ACTIONS) this.handled.delete(this.handled.keys().next().value!)
    return result
  }

  /** Ends the current coffee break or mini-game the same way its timer would. */
  endInterlude(): Ack {
    const pending = this.state.pending
    if (pending?.kind !== 'interlude') return { ok: false, error: 'NO_INTERLUDE' }
    return this.apply(SYSTEM_PLAYER, { type: 'timeout', pendingId: pending.id })
  }

  onConnectionChange(): void {
    this.syncTimers()
    this.broadcast([])
  }

  snapshotFor(playerId: string, fx: Fx[] = []): GameStatePayload {
    const connected: Record<string, boolean> = {}
    for (const player of this.state.players) connected[player.id] = this.hooks.isConnected(player.id)
    return {
      state: projectFor(this.state, playerId),
      fx,
      deadlineAt: this.pendingTimer?.deadlineAt ?? null,
      serverNow: Date.now(),
      connected,
      startedAt: this.startedAt,
      endedAt: this.endedAt
    }
  }

  private apply(playerId: string, action: Action): Ack {
    const result = dispatch(this.state, playerId, action)
    if (!result.ok) return { ok: false, error: result.error, message: result.message }

    this.state = result.state
    if (this.state.finished) this.endedAt = Date.now()
    this.syncTimers()
    this.broadcast(result.fx)
    if (this.state.finished) this.hooks.onFinished()
    return { ok: true }
  }

  private broadcast(fx: Fx[]): void {
    for (const player of this.state.players) this.hooks.send(player.id, this.snapshotFor(player.id, fx))
  }

  private syncTimers(): void {
    this.syncPendingTimer()
    this.syncAutoMoveTimer()
  }

  /** Response windows, shortfalls and discard choices all expire on the server clock. */
  private syncPendingTimer(): void {
    const pending = this.state.finished ? null : this.state.pending
    const key = pending ? String(pending.id) : null
    if (this.pendingTimer?.key === key) return
    this.clear('pendingTimer')
    if (!pending || !key) return
    this.pendingTimer = this.schedule(key, pending.timeoutSec * 1000, () =>
      this.apply(SYSTEM_PLAYER, { type: 'timeout', pendingId: pending.id })
    )
  }

  /** A disconnected player must not freeze the table: after a grace period the server plays the minimum for them. */
  private syncAutoMoveTimer(): void {
    const move = this.autoMove()
    const key = move ? `${this.state.turnNumber}:${move.playerId}:${move.action.type}` : null
    if (this.autoMoveTimer?.key === key) return
    this.clear('autoMoveTimer')
    if (!move || !key) return
    this.autoMoveTimer = this.schedule(key, this.disconnectGraceSec * 1000, () => this.apply(move.playerId, move.action))
  }

  private autoMove(): { playerId: string; action: Action } | null {
    const s = this.state
    if (s.finished || s.pending) return null
    if (s.phase === 'opening_shot') {
      const absent = s.players.find((p) => p.alive && !p.openingShotDone && !this.hooks.isConnected(p.id))
      return absent ? { playerId: absent.id, action: { type: 'drink' } } : null
    }
    if (s.phase === 'action' && !this.hooks.isConnected(s.activeId)) {
      return { playerId: s.activeId, action: { type: 'finish_turn' } }
    }
    return null
  }

  private schedule(key: string, ms: number, run: () => void): Timer {
    return { key, deadlineAt: Date.now() + ms, handle: setTimeout(run, ms) }
  }

  private clear(which: 'pendingTimer' | 'autoMoveTimer'): void {
    const timer = this[which]
    if (timer) clearTimeout(timer.handle)
    this[which] = null
  }
}
