import {
  createRoomSchema,
  gameActionSchema,
  joinRoomSchema,
  kickSchema,
  readySchema,
  reconnectRoomSchema,
  reorderSchema,
  updateConfigSchema,
  updateProfileSchema
} from '@sdd/protocol'
import type { Ack, ClientToServerEvents, ServerToClientEvents } from '@sdd/protocol'
import type { Socket } from 'socket.io'
import type { z } from 'zod'
import type { ServerConfig } from '../config'
import { RoomError } from '../rooms/room'
import type { Room } from '../rooms/room'
import type { RoomManager } from '../rooms/room-manager'
import { RateLimiter } from './rate-limit'

interface SocketData {
  roomCode?: string
  playerId?: string
}
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>

const fail = (error: string, message?: string): Ack => ({ ok: false, error, message })

/**
 * Wires every client event to the room layer. Each handler does the same three things:
 * rate-limit, validate the payload with zod, then call a Room method (which enforces the rules).
 */
export function registerHandlers(socket: GameSocket, rooms: RoomManager, settings: ServerConfig): void {
  const limiter = new RateLimiter(settings.rateLimit, settings.rateLimitWindowMs)

  function current(): { room: Room; playerId: string } {
    const { roomCode, playerId } = socket.data
    const room = roomCode ? rooms.find(roomCode) : undefined
    if (!room || !playerId || !room.getMember(playerId)) throw new RoomError('NOT_IN_ROOM')
    return { room, playerId }
  }

  /** Detach this socket from whatever room it was in (used before joining another, and on disconnect). */
  function detachFromRoom(): void {
    const { roomCode, playerId } = socket.data
    if (roomCode && playerId) rooms.find(roomCode)?.detach(playerId, socket.id)
    socket.data = {}
  }

  function attach(room: Room, playerId: string): void {
    socket.data = { roomCode: room.code, playerId }
  }

  /** Runs a handler with rate limiting, payload validation and uniform error mapping. */
  function handle<S extends z.ZodTypeAny, R extends object = object>(
    schema: S | null,
    ack: ((result: Ack<R>) => void) | undefined,
    run: (payload: z.infer<S>) => Ack<R> | void,
    raw?: unknown
  ): void {
    const reply = typeof ack === 'function' ? ack : () => undefined
    if (!limiter.allow()) return reply(fail('RATE_LIMITED'))
    let payload: z.infer<S> = undefined
    if (schema) {
      const parsed = schema.safeParse(raw)
      if (!parsed.success) return reply(fail('BAD_REQUEST', parsed.error.issues[0]?.message))
      payload = parsed.data
    }
    try {
      reply(run(payload) ?? ({ ok: true } as Ack<R>))
    } catch (error) {
      if (error instanceof RoomError) return reply(fail(error.code))
      console.error('[handler error]', error)
      reply(fail('INTERNAL_ERROR'))
    }
  }

  socket.on('create_room', (raw, ack) =>
    handle(
      createRoomSchema,
      ack,
      (payload) => {
        detachFromRoom()
        const room = rooms.create()
        const member = room.addMember(payload, socket.id)
        attach(room, member.id)
        room.broadcastLobby()
        return { ok: true, ...room.joinedPayload(member) }
      },
      raw
    )
  )

  socket.on('join_room', (raw, ack) =>
    handle(
      joinRoomSchema,
      ack,
      (payload) => {
        const room = rooms.get(payload.code)
        detachFromRoom()
        const member = room.addMember(payload, socket.id)
        attach(room, member.id)
        room.broadcastLobby()
        return { ok: true, ...room.joinedPayload(member) }
      },
      raw
    )
  )

  socket.on('reconnect_room', (raw, ack) =>
    handle(
      reconnectRoomSchema,
      ack,
      (payload) => {
        const room = rooms.get(payload.code)
        detachFromRoom()
        const member = room.reconnect(payload.sessionToken, socket.id)
        attach(room, member.id)
        const joined = room.joinedPayload(member)
        room.announceConnectionChange()
        return { ok: true, ...joined }
      },
      raw
    )
  )

  socket.on('leave_room', (ack) =>
    handle(null, ack, () => {
      const { room, playerId } = current()
      socket.data = {}
      room.leave(playerId)
    })
  )

  socket.on('update_profile', (raw, ack) =>
    handle(updateProfileSchema, ack, (payload) => {
      const { room, playerId } = current()
      room.updateProfile(playerId, payload)
    }, raw)
  )

  socket.on('player_ready', (raw, ack) =>
    handle(readySchema, ack, (payload) => {
      const { room, playerId } = current()
      room.setReady(playerId, payload.ready)
    }, raw)
  )

  socket.on('kick_player', (raw, ack) =>
    handle(kickSchema, ack, (payload) => {
      const { room, playerId } = current()
      room.kick(playerId, payload.playerId)
    }, raw)
  )

  socket.on('reorder_seats', (raw, ack) =>
    handle(reorderSchema, ack, (payload) => {
      const { room, playerId } = current()
      room.reorder(playerId, payload.order)
    }, raw)
  )

  socket.on('update_config', (raw, ack) =>
    handle(updateConfigSchema, ack, (payload) => {
      const { room, playerId } = current()
      room.updateConfig(playerId, payload)
    }, raw)
  )

  socket.on('start_game', (ack) =>
    handle(null, ack, () => {
      const { room, playerId } = current()
      room.startGame(playerId)
    })
  )

  socket.on('play_again', (ack) =>
    handle(null, ack, () => {
      const { room, playerId } = current()
      room.playAgain(playerId)
    })
  )

  socket.on('game_action', (raw, ack) =>
    handle(gameActionSchema, ack, (payload) => {
      const { room, playerId } = current()
      return room.handleGameAction(playerId, payload.actionId, payload.action)
    }, raw)
  )

  socket.on('disconnect', detachFromRoom)
}
