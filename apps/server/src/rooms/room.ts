import { randomBytes, randomInt, randomUUID } from 'node:crypto'
import { DEFAULT_CONFIG } from '@sdd/engine'
import type { GameConfig } from '@sdd/engine'
import { DECK } from '@sdd/cards'
import { DUEL_HP, DUEL_PLAYERS, MAX_PLAYERS, MIN_PLAYERS } from '@sdd/protocol'
import type {
  Ack,
  ClientAction,
  ClientToServerEvents,
  GameStatePayload,
  JoinedRoom,
  LobbyView,
  RoomPhase,
  ServerToClientEvents,
  UpdateConfigPayload,
  UpdateProfilePayload
} from '@sdd/protocol'
import type { Server } from 'socket.io'
import type { ServerConfig } from '../config'
import { GameSession } from '../game/game-session'

export type GameServer = Server<ClientToServerEvents, ServerToClientEvents>

export class RoomError extends Error {
  constructor(readonly code: string) {
    super(code)
  }
}

export interface Profile {
  name: string
  avatar: string
  nonAlcoholic?: boolean
  birthYear?: number
}

interface Member {
  id: string
  name: string
  avatar: string
  nonAlcoholic: boolean
  birthYear: number | null
  ready: boolean
  token: string
  socketId: string | null
  /** Left a running game for good: stays in the engine as eliminated, can no longer reconnect. */
  left: boolean
  lobbyGraceTimer?: NodeJS.Timeout
}

export class Room {
  phase: RoomPhase = 'lobby'
  hostId = ''
  config: GameConfig = { ...DEFAULT_CONFIG }
  game: GameSession | null = null
  lastActiveAt = Date.now()

  /** Insertion order is seat order (clockwise). */
  private members = new Map<string, Member>()

  constructor(
    readonly code: string,
    private readonly io: GameServer,
    private readonly settings: ServerConfig,
    private readonly onEmpty: () => void
  ) {}

  /* ───────── membership ───────── */

  addMember(profile: Profile, socketId: string): Member {
    if (this.phase !== 'lobby') throw new RoomError('ROOM_IN_PROGRESS')
    if (this.members.size >= MAX_PLAYERS) throw new RoomError('ROOM_FULL')
    const member: Member = {
      id: randomUUID(),
      name: profile.name,
      avatar: profile.avatar,
      nonAlcoholic: profile.nonAlcoholic ?? false,
      birthYear: profile.birthYear ?? null,
      ready: false,
      token: randomBytes(16).toString('hex'),
      socketId,
      left: false
    }
    this.members.set(member.id, member)
    if (!this.hostId) this.hostId = member.id
    this.touch()
    return member
  }

  /** Re-attach a returning player. Token must match; a newer socket replaces the older one. */
  reconnect(token: string, socketId: string): Member {
    const member = [...this.members.values()].find((m) => m.token === token && !m.left)
    if (!member) throw new RoomError('INVALID_SESSION')
    clearTimeout(member.lobbyGraceTimer)
    member.socketId = socketId
    this.touch()
    return member
  }

  getMember(id: string): Member | undefined {
    return this.members.get(id)
  }

  /** Called when a socket drops. Ignored if the member already reconnected on another socket. */
  detach(memberId: string, socketId: string): void {
    const member = this.members.get(memberId)
    if (!member || member.socketId !== socketId) return
    member.socketId = null
    this.touch()
    if (this.phase === 'lobby') {
      member.lobbyGraceTimer = setTimeout(() => this.remove(memberId), this.settings.lobbyGraceSec * 1000)
      this.broadcastLobby()
    } else {
      this.game?.onConnectionChange()
    }
  }

  leave(memberId: string): void {
    const member = this.members.get(memberId)
    if (!member) return
    if (this.phase === 'playing' && this.game) {
      member.left = true
      member.socketId = null
      this.game.handleAction(member.id, randomUUID(), { type: 'declare_ko' })
      return
    }
    this.remove(memberId)
  }

  kick(hostId: string, targetId: string): void {
    this.assertHost(hostId)
    this.assertLobby()
    if (targetId === hostId) throw new RoomError('CANNOT_KICK_SELF')
    const target = this.members.get(targetId)
    if (!target) throw new RoomError('UNKNOWN_PLAYER')
    if (target.socketId) this.io.to(target.socketId).emit('kicked')
    this.remove(targetId)
  }

  private remove(memberId: string): void {
    const member = this.members.get(memberId)
    if (!member) return
    clearTimeout(member.lobbyGraceTimer)
    this.members.delete(memberId)
    if (this.members.size === 0) return this.onEmpty()
    if (this.hostId === memberId) this.hostId = this.members.keys().next().value!
    this.broadcastLobby()
  }

  /* ───────── lobby ───────── */

  updateProfile(memberId: string, patch: UpdateProfilePayload): void {
    this.assertLobby()
    const member = this.requireMember(memberId)
    if (patch.name !== undefined) member.name = patch.name
    if (patch.avatar !== undefined) member.avatar = patch.avatar
    if (patch.nonAlcoholic !== undefined) member.nonAlcoholic = patch.nonAlcoholic
    if (patch.birthYear !== undefined) member.birthYear = patch.birthYear
    this.broadcastLobby()
  }

  setReady(memberId: string, ready: boolean): void {
    this.assertLobby()
    this.requireMember(memberId).ready = ready
    this.broadcastLobby()
  }

  reorder(hostId: string, order: string[]): void {
    this.assertHost(hostId)
    this.assertLobby()
    const sameSet = order.length === this.members.size && order.every((id) => this.members.has(id))
    if (!sameSet || new Set(order).size !== order.length) throw new RoomError('BAD_ORDER')
    this.members = new Map(order.map((id) => [id, this.members.get(id)!]))
    this.broadcastLobby()
  }

  updateConfig(hostId: string, payload: UpdateConfigPayload): void {
    this.assertHost(hostId)
    this.assertLobby()
    this.config = { ...this.config, ...payload.config }
    this.broadcastLobby()
  }

  /* ───────── game lifecycle ───────── */

  startGame(hostId: string): void {
    this.assertHost(hostId)
    this.assertLobby()
    const members = [...this.members.values()]
    if (members.length < MIN_PLAYERS) throw new RoomError('NOT_ENOUGH_PLAYERS')
    if (members.some((m) => m.socketId === null)) throw new RoomError('PLAYER_DISCONNECTED')
    if (members.some((m) => m.id !== this.hostId && !m.ready)) throw new RoomError('PLAYERS_NOT_READY')

    this.game = new GameSession(
      {
        players: members.map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, nonAlcoholic: m.nonAlcoholic })),
        cards: DECK,
        config: members.length === DUEL_PLAYERS ? { ...this.config, startHp: DUEL_HP, maxHp: DUEL_HP } : this.config,
        firstPlayerId: this.pickFirstPlayer(members),
        seed: randomUUID()
      },
      {
        send: (playerId, payload) => this.sendGameState(playerId, payload),
        isConnected: (playerId) => this.members.get(playerId)?.socketId != null,
        onFinished: () => {
          this.phase = 'finished'
          this.broadcastLobby()
        }
      },
      this.settings.disconnectGraceSec
    )
    this.phase = 'playing'
    this.broadcastLobby()
    this.game.start()
  }

  /** R3: the oldest player starts. If not everyone gave a birth year, pick at random. */
  private pickFirstPlayer(members: Member[]): string {
    if (members.every((m) => m.birthYear !== null)) {
      return members.reduce((oldest, m) => (m.birthYear! < oldest.birthYear! ? m : oldest)).id
    }
    return members[randomInt(members.length)].id
  }

  playAgain(hostId: string): void {
    this.assertHost(hostId)
    if (this.phase !== 'finished') throw new RoomError('GAME_NOT_FINISHED')
    this.game?.stop()
    this.game = null
    for (const [id, member] of this.members) {
      if (member.left) this.members.delete(id)
      else member.ready = false
    }
    this.phase = 'lobby'
    this.broadcastLobby()
  }

  handleGameAction(memberId: string, actionId: string, action: ClientAction): Ack {
    if (this.phase === 'lobby' || !this.game) return { ok: false, error: 'GAME_NOT_STARTED' }
    this.touch()
    // the host can always end a break, e.g. when the player who started it has left the table
    if (action.type === 'end_interlude' && memberId === this.hostId) return this.game.endInterlude()
    return this.game.handleAction(memberId, actionId, action)
  }

  /* ───────── views and messaging ───────── */

  lobbyView(): LobbyView {
    return {
      code: this.code,
      phase: this.phase,
      hostId: this.hostId,
      players: [...this.members.values()]
        .filter((m) => !m.left)
        .map((m) => ({
          id: m.id,
          name: m.name,
          avatar: m.avatar,
          ready: m.id === this.hostId || m.ready,
          connected: m.socketId !== null,
          nonAlcoholic: m.nonAlcoholic,
          birthYear: m.birthYear
        })),
      config: this.config,
      minPlayers: MIN_PLAYERS,
      maxPlayers: MAX_PLAYERS,
      duel: { players: DUEL_PLAYERS, hp: DUEL_HP }
    }
  }

  joinedPayload(member: Member): JoinedRoom {
    return {
      code: this.code,
      playerId: member.id,
      sessionToken: member.token,
      cards: this.game ? this.game.state.defs : Object.fromEntries(DECK.map((def) => [def.id, def])),
      lobby: this.lobbyView(),
      game: this.game ? this.game.snapshotFor(member.id) : null
    }
  }

  broadcastLobby(): void {
    const view = this.lobbyView()
    for (const member of this.members.values()) {
      if (member.socketId) this.io.to(member.socketId).emit('lobby_updated', view)
    }
  }

  /** After a (re)connect: tell everyone the connection flags changed. */
  announceConnectionChange(): void {
    if (this.phase === 'lobby') this.broadcastLobby()
    else this.game?.onConnectionChange()
  }

  hasConnectedMembers(): boolean {
    return [...this.members.values()].some((m) => m.socketId !== null)
  }

  destroy(): void {
    this.game?.stop()
    for (const member of this.members.values()) clearTimeout(member.lobbyGraceTimer)
  }

  private sendGameState(memberId: string, payload: GameStatePayload): void {
    const socketId = this.members.get(memberId)?.socketId
    if (socketId) this.io.to(socketId).emit('game_state', payload)
  }

  private touch(): void {
    this.lastActiveAt = Date.now()
  }

  private requireMember(id: string): Member {
    const member = this.members.get(id)
    if (!member) throw new RoomError('UNKNOWN_PLAYER')
    return member
  }

  private assertHost(id: string): void {
    if (id !== this.hostId) throw new RoomError('HOST_ONLY')
  }

  private assertLobby(): void {
    if (this.phase !== 'lobby') throw new RoomError('ROOM_IN_PROGRESS')
  }
}
