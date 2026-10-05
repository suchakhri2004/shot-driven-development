<script setup lang="ts">
import { animate } from 'animejs'
import { theme } from '~/theme/theme'

/** Game controls: a round DRINK button in the middle, END TURN on the right, menu on the left. */
const emit = defineEmits<{ menu: [] }>()
const room = useRoom()
const lock = useLock()
const drinkButton = ref<HTMLElement | null>(null)

const state = computed(() => room.state.value!)
const alive = computed(() => !!room.me.value?.alive)
const bankEmpty = computed(() => state.value.manaBank !== null && state.value.manaBank <= 0)
const canDrink = computed(() => {
  if (!alive.value || bankEmpty.value) return false
  if (state.value.phase === 'opening_shot') return !room.me.value!.openingShotDone
  return true
})
const canEnd = computed(() => room.isMyTurn.value && !state.value.pending && state.value.chain.length === 0)

function squish() {
  if (drinkButton.value) animate(drinkButton.value, { scale: [0.86, 1], duration: 450, ease: 'outElastic(1, .5)' })
}
const drink = () => {
  squish()
  return lock.run(() => room.send({ type: 'drink' }))
}
const endTurn = () => lock.run(() => room.send({ type: 'finish_turn' }))
</script>

<template>
  <nav class="dock" :style="{ paddingBottom: 'calc(0.6rem + var(--safe-bottom))' }">
    <button class="side" aria-label="เมนู" @click="emit('menu')">
      <GameIcon name="menu" size="1.4rem" tone="steel" />
    </button>

    <button ref="drinkButton" class="drink" :class="{ off: !canDrink }" :disabled="!canDrink || lock.busy.value" @click="drink">
      <GameIcon name="drink" size="2.1rem" tone="paper" />
      <span class="label">{{ theme.drink.button }}</span>
      <span class="plus">+{{ state.potionYield }}</span>
    </button>

    <button class="end" :class="{ ready: canEnd }" :disabled="!canEnd || lock.busy.value" @click="endTurn">
      <span>จบเทิร์น</span>
      <GameIcon name="endturn" size="1.3rem" :tone="canEnd ? 'green' : 'steel'" />
    </button>
  </nav>
</template>

<style scoped>
.dock {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1.4rem 1rem 0;
  background: linear-gradient(180deg, transparent, rgba(18, 13, 24, 0.9) 45%);
}
/* arcade-style buttons: flat colour, ink rim, a hard "floor" shadow that disappears when pressed */
.side,
.end {
  display: grid;
  place-items: center;
  height: 3.1rem;
  border-radius: 16px;
  background: #221a1c;
  border: 2.5px solid #050304;
  box-shadow: 0 5px 0 #050304;
  transition: transform 0.08s ease, box-shadow 0.08s ease, opacity 0.2s ease, background-color 0.2s ease;
}
.side {
  width: 3.1rem;
}
.end {
  grid-auto-flow: column;
  gap: 0.35rem;
  padding: 0 1.1rem;
  font: 700 0.95rem 'Kanit', 'IBM Plex Sans Thai', sans-serif;
  color: #a08f8b;
}
.end.ready {
  color: #140f10;
  background: #f2e8dc;
}
.side:active,
.end:active:not(:disabled) {
  transform: translateY(4px);
  box-shadow: 0 1px 0 #050304;
}
.end:disabled {
  opacity: 0.6;
}
/* the hero button: a big round whiskey-coloured arcade button */
.drink {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1rem;
  width: 5.8rem;
  height: 5.8rem;
  margin-top: -2.4rem;
  border-radius: 50%;
  color: #f3e7cc;
  background: #e3242b;
  border: 3px solid #050304;
  box-shadow: inset 0 -7px 0 #a8141a, inset 0 5px 0 #ff7b7f, 0 7px 0 #050304;
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}
.drink:active:not(:disabled) {
  transform: translateY(5px);
  box-shadow: inset 0 -4px 0 #a8141a, inset 0 4px 0 #ff7b7f, 0 2px 0 #050304;
}
.drink.off {
  filter: grayscale(0.9) brightness(0.65);
}
.drink .label {
  font: 800 0.8rem/1 'Kanit', sans-serif;
  letter-spacing: 0.02em;
}
.drink .plus {
  position: absolute;
  top: -0.35rem;
  right: -0.25rem;
  padding: 0 0.45rem;
  border-radius: 999px;
  font: 800 0.8rem/1.5 'Kanit', sans-serif;
  color: #140f10;
  background: #f3e7cc;
  border: 2.5px solid #050304;
}
</style>
