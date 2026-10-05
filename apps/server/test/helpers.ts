import type { AddressInfo } from 'node:net'
import type { Ack, ClientToServerEvents, GameStatePayload, JoinedRoom, LobbyView, ServerToClientEvents } from '@sdd/protocol'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { createApp } from '../src/app'
import { loadConfig } from '../src/config'

export async function startTestServer(env: Record<string, string> = {}) {
  // bots act far faster than humans, so tests lift the rate limit unless they are testing it
  const app = createApp(loadConfig({ PORT: '0', RATE_LIMIT: '100000', ...env }))
  await new Promise<void>((resolve) => app.httpServer.listen(0, resolve))
  const { port } = app.httpServer.address() as AddressInfo
  return { ...app, url: `http://localhost:${port}` }
}

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>

/** A player's browser, reduced to what the tests need. */
export class TestClient {
  lobby: LobbyView | null = null
  game: GameStatePayload | null = null
  joined: JoinedRoom | null = null
  kicked = false
  private listeners = new Set<() => void>()

  private constructor(readonly socket: ClientSocket) {
    socket.on('lobby_updated', (lobby) => this.update(() => (this.lobby = lobby)))
    socket.on('game_state', (game) => this.update(() => (this.game = game)))
    socket.on('kicked', () => this.update(() => (this.kicked = true)))
  }

  static connect(url: string): Promise<TestClient> {
    const socket: ClientSocket = io(url, { transports: ['websocket'], forceNew: true })
    return new Promise((resolve, reject) => {
      socket.on('connect', () => resolve(new TestClient(socket)))
      socket.on('connect_error', reject)
    })
  }

  get playerId(): string {
    return this.joined!.playerId
  }

  emit<T extends object = object>(event: keyof ClientToServerEvents, payload?: unknown): Promise<Ack<T>> {
    return new Promise((resolve) => {
      const args = payload === undefined ? [resolve] : [payload, resolve]
      ;(this.socket.emit as (...a: unknown[]) => void)(event, ...args)
    })
  }

  async create(name: string, extra: Record<string, unknown> = {}): Promise<string> {
    const result = await this.emit<JoinedRoom>('create_room', { name, avatar: 'backend', adultConfirmed: true, ...extra })
    if (!result.ok) throw new Error(`create_room failed: ${result.error}`)
    this.adopt(result)
    return result.code
  }

  async join(code: string, name: string, extra: Record<string, unknown> = {}): Promise<Ack<JoinedRoom>> {
    const result = await this.emit<JoinedRoom>('join_room', { code, name, avatar: 'qa', adultConfirmed: true, ...extra })
    if (result.ok) this.adopt(result)
    return result
  }

  async action(action: Record<string, unknown>, actionId = crypto.randomUUID()): Promise<Ack> {
    return this.emit('game_action', { actionId, action })
  }

  /** Resolves as soon as `predicate` holds, checking now and after every server message. */
  waitFor(predicate: (client: TestClient) => boolean, timeoutMs = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (predicate(this)) return resolve()
      const timer = setTimeout(() => {
        this.listeners.delete(check)
        reject(new Error('waitFor timed out'))
      }, timeoutMs)
      const check = () => {
        if (!predicate(this)) return
        clearTimeout(timer)
        this.listeners.delete(check)
        resolve()
      }
      this.listeners.add(check)
    })
  }

  close(): void {
    this.socket.close()
  }

  private adopt(joined: JoinedRoom): void {
    this.joined = joined
    this.lobby = joined.lobby
    this.game = joined.game
  }

  private update(change: () => void): void {
    change()
    for (const listener of [...this.listeners]) listener()
  }
}

/** Create a room with `count` players, everyone ready. Returns clients in seat order (host first). */
export async function seatPlayers(url: string, count: number): Promise<{ code: string; clients: TestClient[] }> {
  const names = ['Alice', 'Bob', 'Carol', 'Dave', 'Erin', 'Frank']
  const host = await TestClient.connect(url)
  const code = await host.create(names[0])
  const clients = [host]
  for (let i = 1; i < count; i++) {
    const client = await TestClient.connect(url)
    const result = await client.join(code, names[i])
    if (!result.ok) throw new Error(`join failed: ${result.error}`)
    await client.emit('player_ready', { ready: true })
    clients.push(client)
  }
  await host.waitFor((c) => c.lobby!.players.length === count && c.lobby!.players.every((p) => p.ready))
  return { code, clients }
}
