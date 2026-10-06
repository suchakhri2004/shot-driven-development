import { DUEL_HP } from '@sdd/cards'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { startTestServer, seatPlayers, TestClient } from './helpers'

let server: Awaited<ReturnType<typeof startTestServer>>
const clients: TestClient[] = []

beforeAll(async () => {
  server = await startTestServer()
})
afterEach(() => {
  for (const c of clients.splice(0)) c.close()
})
afterAll(() => server.close())

async function connect(): Promise<TestClient> {
  const client = await TestClient.connect(server.url)
  clients.push(client)
  return client
}

describe('creating and joining rooms', () => {
  it('creates a room with a 6 character code and makes the creator host', async () => {
    const host = await connect()
    const code = await host.create('Alice')
    expect(code).toMatch(/^[A-HJ-KM-NP-Z2-9]{6}$/)
    expect(host.lobby).toMatchObject({ code, phase: 'lobby', hostId: host.playerId })
    expect(host.lobby!.players).toHaveLength(1)
    expect(host.joined!.sessionToken).toHaveLength(32)
  })

  it('lets others join by code (case-insensitive) and everyone sees the same lobby', async () => {
    const host = await connect()
    const code = await host.create('Alice')
    const bob = await connect()
    const joined = await bob.join(code.toLowerCase(), 'Bob', { nonAlcoholic: true })
    expect(joined.ok).toBe(true)
    await host.waitFor((c) => c.lobby!.players.length === 2)
    expect(host.lobby!.players.map((p) => p.name)).toEqual(['Alice', 'Bob'])
    expect(host.lobby!.players[1]).toMatchObject({ nonAlcoholic: true, ready: false, connected: true })
  })

  it('rejects unknown rooms, missing 18+ confirmation and bad input', async () => {
    const c = await connect()
    expect(await c.join('ZZZZZZ', 'Bob')).toMatchObject({ ok: false, error: 'ROOM_NOT_FOUND' })
    expect(await c.emit('create_room', { name: 'A', avatar: 'x', adultConfirmed: false })).toMatchObject({
      ok: false,
      error: 'BAD_REQUEST'
    })
    expect(await c.emit('create_room', { name: '', avatar: 'x', adultConfirmed: true })).toMatchObject({
      ok: false,
      error: 'BAD_REQUEST'
    })
    expect(await c.emit('create_room', 'not an object')).toMatchObject({ ok: false, error: 'BAD_REQUEST' })
  })

  it('stops at 6 players', async () => {
    const { code } = await seatPlayers(server.url, 6).then((r) => {
      clients.push(...r.clients)
      return r
    })
    const seventh = await connect()
    expect(await seventh.join(code, 'Gina')).toMatchObject({ ok: false, error: 'ROOM_FULL' })
  })
})

describe('abuse protection', () => {
  it('rate limits a client that floods the server, then recovers', async () => {
    const strict = await startTestServer({ RATE_LIMIT: '5', RATE_LIMIT_WINDOW_MS: '300' })
    const flooder = await TestClient.connect(strict.url)
    const results = await Promise.all(Array.from({ length: 8 }, () => flooder.emit('create_room', {})))
    expect(results.filter((r) => !r.ok && r.error === 'RATE_LIMITED').length).toBe(3)
    await new Promise((resolve) => setTimeout(resolve, 350))
    expect(await flooder.emit('create_room', {})).toMatchObject({ ok: false, error: 'BAD_REQUEST' })
    flooder.close()
    await strict.close()
  })
})

describe('lobby controls', () => {
  it('starts a 2-player room as a duel with less Uptime', async () => {
    const host = await connect()
    const code = await host.create('Alice')
    expect(await host.emit('start_game')).toMatchObject({ ok: false, error: 'NOT_ENOUGH_PLAYERS' })

    const bob = await connect()
    await bob.join(code, 'Bob')
    await bob.emit('player_ready', { ready: true })
    expect(await host.emit('start_game')).toMatchObject({ ok: true })
    await bob.waitFor((c) => c.game !== null)
    expect(bob.game!.state.players.map((p) => [p.hp, p.maxHp])).toEqual([
      [DUEL_HP, DUEL_HP],
      [DUEL_HP, DUEL_HP]
    ])
  })

  it('only starts with 2+ players, all ready, and only for the host', async () => {
    const host = await connect()
    const code = await host.create('Alice')
    expect(await host.emit('start_game')).toMatchObject({ ok: false, error: 'NOT_ENOUGH_PLAYERS' })

    const bob = await connect()
    await bob.join(code, 'Bob')
    const carol = await connect()
    await carol.join(code, 'Carol')
    expect(await host.emit('start_game')).toMatchObject({ ok: false, error: 'PLAYERS_NOT_READY' })
    await bob.emit('player_ready', { ready: true })
    await carol.emit('player_ready', { ready: true })
    expect(await bob.emit('start_game')).toMatchObject({ ok: false, error: 'HOST_ONLY' })
    expect(await host.emit('start_game')).toMatchObject({ ok: true })
    await carol.waitFor((c) => c.game !== null)
    expect(carol.lobby!.phase).toBe('playing')
  })

  it('lets the host kick players before the game starts, but nobody else', async () => {
    const host = await connect()
    const code = await host.create('Alice')
    const bob = await connect()
    await bob.join(code, 'Bob')
    const carol = await connect()
    await carol.join(code, 'Carol')

    expect(await bob.emit('kick_player', { playerId: carol.playerId })).toMatchObject({ ok: false, error: 'HOST_ONLY' })
    expect(await host.emit('kick_player', { playerId: bob.playerId })).toMatchObject({ ok: true })
    await bob.waitFor((c) => c.kicked)
    await host.waitFor((c) => c.lobby!.players.length === 2)
    expect(host.lobby!.players.map((p) => p.name)).toEqual(['Alice', 'Carol'])
  })

  it('lets the host reorder seats and change config; rejects invalid config', async () => {
    const { clients: seated } = await seatPlayers(server.url, 3)
    clients.push(...seated)
    const [host, bob, carol] = seated
    const order = [carol.playerId, host.playerId, bob.playerId]
    expect(await host.emit('reorder_seats', { order })).toMatchObject({ ok: true })
    await bob.waitFor((c) => c.lobby!.players[0].id === carol.playerId)

    expect(await host.emit('update_config', { config: { openingShot: false, responseWindowSec: 20 } })).toMatchObject({
      ok: true
    })
    await bob.waitFor((c) => c.lobby!.config.responseWindowSec === 20)
    expect(await host.emit('update_config', { config: { responseWindowSec: 1 } })).toMatchObject({
      ok: false,
      error: 'BAD_REQUEST'
    })
    expect(await bob.emit('update_config', { config: { openingShot: true } })).toMatchObject({
      ok: false,
      error: 'HOST_ONLY'
    })
  })

  it('passes host to the next player when the host leaves, and cannot join a running game', async () => {
    const { code, clients: seated } = await seatPlayers(server.url, 3)
    clients.push(...seated)
    const [host, bob] = seated
    expect(await host.emit('leave_room')).toMatchObject({ ok: true })
    await bob.waitFor((c) => c.lobby!.players.length === 2)
    expect(bob.lobby!.hostId).toBe(bob.playerId)

    const late = await connect()
    expect(await late.join(code, 'Late')).toMatchObject({ ok: true })
    await bob.emit('player_ready', { ready: true })
    await late.emit('player_ready', { ready: true })
    expect(await bob.emit('start_game')).toMatchObject({ ok: true })
    const tooLate = await connect()
    expect(await tooLate.join(code, 'TooLate')).toMatchObject({ ok: false, error: 'ROOM_IN_PROGRESS' })
  })
})
