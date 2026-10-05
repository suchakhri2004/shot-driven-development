import { GameError } from './errors'
import type { CardDef, CardInstance, GameState, PlayerState } from './types'

export function findPlayer(s: GameState, id: string): PlayerState | undefined {
  return s.players.find((p) => p.id === id)
}

export function getPlayer(s: GameState, id: string): PlayerState {
  const player = findPlayer(s, id)
  if (!player) throw new GameError('UNKNOWN_PLAYER')
  return player
}

export function getActivePlayer(s: GameState): PlayerState {
  return getPlayer(s, s.activeId)
}

export function getDef(s: GameState, defId: string): CardDef {
  const def = s.defs[defId]
  if (!def) throw new GameError('UNKNOWN_CARD', defId)
  return def
}

export function alivePlayers(s: GameState): PlayerState[] {
  return s.players.filter((p) => p.alive)
}

/** Alive players in seat (clockwise) order, starting from `startId`'s seat. */
export function alivePlayersFrom(s: GameState, startId: string): PlayerState[] {
  const start = Math.max(0, s.players.findIndex((p) => p.id === startId))
  const ordered: PlayerState[] = []
  for (let i = 0; i < s.players.length; i++) {
    const player = s.players[(start + i) % s.players.length]
    if (player.alive) ordered.push(player)
  }
  return ordered
}

export function newInstance(s: GameState, defId: string): CardInstance {
  return { iid: `c${s.nextIid++}`, defId }
}

export function removeFromHand(player: PlayerState, iid: string): CardInstance | undefined {
  const index = player.hand.findIndex((c) => c.iid === iid)
  return index < 0 ? undefined : player.hand.splice(index, 1)[0]
}
