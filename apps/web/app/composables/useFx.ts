import type { CardDef, Fx } from '@sdd/engine'
import { cardAccent } from '~/theme/theme'
import { burstAtPlayer } from './useParticles'

export type FloaterKind = 'damage' | 'heal' | 'mana' | 'drink' | 'shortfall'

export interface Floater {
  id: number
  kind: FloaterKind
  playerId: string
  text: string
}

export interface Banner {
  id: number
  kind: 'play' | 'counter' | 'event' | 'turn' | 'eliminated' | 'opening'
  playerId?: string
  defId?: string
  by?: 'hp' | 'ko'
}

const floaters = ref<Floater[]>([])
const banners = ref<Banner[]>([])
const flash = ref<{ id: number; color: string } | null>(null)
const shaking = ref<Record<string, number>>({})
let nextId = 1

function removeLater<T extends { id: number }>(list: Ref<T[]>, item: T, ms: number) {
  setTimeout(() => (list.value = list.value.filter((x) => x.id !== item.id)), ms)
}

/**
 * Turns engine animation cues into short-lived on-screen effects + sounds.
 * Effects are fire-and-forget: they never block input and clean themselves up.
 */
export function useFx() {
  const sound = useSound()

  function floater(kind: FloaterKind, playerId: string, text: string) {
    const item = { id: nextId++, kind, playerId, text }
    floaters.value = [...floaters.value, item]
    removeLater(floaters, item, 1300)
  }

  function banner(data: Omit<Banner, 'id'>, ms = 1900) {
    const item = { id: nextId++, ...data }
    banners.value = [...banners.value.slice(-2), item]
    removeLater(banners, item, ms)
  }

  function shake(playerId: string) {
    shaking.value = { ...shaking.value, [playerId]: nextId++ }
  }

  function screenFlash(color: string) {
    flash.value = { id: nextId++, color }
  }

  function handle(fx: Fx, myId: string, cards: Record<string, CardDef>) {
    const colorOf = (defId: string) => (cards[defId] ? cardAccent(cards[defId]) : undefined)
    switch (fx.kind) {
      case 'damage':
      case 'shortfall':
        if (fx.amount <= 0) return
        floater(fx.kind === 'damage' ? 'damage' : 'shortfall', fx.target, `-${fx.amount}`)
        shake(fx.target)
        burstAtPlayer(fx.target, 'hit')
        sound.play('damage')
        if (fx.target === myId) {
          screenFlash('rgba(255,59,92,0.5)')
          sound.buzz(120)
        }
        return
      case 'heal':
        if (fx.amount > 0) {
          floater('heal', fx.target, `+${fx.amount}`)
          burstAtPlayer(fx.target, 'heal')
          sound.play('heal')
        }
        return
      case 'mana':
        if (fx.delta !== 0) floater('mana', fx.target, `${fx.delta > 0 ? '+' : ''}${fx.delta}`)
        if (fx.delta > 0) burstAtPlayer(fx.target, 'mana')
        return
      case 'drink':
        floater('drink', fx.target, `+${fx.amount}`)
        burstAtPlayer(fx.target, 'drink')
        sound.play('drink')
        if (fx.target === myId) sound.buzz(25)
        return
      case 'play':
        banner({ kind: 'play', playerId: fx.owner, defId: fx.defId })
        for (const target of fx.targets) if (target !== fx.owner) burstAtPlayer(target, 'cast', colorOf(fx.defId))
        sound.play('cast')
        return
      case 'counter':
        banner({ kind: 'counter', playerId: fx.owner, defId: fx.defId }, 1500)
        burstAtPlayer(fx.owner, 'guard')
        sound.play('counter')
        return
      case 'event':
        banner({ kind: 'event', defId: fx.defId }, 2600)
        sound.play('event')
        sound.buzz([80, 60, 80])
        return
      case 'turn':
        if (fx.player === myId) {
          banner({ kind: 'turn', playerId: fx.player }, 1400)
          sound.play('turn')
          sound.buzz([40, 40, 40])
        }
        return
      case 'eliminated':
        banner({ kind: 'eliminated', playerId: fx.target, by: fx.by }, 2600)
        burstAtPlayer(fx.target, 'smoke')
        sound.play('out')
        return
      case 'opening_done':
        sound.play('cheers')
        return
      case 'winner':
        sound.play('win')
        return
      case 'draw':
        return
    }
  }

  function run(list: Fx[], myId: string, cards: Record<string, CardDef>) {
    for (const fx of list) handle(fx, myId, cards)
  }

  return { floaters, banners, flash, shaking, run }
}
