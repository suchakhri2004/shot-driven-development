<script setup lang="ts">
import { formatLog } from '~/theme/format-log'

const emit = defineEmits<{ close: [] }>()
const room = useRoom()

const lines = computed(() =>
  [...room.state.value!.log].reverse().map((entry) => ({
    seq: entry.seq,
    turn: entry.turn,
    ...formatLog(entry, { nameOf: room.nameOf, cards: room.cards.value })
  }))
)
</script>

<template>
  <BottomSheet title="Game log" @close="emit('close')">
    <ul class="space-y-1.5 font-mono text-xs">
      <li v-for="line in lines" :key="line.seq" class="flex gap-2 rounded-lg bg-panel2 px-2 py-1.5">
        <span class="w-6 shrink-0 text-right text-dim">{{ line.turn }}</span>
        <GameIcon :name="line.icon" class="mt-0.5" />
        <span class="min-w-0 flex-1 break-words">{{ line.text }}</span>
      </li>
    </ul>
  </BottomSheet>
</template>
