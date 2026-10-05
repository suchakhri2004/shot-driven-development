<script setup lang="ts">
import type { HandCard } from '@sdd/engine'
import { animate } from 'animejs'

/**
 * Your hand, laid out on a gentle arc like cards held in the fingers. New cards are dealt in with a
 * springy flip from the draw pile (anime.js); the list scrolls sideways when the hand is wide.
 */
const emit = defineEmits<{ inspect: [card: HandCard] }>()
const room = useRoom()
const sound = useSound()

const hand = computed(() => room.state.value!.hand)

/** Tilt and drop per card so the row curves downward at both ends. */
function arc(index: number): Record<string, string> {
  const middle = (hand.value.length - 1) / 2
  const offset = index - middle
  return { '--rot': `${offset * 1.5}deg`, '--drop': `${Math.abs(offset) ** 2 * 1.1}px` }
}

/** Outside your turn every card is "not playable": show those neutral instead of greying the whole hand. */
function playableHint(card: HandCard): boolean | undefined {
  if (card.playable) return true
  return card.reason === 'NOT_YOUR_TURN' || card.reason === 'NOT_ELIGIBLE_TO_RESPOND' ? undefined : false
}

function open(card: HandCard) {
  sound.play('tap')
  emit('inspect', card)
}

/** anime.js "deal" animation, run for each card that enters the hand. */
function onEnter(el: Element, done: () => void) {
  animate(el, {
    translateY: [-220, 0],
    translateX: [60, 0],
    rotate: [-18, 0],
    scale: [0.5, 1],
    opacity: [0, 1],
    duration: 520,
    delay: Math.min(Number((el as HTMLElement).dataset.order ?? 0) * 70, 350),
    ease: 'outBack',
    onComplete: () => done()
  })
}

function onLeave(el: Element, done: () => void) {
  animate(el, { translateY: -60, scale: 0.8, opacity: 0, duration: 220, ease: 'inQuad', onComplete: () => done() })
}
</script>

<template>
  <div class="scroll-x hand-row gap-1.5 px-3 pb-2 pt-4">
    <TransitionGroup :css="false" @enter="onEnter" @leave="onLeave">
      <button
        v-for="(card, index) in hand"
        :key="card.iid"
        :data-order="index"
        class="hand-card shrink-0 snap-center text-left"
        :style="arc(index)"
        :aria-label="room.cards.value[card.defId]?.name"
        @click="open(card)"
      >
        <GameCard :def="room.cards.value[card.defId]" size="sm" :playable="playableHint(card)" />
      </button>
    </TransitionGroup>
    <p v-if="!hand.length" class="w-full py-8 text-center text-sm text-dim">ไม่มีการ์ดในมือ</p>
  </div>
</template>

<style scoped>
/* centre a short hand, but keep a long one scrollable without clipping its first card */
.hand-row > :deep(:first-child) {
  margin-left: auto;
}
.hand-row > :deep(:last-child) {
  margin-right: auto;
}
.hand-card {
  rotate: var(--rot, 0deg);
  translate: 0 var(--drop, 0px);
  transform-origin: 50% 120%;
  transition: translate 0.2s ease, rotate 0.2s ease;
}
.hand-card:active {
  translate: 0 calc(var(--drop, 0px) - 10px);
  rotate: 0deg;
}
</style>
