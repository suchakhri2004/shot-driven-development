import type { Action, CardDef } from '@sdd/engine'
import type { GameStatePayload } from '@sdd/protocol'
import type { TestClient } from './helpers'

/**
 * A deliberately dumb player that only uses what a real client can see (its own PublicState).
 * Returns the next action it wants to take, or null if it has nothing to do right now.
 */
export function decide(view: GameStatePayload, cards: Record<string, CardDef>, actionsThisTurn: number): Action | null {
  const s = view.state
  const me = s.players.find((p) => p.id === s.me)!
  if (!me.alive || s.finished) return null

  const pending = s.pending
  if (pending?.kind === 'response') {
    if (!pending.eligible.includes(me.id) || pending.passed.includes(me.id)) return null
    const card = s.hand.find((c) => c.playable)
    return card ? play(card.iid, view, cards) : { type: 'pass_response' }
  }
  if (pending?.kind === 'shortfall') return pending.playerId === me.id ? { type: 'drink' } : null
  if (pending?.kind === 'discard') {
    return pending.playerId === me.id
      ? { type: 'choose_discard', cardIds: s.hand.slice(0, pending.count).map((c) => c.iid) }
      : null
  }
  if (pending?.kind === 'interlude') {
    if (pending.playerId === me.id) return { type: 'end_interlude' }
    return pending.mode !== 'pause' && !pending.losers.includes(me.id) ? { type: 'take_drink' } : null
  }

  if (s.phase === 'opening_shot') return me.openingShotDone ? null : { type: 'drink' }
  if (s.phase !== 'action' || s.activeId !== me.id) return null

  if (actionsThisTurn < 8) {
    const playable = s.hand.find((c) => c.playable)
    if (playable) return play(playable.iid, view, cards)
    if (me.mana < 2) return { type: 'drink' }
  }
  return { type: 'finish_turn' }
}

function play(iid: string, view: GameStatePayload, cards: Record<string, CardDef>): Action {
  const s = view.state
  const card = s.hand.find((c) => c.iid === iid)!
  const def = cards[card.defId]
  const opponents = s.players.filter((p) => p.alive && p.id !== s.me)
  const target =
    def.target === 'artifact' ? s.players.find((p) => p.alive && p.artifacts.length) : opponents[0]
  const costCardIds: string[] = []
  for (const slot of def.cost.discard ?? []) {
    for (let n = 0; n < slot.count; n++) {
      const pay = s.hand.find(
        (c) =>
          c.iid !== iid &&
          !costCardIds.includes(c.iid) &&
          (!slot.element || cards[c.defId].element === slot.element)
      )
      if (pay) costCardIds.push(pay.iid)
    }
  }
  return {
    type: 'play_card',
    cardId: iid,
    targets: target ? [target.id] : undefined,
    targetCardId: def.target === 'artifact' ? target?.artifacts[0]?.iid : undefined,
    costCardIds
  }
}

/** What a player does when an action was refused: give up on the idea and move the game along. */
function safeFallback(view: GameStatePayload): Action | null {
  const s = view.state
  if (s.pending?.kind === 'response') return s.pending.eligible.includes(s.me) ? { type: 'pass_response' } : null
  if (s.pending?.kind === 'shortfall') return s.pending.playerId === s.me ? { type: 'decline_shortfall' } : null
  if (!s.pending && s.phase === 'action' && s.activeId === s.me) return { type: 'finish_turn' }
  return null
}

/** Lets a client play on its own whenever the server tells it something changed. */
export function runBot(client: TestClient): void {
  let lastVersion = -1
  let turn = -1
  let actionsThisTurn = 0
  const step = () => {
    const view = client.game
    if (!view || view.state.version === lastVersion) return
    lastVersion = view.state.version
    if (view.state.turnNumber !== turn) {
      turn = view.state.turnNumber
      actionsThisTurn = 0
    }
    const action = decide(view, client.joined!.cards, actionsThisTurn)
    if (!action) return
    actionsThisTurn++
    void client.action(action as unknown as Record<string, unknown>).then((result) => {
      if (result.ok) return
      if (result.error === 'RATE_LIMITED') {
        lastVersion = -1
        return void setTimeout(step, 250)
      }
      const safe = safeFallback(view)
      if (safe) void client.action(safe as unknown as Record<string, unknown>)
    })
  }
  client.socket.on('game_state', step)
  step()
}
