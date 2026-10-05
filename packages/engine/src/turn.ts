import { drawCard } from './deck'
import { addLog, emit } from './log'
import { getActivePlayer } from './lookup'
import { getStat } from './stats'
import type { GameState, PlayerState } from './types'

/**
 * R7: draw one card toward the hand limit. Returns false when the hand is full (or nothing is left to draw).
 * An Event counts as "progress": its queued effects run before the next draw.
 */
export function drawTowardHandLimit(s: GameState, player: PlayerState): boolean {
  if (player.hand.length >= getStat(s, player, 'handLimit')) return false
  return drawCard(s, player).kind !== 'empty'
}

function decayStatuses(s: GameState, player: PlayerState): void {
  const remaining = player.statuses.map((st) => ({ ...st, remaining: st.remaining - 1 }))
  for (const expired of remaining.filter((st) => st.remaining <= 0)) {
    addLog(s, 'status_expired', { target: player.id, extra: expired.id })
  }
  player.statuses = remaining.filter((st) => st.remaining > 0)
}

function decayTableEvents(s: GameState): void {
  for (const event of s.tableEvents) event.remaining -= 1
  for (const expired of s.tableEvents.filter((e) => e.remaining <= 0)) {
    s.discardPile.push(expired.inst)
    addLog(s, 'event_expired', { card: expired.inst.defId })
  }
  s.tableEvents = s.tableEvents.filter((e) => e.remaining > 0)
}

/** Next alive player clockwise. A player under a skip-turn status loses that status instead of playing. */
function pickNextPlayer(s: GameState): PlayerState {
  const current = getActivePlayer(s)
  let index = s.players.indexOf(current)
  for (let i = 0; i < s.players.length * 2; i++) {
    index = (index + 1) % s.players.length
    const candidate = s.players[index]
    if (!candidate.alive) continue
    const skip = candidate.statuses.findIndex((st) => st.skipTurn)
    if (skip >= 0) {
      candidate.statuses.splice(skip, 1)
      addLog(s, 'turn_skipped', { target: candidate.id })
      continue
    }
    return candidate
  }
  return current
}

export function endTurn(s: GameState): void {
  const current = getActivePlayer(s)
  decayStatuses(s, current)
  decayTableEvents(s)
  const next = pickNextPlayer(s)
  s.turnNumber += 1
  s.activeId = next.id
  s.exchangeCount = 0
  s.phase = 'draw'
  addLog(s, 'turn', { actor: next.id })
  emit(s, { kind: 'turn', player: next.id })
}
