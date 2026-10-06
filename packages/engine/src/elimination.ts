import { addLog, emit } from './log'
import { alivePlayers } from './lookup'
import type { GameState, PlayerState } from './types'

export function eliminate(s: GameState, player: PlayerState, by: 'hp' | 'ko'): void {
  if (!player.alive) return
  player.alive = false
  player.eliminatedBy = by
  s.discardPile.push(...player.hand, ...player.artifacts)
  player.hand = []
  player.artifacts = []
  player.statuses = []
  if (s.manaBank !== null) s.manaBank += player.mana
  player.mana = 0
  // house rule H4: going out costs real shots (counted, nothing gained)
  player.potionsDrunk += s.config.knockoutShots
  s.eliminationOrder.push({ playerId: player.id, turn: s.turnNumber, by })
  addLog(s, 'eliminated', { target: player.id, extra: by, amount: s.config.knockoutShots })
  emit(s, { kind: 'eliminated', target: player.id, by })
  dropPendingFor(s, player)
}

function dropPendingFor(s: GameState, player: PlayerState): void {
  const pending = s.pending
  if (!pending) return
  if (pending.kind === 'response') pending.eligible = pending.eligible.filter((id) => id !== player.id)
  else if (pending.playerId === player.id) s.pending = null
}

/** R17: HP <= 0 means out immediately. Also ends the game when one player remains. */
export function checkEliminations(s: GameState): void {
  for (const player of s.players) {
    if (player.alive && player.hp <= 0) eliminate(s, player, 'hp')
  }
  if (!s.finished && alivePlayers(s).length <= 1) finishGame(s)
}

function finishGame(s: GameState): void {
  const survivor = alivePlayers(s)[0]
  s.finished = true
  s.phase = 'game_over'
  s.winnerId = survivor?.id ?? null
  s.pending = null
  s.queue = []
  s.chain = []
  addLog(s, 'winner', { actor: s.winnerId ?? undefined })
  emit(s, { kind: 'winner', player: s.winnerId })
}
