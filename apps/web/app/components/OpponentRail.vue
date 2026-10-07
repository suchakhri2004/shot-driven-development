<script setup lang="ts">
const room = useRoom()

/** Opponents in turn order starting from the player after me, so "who acts next" reads left to right. */
const opponents = computed(() => {
  const players = room.state.value!.players
  const myIndex = players.findIndex((p) => p.id === room.state.value!.me)
  return [...players.slice(myIndex + 1), ...players.slice(0, myIndex)]
})

/** Big tables (5+ opponents): smaller seats on up to two rows, so the whole table fits without scrolling. */
const compact = computed(() => opponents.value.length >= 5)
</script>

<template>
  <div v-if="compact" class="flex flex-wrap justify-center gap-x-0.5 gap-y-1 px-1 pb-1 pt-4">
    <PlayerSeat v-for="p in opponents" :key="p.id" :player="p" compact />
  </div>
  <div v-else class="scroll-x rail gap-3 px-3 pb-1 pt-5">
    <PlayerSeat v-for="p in opponents" :key="p.id" :player="p" class="snap-start" />
  </div>
</template>

<style scoped>
.rail > :deep(:first-child) {
  margin-left: auto;
}
.rail > :deep(:last-child) {
  margin-right: auto;
}
</style>
