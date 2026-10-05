<script setup lang="ts">
/**
 * A round bottle-end of whiskey that fills with the player's Shot Stack (full at FULL_AT shots).
 * Flat print colours with an ink rim; the liquid slides up and down with a soft slosh on top.
 */
const props = withDefaults(defineProps<{ mana: number; size?: number }>(), { size: 76 })

const FULL_AT = 10
const fill = computed(() => Math.min(1, props.mana / FULL_AT))
</script>

<template>
  <div class="vial relative grid shrink-0 place-items-center overflow-hidden rounded-full" :style="{ width: `${size}px`, height: `${size}px`, '--fill': fill }">
    <div class="level">
      <div class="wave" />
      <div class="body" />
    </div>
    <div class="glint" />
    <span class="number relative z-10" :style="{ fontSize: `${size * 0.4}px` }">{{ mana }}</span>
  </div>
</template>

<style scoped>
.vial {
  background: #1d1517;
  border: 3px solid #050304;
  box-shadow: inset 0 0 0 3px #3b2a2c;
}
.level {
  position: absolute;
  inset: 0;
  transform: translate3d(0, calc((1 - var(--fill)) * 100%), 0);
  transition: transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.body {
  position: absolute;
  inset: 7px 0 0;
  background: #e3242b;
  /* darker band at the bottom of the glass: a flat two-tone fill, like print */
  box-shadow: inset 0 -14px 0 #a8141a;
}
.wave {
  position: absolute;
  top: 0;
  left: -50%;
  width: 200%;
  height: 10px;
  background: radial-gradient(ellipse at 50% 100%, #e3242b 54%, transparent 56%) 0 0 / 24px 10px repeat-x;
  animation: slosh 2.4s linear infinite;
}
.glint {
  position: absolute;
  left: 22%;
  top: 14%;
  width: 18%;
  height: 34%;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.28);
  transform: rotate(18deg);
}
.number {
  font: 800 1em 'Kanit', sans-serif;
  color: #f3e7cc;
  -webkit-text-stroke: 3px #050304;
  paint-order: stroke fill;
  line-height: 1;
}
@keyframes slosh {
  to {
    transform: translate3d(24px, 0, 0);
  }
}
</style>
