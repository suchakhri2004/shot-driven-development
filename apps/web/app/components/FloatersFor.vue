<script setup lang="ts">
/** Floating "-2" / "+3" numbers that rise from one player's seat. Lives inside that seat, so no coordinates needed. */
const props = defineProps<{ playerId: string }>()
const fx = useFx()

const mine = computed(() => fx.floaters.value.filter((f) => f.playerId === props.playerId))
const color: Record<string, string> = {
  damage: '#ff3b5c',
  shortfall: '#ff3b5c',
  heal: '#f2e8dc',
  mana: '#ff4d52',
  drink: '#ff4d52'
}
/** small icon in front of the number, when the number is about something other than plain HP */
const icon: Record<string, string | undefined> = { drink: 'shot', mana: 'shot', shortfall: 'hp' }
</script>

<template>
  <div class="pointer-events-none absolute inset-x-0 top-1 z-10 flex flex-col items-center">
    <span
      v-for="f in mine"
      :key="f.id"
      class="inline-flex items-center gap-1 font-display text-xl font-bold"
      :style="{ color: color[f.kind], animation: 'float-up 1.2s ease-out forwards', textShadow: '0 0 10px currentColor' }"
    >
      <GameIcon v-if="icon[f.kind]" :name="icon[f.kind]!" size="1rem" />{{ f.text }}
    </span>
  </div>
</template>
