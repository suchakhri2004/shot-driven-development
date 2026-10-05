<script setup lang="ts">
/**
 * Circular health gauge. The coloured arc follows HP at once; a red "ghost" arc trails behind it,
 * so a hit visibly drains away (the fighting-game health bar trick). Put an avatar or a number in the slot.
 */
const props = withDefaults(defineProps<{ hp: number; maxHp: number; size?: number; stroke?: number }>(), { size: 60, stroke: 6 })

const radius = computed(() => (props.size - props.stroke) / 2 - 1)
const circumference = computed(() => 2 * Math.PI * radius.value)
const ratio = computed(() => Math.max(0, Math.min(1, props.hp / props.maxHp)))
const color = computed(() => (ratio.value > 0.6 ? '#f2e8dc' : ratio.value > 0.3 ? '#f2a33a' : '#e3242b'))
const offset = computed(() => circumference.value * (1 - ratio.value))
</script>

<template>
  <div class="relative grid shrink-0 place-items-center" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg :width="size" :height="size" class="absolute inset-0 -rotate-90" aria-hidden="true">
      <!-- ink outline + dark track -->
      <circle :cx="size / 2" :cy="size / 2" :r="radius" fill="none" stroke="#050304" :stroke-width="stroke + 4" />
      <circle :cx="size / 2" :cy="size / 2" :r="radius" fill="none" stroke="#2c2022" :stroke-width="stroke" />
      <circle class="ring-ghost" :cx="size / 2" :cy="size / 2" :r="radius" fill="none" stroke="#ef4b3f" :stroke-width="stroke" :stroke-dasharray="circumference" :stroke-dashoffset="offset" />
      <circle class="ring-main" :cx="size / 2" :cy="size / 2" :r="radius" fill="none" :stroke="color" :stroke-width="stroke" :stroke-dasharray="circumference" :stroke-dashoffset="offset" />
    </svg>
    <slot />
  </div>
</template>

<style scoped>
.ring-main {
  transition: stroke-dashoffset 0.25s ease, stroke 0.3s ease;
}
.ring-ghost {
  transition: stroke-dashoffset 0.8s ease 0.4s;
}
</style>
