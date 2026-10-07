<script setup lang="ts">
import type { CardDef, LogEntry } from '@sdd/engine'
import { formatLog } from '~/theme/format-log'

/**
 * "Just happened": the last few things worth knowing, kept on the table so nobody has to catch a
 * banner in the two seconds it is on screen. Built from the engine log; tap a line to see its card.
 */
const room = useRoom()

/** Log kinds that matter to the whole table. Turn bookkeeping, draws and plain drinks are left out. */
const WORTH_SHOWING = new Set([
  'event', 'play', 'damage', 'heal', 'counter', 'fizzle', 'status', 'swap_hands', 'artifact_destroyed',
  'eliminated', 'shortfall_hp', 'turn_skipped', 'penalty_drink', 'pause_start', 'minigame_start', 'drinkcall_start'
])
const SHOWN = 3

const lines = computed(() => {
  const log = room.state.value?.log ?? []
  const picked: LogEntry[] = []
  for (let i = log.length - 1; i >= 0 && picked.length < SHOWN; i--) if (WORTH_SHOWING.has(log[i].kind)) picked.push(log[i])
  return picked.map((entry) => ({ entry, ...formatLog(entry, { nameOf: room.nameOf, cards: room.cards.value }) }))
})

const viewing = ref<CardDef | null>(null)
const open = (entry: LogEntry) => {
  const def = entry.card ? room.cards.value[entry.card] : undefined
  if (def) viewing.value = def
}
</script>

<template>
  <div v-if="lines.length" class="feed relative z-10 w-full max-w-[17rem]">
    <TransitionGroup name="feed" tag="ul" class="space-y-0.5">
      <li
        v-for="(line, i) in lines"
        :key="line.entry.seq"
        class="flex items-center gap-1.5 truncate rounded-md px-2 py-0.5 text-left text-[11px]"
        :class="[i === 0 ? 'newest' : 'text-ink/60', line.entry.card ? 'cursor-pointer' : '']"
        @click="open(line.entry)"
      >
        <GameIcon :name="line.icon" size="0.9rem" class="shrink-0" />
        <span class="truncate">{{ line.text }}</span>
      </li>
    </TransitionGroup>

    <BottomSheet v-if="viewing" :title="viewing.name" @close="viewing = null">
      <div class="flex justify-center pb-2"><GameCard :def="viewing" size="lg" /></div>
    </BottomSheet>
  </div>
</template>

<style scoped>
.newest {
  color: #f3e7cc;
  background: rgba(5, 3, 4, 0.55);
}
.feed-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.feed-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}
.feed-leave-active {
  display: none;
}
</style>
