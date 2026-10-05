import { startInterlude } from './actions/interlude'
import { drawCard } from './deck'
import { addLog, emit } from './log'
import { findPlayer } from './lookup'
import { giveMana } from './resources'
import { payManaOrShortfall } from './shortfall'
import { getStat } from './stats'
import type { Effect, EffectCtx, GameState, PlayerState, Step } from './types'

type EffectOf<K extends Effect['kind']> = Extract<Effect, { kind: K }>

/** Run one queued step. Steps that target a dead player are skipped. */
export function runStep(s: GameState, step: Step): void {
  const { effect, ctx } = step
  const target = step.targetId ? findPlayer(s, step.targetId) : undefined
  if (step.targetId && !target?.alive) return

  switch (effect.kind) {
    case 'damage':
      return dealDamage(s, target!, effect, ctx)
    case 'heal':
      return heal(s, target!, effect, ctx)
    case 'gainMana':
      return gainMana(s, target!, effect)
    case 'loseMana':
      return payManaOrShortfall(s, target!, effect.amount)
    case 'draw':
      return drawFromEffect(s, target!, step)
    case 'discard':
      return forceDiscard(s, target!, effect.count)
    case 'status':
      return addStatus(s, target!, effect, ctx)
    case 'swapHands':
      return swapHands(s, ctx)
    case 'counter':
      return counterSpell(s, ctx)
    case 'destroyArtifact':
      return destroyArtifact(s, ctx)
    case 'interlude':
      if (ctx.sourceId) startInterlude(s, ctx.sourceId, effect.mode)
      return
  }
}

function dealDamage(s: GameState, target: PlayerState, effect: EffectOf<'damage'>, ctx: EffectCtx): void {
  const source = ctx.sourceId ? findPlayer(s, ctx.sourceId) : undefined
  const dealt = source ? getStat(s, source, 'damageDealt') : 0
  const amount = Math.max(0, effect.amount + dealt + getStat(s, target, 'damageTaken'))
  target.hp -= amount
  addLog(s, 'damage', { actor: ctx.sourceId ?? undefined, target: target.id, amount, card: ctx.defId })
  emit(s, { kind: 'damage', target: target.id, amount })
}

function heal(s: GameState, target: PlayerState, effect: EffectOf<'heal'>, ctx: EffectCtx): void {
  const healed = Math.max(0, Math.min(s.config.maxHp, target.hp + effect.amount) - target.hp)
  target.hp += healed
  addLog(s, 'heal', { actor: ctx.sourceId ?? undefined, target: target.id, amount: healed, card: ctx.defId })
  emit(s, { kind: 'heal', target: target.id, amount: healed })
}

function gainMana(s: GameState, target: PlayerState, effect: EffectOf<'gainMana'>): void {
  const given = giveMana(s, target, effect.amount)
  addLog(s, 'mana', { target: target.id, amount: given })
  emit(s, { kind: 'mana', target: target.id, delta: given })
}

/** One step draws one card. If an Event shows up, it resolves first and this draw is retried. */
function drawFromEffect(s: GameState, target: PlayerState, step: Step): void {
  const result = drawCard(s, target)
  if (result.kind === 'event') s.queue.splice(result.queued, 0, step)
  else if (result.kind === 'card') addLog(s, 'draw', { target: target.id, amount: 1 })
}

/** R14: cards you cannot discard cost 1 mana each instead. */
function forceDiscard(s: GameState, target: PlayerState, count: number): void {
  if (target.hand.length > count) {
    s.pending = {
      id: s.nextPendingId++,
      kind: 'discard',
      playerId: target.id,
      count,
      timeoutSec: s.config.discardChoiceSec
    }
    return
  }
  const missing = count - target.hand.length
  const dropped = target.hand.splice(0)
  s.discardPile.push(...dropped)
  if (dropped.length) addLog(s, 'discard', { target: target.id, amount: dropped.length })
  if (missing > 0) payManaOrShortfall(s, target, missing)
}

function addStatus(s: GameState, target: PlayerState, effect: EffectOf<'status'>, ctx: EffectCtx): void {
  const { status } = effect
  target.statuses = target.statuses.filter((existing) => existing.id !== status.id)
  target.statuses.push({
    id: status.id,
    name: status.name,
    modifiers: status.modifiers,
    remaining: status.turns,
    skipTurn: status.skipTurn,
    fromCard: ctx.defId
  })
  addLog(s, 'status', { actor: ctx.sourceId ?? undefined, target: target.id, card: ctx.defId, extra: status.id })
}

function swapHands(s: GameState, ctx: EffectCtx): void {
  const caster = ctx.sourceId ? findPlayer(s, ctx.sourceId) : undefined
  const other = findPlayer(s, ctx.targets[0])
  if (!caster?.alive || !other?.alive) return
  ;[caster.hand, other.hand] = [other.hand, caster.hand]
  addLog(s, 'swap_hands', { actor: caster.id, target: other.id, card: ctx.defId })
}

/** A counter protects its owner from the item it answers; other targets of that item are unaffected. */
function counterSpell(s: GameState, ctx: EffectCtx): void {
  const item = s.chain.find((i) => i.id === ctx.chainItemId)
  if (!item || !ctx.sourceId) return
  item.negatedFor.push(ctx.sourceId)
  addLog(s, 'counter', { actor: ctx.sourceId, target: item.ownerId, card: ctx.defId })
  emit(s, { kind: 'counter', owner: ctx.sourceId, defId: ctx.defId })
}

function destroyArtifact(s: GameState, ctx: EffectCtx): void {
  const owner = findPlayer(s, ctx.targets[0])
  if (!owner) return
  const index = owner.artifacts.findIndex((a) => a.iid === ctx.targetCardId)
  if (index < 0) return
  const [destroyed] = owner.artifacts.splice(index, 1)
  s.discardPile.push(destroyed)
  addLog(s, 'artifact_destroyed', { actor: ctx.sourceId ?? undefined, target: owner.id, card: destroyed.defId })
}
