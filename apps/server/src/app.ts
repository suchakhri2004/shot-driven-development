import { createServer } from 'node:http'
import type { ClientToServerEvents, ServerToClientEvents } from '@sdd/protocol'
import { Server } from 'socket.io'
import type { ServerConfig } from './config'
import { RoomManager } from './rooms/room-manager'
import { registerHandlers } from './socket/handlers'
import { createStaticHandler } from './static-files'

/** Builds the HTTP + Socket.IO server without listening, so tests can start it on any port. */
export function createApp(config: ServerConfig) {
  const web = createStaticHandler(config.webDir)
  const httpServer = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true, rooms: rooms.size, web: web.enabled }))
      return
    }
    if (!web.handle(req, res)) res.writeHead(404).end()
  })

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: config.corsOrigin },
    // phones lock their screens often; give them time to come back before the transport is declared dead
    pingInterval: 10_000,
    pingTimeout: 20_000
  })
  const rooms = new RoomManager(io, config)
  io.on('connection', (socket) => registerHandlers(socket, rooms, config))

  return {
    httpServer,
    io,
    rooms,
    webEnabled: web.enabled,
    close: () =>
      new Promise<void>((resolve) => {
        rooms.close()
        void io.close(() => resolve())
      })
  }
}
