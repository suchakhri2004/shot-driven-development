import type { CardDef, Fx, PublicPlayer } from '@sdd/engine'
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

/**
 * "X drank" notice shown to the whole table, so nobody can press drink without actually drinking.
 * `lost` = a penalty shot (mini-game, drink call, git blame): Shot Stack it cost them, if any.
 */
export interface DrinkCall {
  id: number
  name: string
  avatar: string
  shot: number
  sober: boolean
  lost?: number
}

const DRINK_CALL_MS = 1500

const floaters = ref<Floater[]>([])
const banners = ref<Banner[]>([])
const drinkCalls = ref<DrinkCall[]>([])
let drinkCallsFreeAt = 0
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

  /** Drink notices play one after another (the opening shot can bring several at once). */
  function drinkCall(player: PublicPlayer, myId: string, lost?: number) {
    const item = { id: nextId++, name: player.name, avatar: player.avatar, shot: player.potionsDrunk, sober: player.nonAlcoholic, lost }
    const delay = Math.max(0, drinkCallsFreeAt - Date.now())
    drinkCallsFreeAt = Date.now() + delay + DRINK_CALL_MS
    setTimeout(() => {
      drinkCalls.value = [...drinkCalls.value, item]
      removeLater(drinkCalls, item, DRINK_CALL_MS)
      sound.play('cheers')
      if (player.id !== myId) sound.buzz([30, 40, 30])
    }, delay)
  }

  function shake(playerId: string) {
    shaking.value = { ...shaking.value, [playerId]: nextId++ }
  }

  function screenFlash(color: string) {
    flash.value = { id: nextId++, color }
  }

  function handle(fx: Fx, myId: string, cards: Record<string, CardDef>, players: PublicPlayer[]) {
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
      case 'drink': {
        floater('drink', fx.target, `+${fx.amount}`)
        burstAtPlayer(fx.target, 'drink')
        sound.play('drink')
        if (fx.target === myId) sound.buzz(25)
        const drinker = players.find((p) => p.id === fx.target)
        if (drinker) drinkCall(drinker, myId)
        return
      }
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
      case 'interlude':
        sound.play('event')
        sound.buzz([60, 40, 60])
        return
      case 'interlude_end':
        sound.play('turn')
        return
      case 'penalty_drink': {
        if (fx.amount > 0) floater('mana', fx.target, `-${fx.amount}`)
        const loser = players.find((p) => p.id === fx.target)
        if (loser) drinkCall(loser, myId, fx.amount)
        return
      }
      case 'winner':
        sound.play('win')
        return
      case 'draw':
        return
    }
  }

  function run(list: Fx[], myId: string, cards: Record<string, CardDef>, players: PublicPlayer[]) {
    for (const fx of list) handle(fx, myId, cards, players)
  }

  return { floaters, banners, drinkCalls, flash, shaking, run }
}
