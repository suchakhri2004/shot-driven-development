import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { runBot } from './bot'
import { seatPlayers, startTestServer, TestClient } from './helpers'

let server: Awaited<ReturnType<typeof startTestServer>>
let clients: TestClient[] = []

beforeAll(async () => {
  server = await startTestServer({ DISCONNECT_GRACE_SEC: '60' })
})
afterEach(() => {
  for (const c of clients) c.close()
  clients = []
})
afterAll(() => server.close())

async function startGame(count: number) {
  const seated = await seatPlayers(server.url, count)
  clients = seated.clients
  const host = clients[0]
  expect(await host.emit('start_game')).toMatchObject({ ok: true })
  await Promise.all(clients.map((c) => c.waitFor((x) => x.game !== null)))
  return { code: seated.code, clients }
}

describe('a full game over real sockets', () => {
  for (const players of [2, 3, 4, 5, 6]) {
    it(`${players} simultaneous clients play to a winner and all agree on the result`, async () => {
      const { clients: seated } = await startGame(players)
      seated.forEach(runBot)
      await Promise.all(seated.map((c) => c.waitFor((x) => x.game!.state.finished, 30_000)))

      const winners = new Set(seated.map((c) => c.game!.state.winnerId))
      expect(winners.size).toBe(1)
      const [winnerId] = [...winners]
      expect(seated.some((c) => c.playerId === winnerId)).toBe(true)
      const versions = new Set(seated.map((c) => c.game!.state.version))
      expect(versions.size).toBe(1)
      expect(seated[0].lobby!.phase).toBe('finished')
    })
  }

  it('lets the host return everyone to the lobby for another round', async () => {
    const { clients: seated } = await startGame(3)
    seated.forEach(runBot)
    await Promise.all(seated.map((c) => c.waitFor((x) => x.game!.state.finished, 30_000)))
    expect(await seated[1].emit('play_again')).toMatchObject({ ok: false, error: 'HOST_ONLY' })
    expect(await seated[0].emit('play_again')).toMatchObject({ ok: true })
    await seated[2].waitFor((c) => c.lobby!.phase === 'lobby')
    expect(seated[2].lobby!.players.every((p) => p.id === seated[0].playerId || !p.ready)).toBe(true)
  })
})

describe('server-side validation', () => {
  it('rejects out-of-turn actions and actions the client may not send', async () => {
    const { clients: seated } = await startGame(3)
    const state = () => seated[0].game!.state
    const active = seated.find((c) => c.playerId === state().activeId)!
    const idle = seated.find((c) => c !== active)!

    expect(await idle.action({ type: 'finish_turn' })).toMatchObject({ ok: false })
    expect(await idle.action({ type: 'timeout', pendingId: 1 })).toMatchObject({ ok: false, error: 'BAD_REQUEST' })
    expect(await idle.action({ type: 'play_card', cardId: 'does-not-exist' })).toMatchObject({
      ok: false,
      error: 'CARD_NOT_IN_HAND'
    })
    expect(await idle.emit('game_action', { actionId: 'short', action: { type: 'drink' } })).toMatchObject({
      ok: false,
      error: 'BAD_REQUEST'
    })
  })

  it('never sends other players hands or the draw pile to a client', async () => {
    const { clients: seated } = await startGame(3)
    for (const viewer of seated) {
      const view = viewer.game!.state
      expect(view.hand).toHaveLength(5)
      expect(view).not.toHaveProperty('drawPile')
      for (const p of view.players) expect(p).not.toHaveProperty('hand')
      expect(view.players.find((p) => p.id !== viewer.playerId)!.handCount).toBe(5)
    }
    const allHandIds = seated.flatMap((c) => c.game!.state.hand.map((h) => h.iid))
    for (const viewer of seated) {
      const text = JSON.stringify(viewer.game)
      for (const other of seated.filter((c) => c !== viewer)) {
        for (const iid of other.game!.state.hand.map((h) => h.iid)) expect(text).not.toContain(`"${iid}"`)
      }
    }
    expect(new Set(allHandIds).size).toBe(allHandIds.length)
  })

  it('treats a repeated actionId as the same action (no double drink)', async () => {
    const { clients: seated } = await startGame(3)
    const [host] = seated
    await Promise.all(seated.map((c) => c.action({ type: 'drink' })))
    await host.waitFor((c) => c.game!.state.phase !== 'opening_shot')
    const before = host.game!.state.players.find((p) => p.id === host.playerId)!.mana
    const id = crypto.randomUUID()
    const first = await host.action({ type: 'drink' }, id)
    const second = await host.action({ type: 'drink' }, id)
    expect(first).toEqual(second)
    await host.waitFor((c) => c.game!.state.players.find((p) => p.id === host.playerId)!.mana === before + 3)
    expect(host.game!.state.players.find((p) => p.id === host.playerId)!.mana).toBe(before + 3)
  })

  it('applies simultaneous drinks from every client exactly once each', async () => {
    const { clients: seated } = await startGame(4)
    const results = await Promise.all(seated.map((c) => c.action({ type: 'drink' })))
    expect(results.every((r) => r.ok)).toBe(true)
    await seated[0].waitFor((c) => c.game!.state.phase !== 'opening_shot')
    expect(seated[0].game!.state.players.map((p) => p.mana)).toEqual([3, 3, 3, 3])
  })
})

describe('reconnecting', () => {
  it('lets a dropped player return to the same seat with the same hand', async () => {
    const { code, clients: seated } = await startGame(3)
    const [host, bob] = seated
    await Promise.all(seated.map((c) => c.action({ type: 'drink' })))
    await bob.waitFor((c) => c.game!.state.phase === 'action')

    const handBefore = bob.game!.state.hand.map((c) => c.iid)
    const { sessionToken, playerId } = bob.joined!
    bob.socket.disconnect()
    await host.waitFor((c) => c.game!.connected[playerId] === false)

    const returning = await TestClient.connect(server.url)
    clients.push(returning)
    const result = await returning.emit('reconnect_room', { code, sessionToken })
    expect(result).toMatchObject({ ok: true, playerId })
    returning.joined = (result as unknown as { ok: true } & NonNullable<TestClient['joined']>)
    await host.waitFor((c) => c.game!.connected[playerId] === true)

    expect(returning.joined!.game!.state.hand.map((c) => c.iid)).toEqual(handBefore)
    expect(returning.joined!.game!.state.me).toBe(playerId)
  })

  it('rejects a wrong session token', async () => {
    const { code } = await startGame(3)
    const stranger = await TestClient.connect(server.url)
    clients.push(stranger)
    expect(await stranger.emit('reconnect_room', { code, sessionToken: 'f'.repeat(32) })).toMatchObject({
      ok: false,
      error: 'INVALID_SESSION'
    })
  })

  it('counts a player who leaves a running game as eliminated', async () => {
    const { clients: seated } = await startGame(3)
    const [host, bob, carol] = seated
    expect(await bob.emit('leave_room')).toMatchObject({ ok: true })
    await host.waitFor((c) => c.game!.state.players.find((p) => p.id === bob.playerId)!.alive === false)
    expect(carol.game!.state.eliminationOrder.map((e) => e.playerId)).toEqual([bob.playerId])
  })
})
