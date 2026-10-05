<script setup lang="ts">
/** Draining bar for the server's current decision timer. Re-keyed per decision so it restarts cleanly. */
const props = defineProps<{ timerKey: number | string; totalSec: number }>()

const room = useRoom()
const now = useNow()

const leftMs = computed(() => room.msLeft(now.value))
const seconds = computed(() => Math.ceil(leftMs.value / 1000))
// start the CSS animation partway through, so late joiners / reconnects see the true remaining time
const startOffset = computed(() => -Math.max(0, props.totalSec * 1000 - leftMs.value))
const initial = ref(startOffset.value)
watch(() => props.timerKey, () => (initial.value = startOffset.value))
</script>

<template>
  <div class="flex items-center gap-2">
    <div class="meter-track flex-1">
      <div
        :key="timerKey"
        class="meter-fill"
        :style="{
          backgroundColor: seconds <= 3 ? '#ff3b5c' : '#f2e8dc',
          animation: `shrink ${totalSec * 1000}ms linear ${initial}ms forwards`,
          transition: 'none'
        }"
      />
    </div>
    <span class="w-6 text-right font-mono text-sm" :class="seconds <= 3 ? 'text-danger' : 'text-dim'">{{ seconds }}</span>
  </div>
</template>
