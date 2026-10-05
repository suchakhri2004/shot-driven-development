<script setup lang="ts">
const props = defineProps<{ hp: number; maxHp: number }>()

const ratio = computed(() => Math.max(0, Math.min(1, props.hp / props.maxHp)))
const color = computed(() => (ratio.value > 0.6 ? '#f2e8dc' : ratio.value > 0.3 ? '#ff4d52' : '#ff3b5c'))
</script>

<template>
  <div class="meter-track">
    <div class="meter-fill" :style="{ transform: `scaleX(${ratio})`, backgroundColor: color }" />
  </div>
</template>
