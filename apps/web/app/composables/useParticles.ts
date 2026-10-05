import { animate } from 'animejs'

/**
 * Short particle effects (anime.js) played at a player's seat or at a point on screen.
 * Particles are plain divs that animate only transform/opacity and remove themselves when done.
 */
export type BurstKind = 'hit' | 'heal' | 'mana' | 'drink' | 'cast' | 'guard' | 'smoke'

interface Spec {
  count: number
  colors: string[]
  size: [number, number]
  /** how far a particle travels: [minX, maxX, minY, maxY] */
  dx: number
  dyUp: number
  dyDown: number
  duration: number
  ease: string
}

const SPECS: Record<Exclude<BurstKind, 'guard'>, Spec> = {
  hit: { count: 18, colors: ['#ff3b5c', '#ff8a3d', '#ffe066'], size: [4, 9], dx: 80, dyUp: 70, dyDown: 70, duration: 650, ease: 'outCubic' },
  heal: { count: 12, colors: ['#f2e8dc', '#ffffff'], size: [4, 8], dx: 34, dyUp: 120, dyDown: -30, duration: 1000, ease: 'outQuad' },
  mana: { count: 9, colors: ['#ff4d52', '#ffb3b5'], size: [4, 7], dx: 30, dyUp: 100, dyDown: -20, duration: 900, ease: 'outQuad' },
  drink: { count: 14, colors: ['#ff4d52', '#ff7b7f', '#fff3c4'], size: [4, 8], dx: 46, dyUp: 90, dyDown: 20, duration: 800, ease: 'outQuad' },
  cast: { count: 22, colors: ['#ffffff'], size: [4, 9], dx: 90, dyUp: 90, dyDown: 90, duration: 750, ease: 'outCubic' },
  smoke: { count: 12, colors: ['#a08f8b', '#4a5a70'], size: [14, 26], dx: 38, dyUp: 90, dyDown: -40, duration: 1400, ease: 'outQuad' }
}

let layer: HTMLElement | null = null

function ensureLayer(): HTMLElement {
  if (layer?.isConnected) return layer
  layer = document.createElement('div')
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:58;overflow:hidden'
  document.body.appendChild(layer)
  return layer
}

const rand = (min: number, max: number) => min + Math.random() * (max - min)
const motionOk = () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches

function centerOf(playerId: string): { x: number; y: number } | null {
  const el = document.querySelector(`[data-player-id="${playerId}"]`)
  if (!el) return null
  const box = el.getBoundingClientRect()
  return { x: box.left + box.width / 2, y: box.top + Math.min(box.height / 2, 40) }
}

function spawn(x: number, y: number, color: string, size: number, dx: number, dy: number, duration: number, ease: string, round = true) {
  const dot = document.createElement('div')
  dot.style.cssText = `position:absolute;left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;border-radius:${round ? '50%' : '2px'};background:${color};box-shadow:0 0 ${size * 1.5}px ${color};will-change:transform,opacity`
  ensureLayer().appendChild(dot)
  animate(dot, {
    translateX: [0, dx],
    translateY: [0, dy],
    scale: [1, 0.2],
    opacity: [1, 0],
    duration,
    ease,
    onComplete: () => dot.remove()
  })
}

/** An expanding ring: used for shields and shock waves. */
function ring(x: number, y: number, color: string, size = 70) {
  const el = document.createElement('div')
  el.style.cssText = `position:absolute;left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;border-radius:50%;border:3px solid ${color};box-shadow:0 0 18px ${color};will-change:transform,opacity`
  ensureLayer().appendChild(el)
  animate(el, { scale: [0.3, 1.9], opacity: [0.9, 0], duration: 600, ease: 'outCubic', onComplete: () => el.remove() })
}

/** Play an effect at a player's seat. `color` overrides the default palette (used for card colours). */
export function burstAtPlayer(playerId: string, kind: BurstKind, color?: string): void {
  if (!import.meta.client || !motionOk()) return
  const at = centerOf(playerId)
  if (!at) return

  if (kind === 'guard') return ring(at.x, at.y, color ?? '#38bdf8', 84)
  const spec = SPECS[kind]
  if (kind === 'hit' || kind === 'cast') ring(at.x, at.y, color ?? '#ff3b5c', 56)

  for (let i = 0; i < spec.count; i++) {
    const angle = (i / spec.count) * Math.PI * 2 + rand(-0.3, 0.3)
    const radial = kind === 'hit' || kind === 'cast'
    const dx = radial ? Math.cos(angle) * rand(spec.dx * 0.4, spec.dx) : rand(-spec.dx, spec.dx)
    const dy = radial ? Math.sin(angle) * rand(spec.dyUp * 0.4, spec.dyUp) : -rand(spec.dyUp * 0.4, spec.dyUp) - spec.dyDown * 0
    const tint = color ?? spec.colors[i % spec.colors.length]
    spawn(at.x + rand(-8, 8), at.y + rand(-6, 6), tint, rand(spec.size[0], spec.size[1]), dx, dy, spec.duration * rand(0.8, 1.2), spec.ease, kind !== 'smoke')
  }
}
