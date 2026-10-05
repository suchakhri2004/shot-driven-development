import type { ServerConfig } from '../config'
import { generateRoomCode } from './room-code'
import { Room, RoomError } from './room'
import type { GameServer } from './room'

export class RoomManager {
  private rooms = new Map<string, Room>()
  private sweeper: NodeJS.Timeout

  constructor(
    private readonly io: GameServer,
    private readonly settings: ServerConfig
  ) {
    this.sweeper = setInterval(() => this.sweepIdleRooms(), 60_000)
    this.sweeper.unref()
  }

  create(): Room {
    const code = generateRoomCode((candidate) => this.rooms.has(candidate))
    const room = new Room(code, this.io, this.settings, () => this.delete(code))
    this.rooms.set(code, room)
    return room
  }

  get(code: string): Room {
    const room = this.rooms.get(code)
    if (!room) throw new RoomError('ROOM_NOT_FOUND')
    return room
  }

  find(code: string): Room | undefined {
    return this.rooms.get(code)
  }

  delete(code: string): void {
    this.rooms.get(code)?.destroy()
    this.rooms.delete(code)
  }

  get size(): number {
    return this.rooms.size
  }

  close(): void {
    clearInterval(this.sweeper)
    for (const code of [...this.rooms.keys()]) this.delete(code)
  }

  private sweepIdleRooms(): void {
    const idleMs = this.settings.roomIdleMin * 60_000
    for (const [code, room] of this.rooms) {
      if (!room.hasConnectedMembers() && Date.now() - room.lastActiveAt > idleMs) this.delete(code)
    }
  }
}
