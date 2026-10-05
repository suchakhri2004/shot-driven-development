import { alivePlayersFrom } from './lookup'
import type { Effect, EffectCtx, EffectTarget, GameState, Step } from './types'

function targetIds(s: GameState, to: EffectTarget, ctx: EffectCtx): string[] {
  const origin = ctx.sourceId ?? s.activeId
  const allowed = (id: string) => !ctx.excluded.includes(id)
  switch (to) {
    case 'self':
      return ctx.sourceId ? [ctx.sourceId] : []
    case 'targets':
      return ctx.targets.filter(allowed)
    case 'all-opponents':
      return alivePlayersFrom(s, origin)
        .filter((p) => p.id !== ctx.sourceId && allowed(p.id))
        .map((p) => p.id)
    case 'all-players':
      return alivePlayersFrom(s, origin)
        .filter((p) => allowed(p.id))
        .map((p) => p.id)
  }
}

/** One effect becomes one step per target (seat order), so each can pause for decisions independently. */
function expandEffect(s: GameState, effect: Effect, ctx: EffectCtx): Step[] {
  switch (effect.kind) {
    case 'swapHands':
    case 'counter':
    case 'destroyArtifact':
      return [{ effect, targetId: null, ctx }]
    case 'draw':
      return targetIds(s, effect.to, ctx).flatMap((id) =>
        Array.from({ length: effect.count }, () => ({ effect: { ...effect, count: 1 }, targetId: id, ctx }))
      )
    default:
      return targetIds(s, effect.to, ctx).map((id) => ({ effect, targetId: id, ctx }))
  }
}

/** Queue effects at the FRONT so they resolve before anything already waiting. Returns steps queued. */
export function queueEffects(s: GameState, effects: Effect[], ctx: EffectCtx): number {
  const steps = effects.flatMap((effect) => expandEffect(s, effect, ctx))
  s.queue.unshift(...steps)
  return steps.length
}
