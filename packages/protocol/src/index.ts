import type { CardDef, Fx, GameConfig, PublicState } from '@sdd/engine'
import { z } from 'zod'

export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 6
export const GAME_MODES = ['classic', 'party', 'rush', 'heavy', 'hardcore'] as const
export const ROOM_CODE_LENGTH = 6

/* ───────────────────────── Client → Server payloads (validated on the server) ───────────────────────── */

const name = z.string().trim().min(1).max(20)
const avatar = z.string().trim().min(1).max(24)
const roomCode = z.string().trim().toUpperCase().length(ROOM_CODE_LENGTH)

const profile = z.object({
  name,
  avatar,
  nonAlcoholic: z.boolean().optional(),
  birthYear: z.number().int().min(1900).max(2100).optional()
})

export const createRoomSchema = profile.extend({ adultConfirmed: z.literal(true) })
export const joinRoomSchema = profile.extend({ code: roomCode, adultConfirmed: z.literal(true) })
export const reconnectRoomSchema = z.object({ code: roomCode, sessionToken: z.string().min(16).max(128) })
export const updateProfileSchema = profile.partial()
export const readySchema = z.object({ ready: z.boolean() })
export const kickSchema = z.object({ playerId: z.string().min(1).max(64) })
export const reorderSchema = z.object({ order: z.array(z.string().min(1).max(64)).min(1).max(MAX_PLAYERS) })

const seconds = z.number().int().min(5).max(60)
export const updateConfigSchema = z.object({
  config: z
    .object({
      openingShot: z.boolean(),
      koMode: z.enum(['self-declare', 'potion-limit']),
      potionLimit: z.number().int().min(1).max(50).nullable(),
      manaBankSize: z.number().int().min(10).max(300).nullable(),
      responseWindowSec: seconds,
      shortfallSec: seconds,
      discardChoiceSec: seconds,
      responderScope: z.enum(['targeted', 'all'])
    })
    .partial()
    .strict()
    .optional(),
  /** Table mode (see @sdd/cards modes): how hard the table drinks. */
  mode: z.enum(GAME_MODES).optional()
})

const cardId = z.string().min(1).max(32)
/** Every game action a client may send. `timeout` is deliberately absent: only the server issues it. */
export const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('drink') }),
  z.object({
    type: z.literal('play_card'),
    cardId,
    targets: z.array(z.string().max(64)).max(MAX_PLAYERS).optional(),
    targetCardId: cardId.optional(),
    costCardIds: z.array(cardId).max(10).optional()
  }),
  z.object({ type: z.literal('discard_card'), cardId }),
  z.object({ type: z.literal('exchange_card'), cardId }),
  z.object({ type: z.literal('finish_turn') }),
  z.object({ type: z.literal('pass_response') }),
  z.object({ type: z.literal('decline_shortfall') }),
  z.object({ type: z.literal('choose_discard'), cardIds: z.array(cardId).max(10) }),
  z.object({ type: z.literal('declare_ko') }),
  /** The card's owner ends a break or mini-game early. The host may too (handled by the room). */
  z.object({ type: z.literal('end_interlude') }),
  z.object({ type: z.literal('take_drink') })
])
export const gameActionSchema = z.object({ actionId: z.string().min(8).max(64), action: actionSchema })

export type CreateRoomPayload = z.infer<typeof createRoomSchema>
export type JoinRoomPayload = z.infer<typeof joinRoomSchema>
export type ReconnectRoomPayload = z.infer<typeof reconnectRoomSchema>
export type UpdateProfilePayload = z.infer<typeof updateProfileSchema>
export type UpdateConfigPayload = z.infer<typeof updateConfigSchema>
export type GameActionPayload = z.infer<typeof gameActionSchema>
export type ClientAction = z.infer<typeof actionSchema>

/* ───────────────────────── Server → Client payloads ───────────────────────── */

export type RoomPhase = 'lobby' | 'playing' | 'finished'

export interface LobbyPlayer {
  id: string
  name: string
  avatar: string
  ready: boolean
  connected: boolean
  nonAlcoholic: boolean
  birthYear: number | null
}

export interface LobbyView {
  code: string
  phase: RoomPhase
  hostId: string
  players: LobbyPlayer[]
  config: GameConfig
  minPlayers: number
  maxPlayers: number
  /** With exactly `players` in the room the game is a duel that starts at `hp` Uptime. */
  duel: { players: number; hp: number }
  mode: (typeof GAME_MODES)[number]
}

export interface GameStatePayload {
  state: PublicState
  /** Animation cues produced by the action that created this state. Empty on (re)connect. */
  fx: Fx[]
  /** Epoch ms when the current pending decision times out, or null. */
  deadlineAt: number | null
  serverNow: number
  connected: Record<string, boolean>
  startedAt: number
  endedAt: number | null
}

export type Ack<T = object> = ({ ok: true } & T) | { ok: false; error: string; message?: string }

export interface JoinedRoom {
  code: string
  playerId: string
  sessionToken: string
  cards: Record<string, CardDef>
  lobby: LobbyView
  game: GameStatePayload | null
}

export interface ClientToServerEvents {
  create_room: (payload: unknown, ack: (r: Ack<JoinedRoom>) => void) => void
  join_room: (payload: unknown, ack: (r: Ack<JoinedRoom>) => void) => void
  reconnect_room: (payload: unknown, ack: (r: Ack<JoinedRoom>) => void) => void
  leave_room: (ack?: (r: Ack) => void) => void
  update_profile: (payload: unknown, ack: (r: Ack) => void) => void
  player_ready: (payload: unknown, ack: (r: Ack) => void) => void
  kick_player: (payload: unknown, ack: (r: Ack) => void) => void
  reorder_seats: (payload: unknown, ack: (r: Ack) => void) => void
  update_config: (payload: unknown, ack: (r: Ack) => void) => void
  start_game: (ack: (r: Ack) => void) => void
  game_action: (payload: unknown, ack: (r: Ack) => void) => void
  play_again: (ack: (r: Ack) => void) => void
}

export interface ServerToClientEvents {
  lobby_updated: (lobby: LobbyView) => void
  game_state: (payload: GameStatePayload) => void
  kicked: () => void
}
