import { fileURLToPath } from 'node:url'

export interface ServerConfig {
  port: number
  /** Comma separated list of allowed web origins, or "*" for any (dev only). */
  corsOrigin: string | string[]
  /** How long a disconnected player may hold up their turn (or opening shot) before the server plays for them. */
  disconnectGraceSec: number
  /** How long a disconnected player keeps their lobby seat. */
  lobbyGraceSec: number
  /** A room with nobody connected for this long is deleted. */
  roomIdleMin: number
  /** Max client events per socket within `rateLimitWindowMs`. */
  rateLimit: number
  rateLimitWindowMs: number
  /** Folder with the built web app. If it exists, the server serves it too (one process, one port). */
  webDir: string
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const origin = env.CORS_ORIGIN ?? '*'
  return {
    port: Number(env.PORT ?? 3210),
    corsOrigin: origin === '*' ? '*' : origin.split(',').map((o) => o.trim()),
    disconnectGraceSec: Number(env.DISCONNECT_GRACE_SEC ?? 60),
    lobbyGraceSec: Number(env.LOBBY_GRACE_SEC ?? 30),
    roomIdleMin: Number(env.ROOM_IDLE_MIN ?? 15),
    rateLimit: Number(env.RATE_LIMIT ?? 40),
    rateLimitWindowMs: Number(env.RATE_LIMIT_WINDOW_MS ?? 5000),
    webDir: env.WEB_DIR ?? fileURLToPath(new URL('../../web/.output/public', import.meta.url))
  }
}
