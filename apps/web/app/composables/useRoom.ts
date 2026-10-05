import type { CardDef, PublicPlayer, PublicState } from '@sdd/engine'
import type {
  Ack,
  ClientAction,
  ClientToServerEvents,
  GameStatePayload,
  JoinedRoom,
  LobbyView,
  ServerToClientEvents,
  UpdateConfigPayload
} from '@sdd/protocol'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { errorText } from '~/theme/theme'

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export interface Profile {
  name: string
  avatar: string
  nonAlcoholic: boolean
  birthYear?: number
}

interface StoredSession {
  code: string
  token: string
  playerId: string
}

const SESSION_KEY = 'sdd.session'
const PROFILE_KEY = 'sdd.profile'

/*
 * One shared connection + one shared copy of the room/game state for the whole app.
 * Payloads are replaced wholesale on every update, so shallowRef avoids deep reactive proxying
 * (noticeably cheaper on phones).
 */
const connection = ref<'connecting' | 'online' | 'offline'>('connecting')
const lobby = shallowRef<LobbyView | null>(null)
const game = shallowRef<GameStatePayload | null>(null)
const cards = shallowRef<Record<string, CardDef>>({})
const session = ref<StoredSession | null>(null)
const clockOffset = ref(0)
const toast = ref<{ id: number; text: string } | null>(null)
let socket: GameSocket | null = null
let toastId = 0

function readJson<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null
  } catch {
    return null
  }
}

export function useRoom() {
  const fx = useFx()

  /* ───────── connection ───────── */

  function init() {
    if (socket) return
    session.value = readJson<StoredSession>(SESSION_KEY)
    // Production build: the game server also serves this app, so talk to the same origin (works behind any tunnel/proxy).
    // `npm run dev:web`: the game server is on the same host, port 3210. An explicit full URL always wins.
    const configured = useRuntimeConfig().public.serverUrl as string
    const devUrl = `${location.protocol}//${location.hostname}:3210`
    const url = configured && configured !== 'same-origin' ? configured : import.meta.dev ? devUrl : location.origin
    socket = io(url, { transports: ['websocket', 'polling'], reconnectionDelayMax: 3000 })

    socket.on('connect', () => {
      connection.value = 'online'
      // a fresh socket id means the server no longer knows us: re-attach to our seat
      if (session.value) void reconnect()
    })
    socket.on('disconnect', () => (connection.value = 'offline'))
    socket.on('connect_error', () => (connection.value = 'offline'))
    socket.on('lobby_updated', (view) => {
      lobby.value = view
      // back in the lobby (play again): drop the finished game so it cannot flash on screen
      if (view.phase === 'lobby') game.value = null
    })
    socket.on('game_state', (payload) => applyGame(payload))
    socket.on('kicked', () => {
      forget()
      notify('คุณถูกเชิญออกจากห้อง')
    })
  }

  function applyGame(payload: GameStatePayload) {
    game.value = payload
    clockOffset.value = payload.serverNow - Date.now()
    if (payload.fx.length) fx.run(payload.fx, payload.state.me, cards.value, payload.state.players)
  }

  function call<T extends object = object>(event: keyof ClientToServerEvents, payload?: unknown): Promise<Ack<T>> {
    return new Promise((resolve) => {
      if (!socket?.connected) return resolve({ ok: false, error: 'OFFLINE' })
      const args = payload === undefined ? [] : [payload]
      ;(socket.timeout(8000) as unknown as { emit: (...a: unknown[]) => void }).emit(
        event,
        ...args,
        (error: unknown, result: Ack<T>) => resolve(error ? { ok: false, error: 'TIMEOUT' } : result)
      )
    })
  }

  /** Shows an error toast when a call failed. Returns whether it succeeded. */
  function check(result: Ack): boolean {
    if (!result.ok) notify(errorText(result.error))
    return result.ok
  }

  function notify(text: string) {
    toast.value = { id: ++toastId, text }
  }

  /* ───────── joining ───────── */

  function adopt(joined: JoinedRoom) {
    session.value = { code: joined.code, token: joined.sessionToken, playerId: joined.playerId }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session.value))
    lobby.value = joined.lobby
    cards.value = joined.cards
    game.value = joined.game
    if (joined.game) clockOffset.value = joined.game.serverNow - Date.now()
  }

  function forget() {
    session.value = null
    lobby.value = null
    game.value = null
    localStorage.removeItem(SESSION_KEY)
  }

  function rememberProfile(profile: Profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  }

  function savedProfile(): Profile | null {
    return readJson<Profile>(PROFILE_KEY)
  }

  async function createRoom(profile: Profile): Promise<boolean> {
    rememberProfile(profile)
    const result = await call<JoinedRoom>('create_room', { ...profile, adultConfirmed: true })
    if (result.ok) adopt(result)
    return check(result)
  }

  async function joinRoom(code: string, profile: Profile): Promise<boolean> {
    rememberProfile(profile)
    const result = await call<JoinedRoom>('join_room', { ...profile, code, adultConfirmed: true })
    if (result.ok) adopt(result)
    return check(result)
  }

  async function reconnect(): Promise<boolean> {
    if (!session.value) return false
    const result = await call<JoinedRoom>('reconnect_room', { code: session.value.code, sessionToken: session.value.token })
    if (result.ok) {
      adopt(result)
      return true
    }
    forget()
    return false
  }

  async function leave() {
    await call('leave_room')
    forget()
  }

  /* ───────── lobby & game commands ───────── */

  const setReady = (ready: boolean) => call('player_ready', { ready }).then(check)
  const kick = (playerId: string) => call('kick_player', { playerId }).then(check)
  const reorder = (order: string[]) => call('reorder_seats', { order }).then(check)
  const updateConfig = (config: UpdateConfigPayload['config']) => call('update_config', { config }).then(check)
  const updateProfile = (patch: Partial<Profile>) => call('update_profile', patch).then(check)
  const startGame = () => call('start_game').then(check)
  const playAgain = () => call('play_again').then(check)

  /** Every game action carries a fresh id, so the server can ignore accidental duplicates. */
  async function send(action: ClientAction): Promise<boolean> {
    const result = await call('game_action', { actionId: crypto.randomUUID(), action })
    return check(result)
  }

  /* ───────── derived state ───────── */

  const state = computed<PublicState | null>(() => game.value?.state ?? null)
  const me = computed<PublicPlayer | null>(() => state.value?.players.find((p) => p.id === state.value!.me) ?? null)
  const myId = computed(() => session.value?.playerId ?? null)
  const isHost = computed(() => !!lobby.value && lobby.value.hostId === myId.value)
  const isMyTurn = computed(() => !!state.value && state.value.activeId === state.value.me && state.value.phase === 'action')
  const connected = computed(() => game.value?.connected ?? {})

  function nameOf(playerId?: string): string {
    if (!playerId) return ''
    return state.value?.players.find((p) => p.id === playerId)?.name ?? lobby.value?.players.find((p) => p.id === playerId)?.name ?? '?'
  }

  /** Milliseconds left on the server's current decision timer, using the server's clock. */
  function msLeft(now: number): number {
    const deadline = game.value?.deadlineAt
    return deadline ? Math.max(0, deadline - (now + clockOffset.value)) : 0
  }

  return {
    // state
    connection, lobby, game, cards, session, toast, state, me, myId, isHost, isMyTurn, connected,
    // connection
    init, createRoom, joinRoom, reconnect, leave, savedProfile, notify,
    // commands
    setReady, kick, reorder, updateConfig, updateProfile, startGame, playAgain, send,
    // helpers
    nameOf, msLeft
  }
}
