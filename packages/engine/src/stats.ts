import { getDef } from './lookup'
import type { GameState, Modifier, PlayerState, Stat } from './types'

function sum(modifiers: Modifier[] | undefined, stat: Stat): number {
  return (modifiers ?? []).reduce((total, m) => (m.stat === stat ? total + m.delta : total), 0)
}

/**
 * Effective value of a stat for a player: config base + artifacts + statuses + table events.
 * Never write modifier results back into state; always ask here.
 */
export function getStat(s: GameState, player: PlayerState, stat: Stat): number {
  let total = stat === 'handLimit' ? s.config.handLimit : stat === 'potionYield' ? s.config.potionYield : 0
  for (const artifact of player.artifacts) total += sum(getDef(s, artifact.defId).modifiers, stat)
  for (const status of player.statuses) total += sum(status.modifiers, stat)
  for (const event of s.tableEvents) total += sum(getDef(s, event.inst.defId).modifiers, stat)
  return stat === 'handLimit' || stat === 'potionYield' ? Math.max(0, total) : total
}
