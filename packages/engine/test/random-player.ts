import { projectFor, targetCandidates } from '../src'
import { nextRandom } from '../src/rng'
import type { Action, GameState, PlayerState } from '../src'

export interface Move {
  playerId: string
  action: Action
}

const pick = <T>(rng: { rng: number }, items: T[]): T => items[Math.floor(nextRandom(rng) * items.length)]
const chance = (rng: { rng: number }, p: number) => nextRandom(rng) < p

/** Pay "discard a <element>" costs greedily from the rest of the hand. */
function costCardIds(s: GameState, player: PlayerState, cardId: string): string[] {
  const inst = player.hand.find((c) => c.iid === cardId)!
  const slots = (s.defs[inst.defId].cost.discard ?? []).flatMap((c) => Array.from({ length: c.count }, () => c))
  const used = new Set<string>([cardId])
  const ids: string[] = []
  for (const slot of slots) {
    const match = player.hand.find((c) => {
      const def = s.defs[c.defId]
      return !used.has(c.iid) && (!slot.element || def.element === slot.element) && (!slot.type || def.type === slot.type)
    })
    if (match) {
      used.add(match.iid)
      ids.push(match.iid)
    }
  }
  return ids
}

function playMove(s: GameState, player: PlayerState, cardId: string, rng: { rng: number }): Move {
  const def = s.defs[player.hand.find((c) => c.iid === cardId)!.defId]
  const candidates = targetCandidates(s, player, def)
  const target = candidates.length ? pick(rng, candidates) : undefined
  const artifact = target ? s.players.find((p) => p.id === target)!.artifacts[0] : undefined
  return {
    playerId: player.id,
    action: {
      type: 'play_card',
      cardId,
      targets: target ? [target] : undefined,
      targetCardId: def.target === 'artifact' ? artifact?.iid : undefined,
      costCardIds: costCardIds(s, player, cardId)
    }
  }
}

function respond(s: GameState, rng: { rng: number }): Move {
  const pending = s.pending
  if (pending?.kind !== 'response') throw new Error('not a response window')
  const playerId = pending.eligible.find((id) => !pending.passed.includes(id))!
  const player = s.players.find((p) => p.id === playerId)!
  const hand = projectFor(s, playerId).hand
  const playable = hand.filter((c) => c.playable)
  if (playable.length && chance(rng, 0.6)) return playMove(s, player, pick(rng, playable).iid, rng)
  if (hand.some((c) => c.reason === 'INSUFFICIENT_MANA') && chance(rng, 0.5)) {
    return { playerId, action: { type: 'drink' } }
  }
  return { playerId, action: { type: 'pass_response' } }
}

/** A legal-but-random move for whoever must act next. Used to stress the engine. */
export function nextRandomMove(s: GameState, rng: { rng: number }, actionsThisTurn: number): Move {
  const pending = s.pending
  if (pending?.kind === 'response') return respond(s, rng)
  if (pending?.kind === 'shortfall') {
    const bankHasMana = s.manaBank === null || s.manaBank > 0
    return { playerId: pending.playerId, action: { type: bankHasMana && chance(rng, 0.7) ? 'drink' : 'decline_shortfall' } }
  }
  if (pending?.kind === 'discard') {
    const player = s.players.find((p) => p.id === pending.playerId)!
    return {
      playerId: player.id,
      action: { type: 'choose_discard', cardIds: player.hand.slice(0, pending.count).map((c) => c.iid) }
    }
  }
  if (pending?.kind === 'interlude') {
    const loser = s.players.find((p) => p.alive && !pending.losers.includes(p.id))
    if (pending.mode === 'minigame' && loser && chance(rng, 0.4)) return { playerId: loser.id, action: { type: 'lose_minigame' } }
    return { playerId: pending.playerId, action: { type: 'end_interlude' } }
  }
  if (s.phase === 'opening_shot') {
    return { playerId: s.players.find((p) => p.alive && !p.openingShotDone)!.id, action: { type: 'drink' } }
  }

  const active = s.players.find((p) => p.id === s.activeId)!
  const finish: Move = { playerId: active.id, action: { type: 'finish_turn' } }
  if (actionsThisTurn > 10) return finish

  const others = s.players.filter((p) => p.alive && p.id !== active.id)
  if (others.length && chance(rng, 0.05)) return { playerId: pick(rng, others).id, action: { type: 'drink' } }

  const playable = projectFor(s, active.id).hand.filter((c) => c.playable)
  if (playable.length && chance(rng, 0.7)) return playMove(s, active, pick(rng, playable).iid, rng)
  if (active.mana < 2 && chance(rng, 0.6)) return { playerId: active.id, action: { type: 'drink' } }
  if (active.hand.length && active.mana >= s.exchangeCount + 1 && chance(rng, 0.15)) {
    return { playerId: active.id, action: { type: 'exchange_card', cardId: pick(rng, active.hand).iid } }
  }
  if (active.hand.length && chance(rng, 0.1)) {
    return { playerId: active.id, action: { type: 'discard_card', cardId: pick(rng, active.hand).iid } }
  }
  return finish
}
