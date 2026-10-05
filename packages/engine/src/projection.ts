import { describePlayability } from './playability'
import { getPlayer } from './lookup'
import { getStat } from './stats'
import type { GameState, PublicPlayer, PublicState } from './types'

const LOG_WINDOW = 120

/**
 * What one player is allowed to see. Other hands and the draw-pile order never leave the server:
 * opponents appear only as a card count.
 */
export function projectFor(s: GameState, viewerId: string): PublicState {
  const viewer = getPlayer(s, viewerId)

  const players: PublicPlayer[] = s.players.map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    nonAlcoholic: p.nonAlcoholic,
    seat: p.seat,
    hp: p.hp,
    maxHp: s.config.maxHp,
    mana: p.mana,
    handCount: p.hand.length,
    artifacts: p.artifacts,
    statuses: p.statuses.map(({ id, name, remaining }) => ({ id, name, remaining })),
    alive: p.alive,
    eliminatedBy: p.eliminatedBy,
    potionsDrunk: p.potionsDrunk,
    openingShotDone: p.openingShotDone
  }))

  return {
    version: s.version,
    phase: s.phase,
    me: viewer.id,
    activeId: s.activeId,
    turnNumber: s.turnNumber,
    exchangeCount: s.exchangeCount,
    exchangeCost: s.exchangeCount + 1,
    players,
    hand: viewer.hand.map((card) => ({ ...card, ...describePlayability(s, viewer, card) })),
    handLimit: getStat(s, viewer, 'handLimit'),
    potionYield: getStat(s, viewer, 'potionYield'),
    drawPileCount: s.drawPile.length,
    discardCount: s.discardPile.length,
    discardTop: s.discardPile[s.discardPile.length - 1] ?? null,
    tableEvents: s.tableEvents,
    manaBank: s.manaBank,
    chain: s.chain.map(({ id, defId, ownerId, targets, negatedFor }) => ({ id, defId, ownerId, targets, negatedFor })),
    pending: s.pending,
    log: s.log.slice(-LOG_WINDOW),
    finished: s.finished,
    winnerId: s.winnerId,
    eliminationOrder: s.eliminationOrder,
    config: s.config
  }
}
