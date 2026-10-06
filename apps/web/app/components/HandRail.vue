<script setup lang="ts">
import type { HandCard } from '@sdd/engine'
import { animate } from 'animejs'

/**
 * Your hand. Outside your turn: small cards on a gentle arc, so the table stays visible.
 * On your turn: big cards you swipe through one at a time, like holding them up to read; the card in
 * the middle is in focus, its neighbours peek in from the sides. New cards are dealt in with a
 * springy flip (anime.js). Tapping a card opens it to play.
 */
const emit = defineEmits<{ inspect: [card: HandCard] }>()
const room = useRoom()
const sound = useSound()

const hand = computed(() => room.state.value!.hand)
const big = computed(() => room.isMyTurn.value && !room.state.value!.pending)

/** Tilt and drop per card so the small row curves downward at both ends. */
function arc(index: number): Record<string, string> {
  if (big.value) return {}
  const middle = (hand.value.length - 1) / 2
  const offset = index - middle
  return { '--rot': `${offset * 1.5}deg`, '--drop': `${Math.abs(offset) ** 2 * 1.1}px` }
}

/** Outside your turn every card is "not playable": show those neutral instead of greying the whole hand. */
function playableHint(card: HandCard): boolean | undefined {
  if (card.playable) return true
  return card.reason === 'NOT_YOUR_TURN' || card.reason === 'NOT_ELIGIBLE_TO_RESPOND' ? undefined : false
}

function open(card: HandCard, index: number) {
  sound.play('tap')
  // in the big hand, a tap on a side card brings it to the middle first
  if (big.value && index !== focused.value) return scrollTo(index)
  emit('inspect', card)
}

/* ── which card is in the middle of the big hand ── */
const row = ref<HTMLElement | null>(null)
const focused = ref(0)
let frame = 0

function cards(): HTMLElement[] {
  return row.value ? [...row.value.querySelectorAll<HTMLElement>('.hand-card')] : []
}

function updateFocus() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    const el = row.value
    if (!el) return
    const middle = el.scrollLeft + el.clientWidth / 2
    const distances = cards().map((c) => Math.abs(c.offsetLeft + c.offsetWidth / 2 - middle))
    focused.value = distances.indexOf(Math.min(...distances))
  })
}

function scrollTo(index: number, smooth = true) {
  const el = row.value
  const card = cards()[index]
  if (!el || !card) return
  el.scrollTo({ left: card.offsetLeft + card.offsetWidth / 2 - el.clientWidth / 2, behavior: smooth ? 'smooth' : 'instant' })
}

// a new turn starts on the first card you can actually play
watch(big, async (on) => {
  if (!on) return
  await nextTick()
  scrollTo(Math.max(0, hand.value.findIndex((c) => c.playable)), false)
  updateFocus()
})
watch(() => hand.value.length, () => nextTick(updateFocus))
onBeforeUnmount(() => cancelAnimationFrame(frame))

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
  <div class="relative">
    <!-- where you are in the big hand -->
    <div v-if="big && hand.length > 1" class="pager" aria-hidden="true">
      <i v-for="(card, index) in hand" :key="card.iid" :class="{ on: index === focused, live: card.playable }" @click="scrollTo(index)" />
    </div>
    <div ref="row" class="scroll-x gap-1.5 px-3 pb-2" :style="{ paddingTop: big ? '0.4rem' : '1rem' }" :class="big ? 'hand-big' : 'hand-row'" @scroll.passive="updateFocus">
      <TransitionGroup :css="false" @enter="onEnter" @leave="onLeave">
        <button
          v-for="(card, index) in hand"
          :key="card.iid"
          :data-order="index"
          class="hand-card shrink-0 snap-center text-left"
          :class="{ focused: big && index === focused }"
          :style="arc(index)"
          :aria-label="room.cards.value[card.defId]?.name"
          @click="open(card, index)"
        >
          <GameCard :def="room.cards.value[card.defId]" :size="big ? 'md' : 'sm'" :playable="playableHint(card)" />
        </button>
      </TransitionGroup>
      <p v-if="!hand.length" class="w-full py-8 text-center text-sm text-dim">ไม่มีการ์ดในมือ</p>
    </div>
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
  transition:
    translate 0.2s ease,
    rotate 0.2s ease,
    scale 0.2s ease,
    filter 0.2s ease;
}
.hand-row .hand-card:active {
  translate: 0 calc(var(--drop, 0px) - 10px);
  rotate: 0deg;
}

/* big hand: one card in the middle, the rest peeking in and overlapping like a held fan */
.hand-big {
  scroll-snap-type: x mandatory;
  /* 82px = half a card at --card-size 15px, so the first and last card can sit in the middle */
  padding-inline: calc(50% - 82px);
}
.hand-big .hand-card {
  margin-inline: -0.9em;
  scale: 0.86;
  filter: brightness(0.7);
}
.hand-big .hand-card.focused {
  z-index: 2;
  scale: 1;
  filter: none;
}
.hand-big :deep(.card) {
  --card-size: 15px;
}
.pager {
  display: flex;
  justify-content: center;
  gap: 6px;
  padding-top: 6px;
}
.pager i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #3b2a2c;
  transition: background 0.2s ease, width 0.2s ease;
}
.pager i.live {
  background: #7a2a2e;
}
.pager i.on {
  width: 18px;
  border-radius: 4px;
  background: #e3242b;
}
</style>
