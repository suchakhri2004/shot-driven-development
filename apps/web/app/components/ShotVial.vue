<script setup lang="ts">
/**
 * A round bottle-end of whiskey that fills with the player's Shot Stack (full at FULL_AT shots).
 * Flat print colours with an ink rim. When the stack changes the liquid sloshes (tilts one way,
 * then the other, then settles); a drink also sends a few bubbles up.
 */
const props = withDefaults(defineProps<{ mana: number; size?: number }>(), { size: 76 })

const FULL_AT = 10
const SLOSH_MS = 1100
const fill = computed(() => Math.min(1, props.mana / FULL_AT))

const slosh = ref<'up' | 'down' | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined
watch(
  () => props.mana,
  (now, before) => {
    slosh.value = null
    // restart the animation even if the previous slosh is still running
    requestAnimationFrame(() => (slosh.value = now > before ? 'up' : 'down'))
    clearTimeout(timer)
    timer = setTimeout(() => (slosh.value = null), SLOSH_MS)
  }
)
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div
    class="vial relative grid shrink-0 place-items-center overflow-hidden rounded-full"
    :style="{ width: `${size}px`, height: `${size}px`, '--fill': fill, '--size': `${size}px` }"
  >
    <div class="level" :class="slosh">
      <div class="wave" />
      <div class="body">
        <template v-if="slosh === 'up'">
          <i v-for="n in 4" :key="n" class="bubble" :style="{ left: `${32 + n * 9}%`, animationDelay: `${n * 0.09}s` }" />
        </template>
      </div>
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
/* wider and deeper than the glass, so tilting the surface never shows an empty corner */
.level {
  position: absolute;
  top: 0;
  left: -30%;
  right: -30%;
  height: 160%;
  transform: translate3d(0, calc((1 - var(--fill)) * var(--size)), 0);
  transform-origin: 50% 0;
  transition: transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.level.up,
.level.down {
  animation: tilt 1.1s ease-out;
}
.level.down {
  animation-duration: 0.8s;
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
.level.up .wave {
  animation-duration: 0.5s;
}
.bubble {
  position: absolute;
  bottom: 30%;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  border: 1.5px solid #ffb3b5;
  animation: rise 0.8s ease-out both;
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
/* a damped swing of the surface */
@keyframes tilt {
  0% {
    rotate: 0deg;
  }
  18% {
    rotate: -14deg;
  }
  42% {
    rotate: 9deg;
  }
  64% {
    rotate: -4deg;
  }
  84% {
    rotate: 1.5deg;
  }
  100% {
    rotate: 0deg;
  }
}
@keyframes rise {
  from {
    opacity: 1;
    translate: 0 0;
  }
  to {
    opacity: 0;
    translate: 0 -38px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .level.up,
  .level.down,
  .bubble {
    animation: none;
  }
}
</style>
