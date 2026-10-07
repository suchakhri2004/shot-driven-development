<script setup lang="ts">
import { DECK_PLAN, MODES } from '@sdd/cards'
import type { LobbyView } from '@sdd/protocol'

/**
 * The host picks how hard the table drinks. Below it: what that means for a table this size,
 * from the bot-game analysis in @sdd/cards deck-plan (estimates, not promises).
 */
const props = defineProps<{ lobby: LobbyView; editable: boolean }>()
const room = useRoom()

/** Table sizes the analysis covers; anyone can peek at another size ("what if 8 of us play?"). */
const SIZES = [2, 3, 4, 5, 6, 7, 8, 9, 10]
const inRoom = computed(() => Math.min(10, Math.max(2, props.lobby.players.length)))
const picked = ref<number | null>(null)
const players = computed(() => picked.value ?? inRoom.value)
const plan = computed(() => DECK_PLAN[props.lobby.mode]?.[players.value])
/** A human turn (play, drink, argue) takes roughly 45-90 seconds. */
const minutes = computed(() => (plan.value ? [Math.round((plan.value.turns * 45) / 60), Math.round((plan.value.turns * 90) / 60)] : null))
</script>

<template>
  <section class="panel space-y-3 p-3">
    <h2 class="px-1 font-display font-bold">โหมดการเล่น</h2>

    <div class="grid grid-cols-1 gap-2">
      <button
        v-for="m in MODES"
        :key="m.id"
        class="mode flex items-center gap-3 rounded-xl border px-3 py-2 text-left"
        :class="lobby.mode === m.id ? 'border-neon bg-neon/10' : 'border-line bg-panel2'"
        :disabled="!editable && lobby.mode !== m.id"
        @click="editable && room.setMode(m.id)"
      >
        <span class="heat" :aria-label="`ความโหด ${m.heat} จาก 5`">
          <i v-for="n in 5" :key="n" :class="{ on: n <= m.heat }" />
        </span>
        <span class="min-w-0 flex-1">
          <b class="font-display">{{ m.name }}</b>
          <span class="block text-xs text-dim">{{ m.blurb }}</span>
        </span>
      </button>
    </div>

    <div class="rounded-xl border border-line bg-shade/60 p-3 text-sm">
      <p class="mb-2 text-xs text-dim">วิเคราะห์ตามจำนวนคน (ประมาณจากการจำลองเล่น) · ตอนนี้ในห้องมี {{ lobby.players.length }} คน</p>
      <div class="mb-3 flex flex-wrap gap-1">
        <button
          v-for="n in SIZES"
          :key="n"
          class="size-chip"
          :class="{ on: n === players, here: n === inRoom }"
          @click="picked = n === inRoom ? null : n"
        >
          {{ n }}
        </button>
        <span class="self-center pl-1 text-xs text-dim">คน</span>
      </div>
      <p v-if="!plan || !minutes" class="text-xs text-dim">ยังไม่มีผลวิเคราะห์สำหรับ {{ players }} คน</p>
      <div v-else class="grid grid-cols-2 gap-2">
        <div><b class="text-lg text-neon">{{ plan.deckSize }}</b> <span class="text-dim">ใบในกอง</span></div>
        <div><b class="text-lg text-neon">{{ minutes[0] }}–{{ minutes[1] }}</b> <span class="text-dim">นาที</span></div>
        <div><b class="text-lg text-neon">~{{ Math.round(plan.shotsPerPlayer) }}</b> <span class="text-dim">ช็อตต่อคน</span></div>
        <div><b class="text-lg text-neon">~{{ Math.round(plan.drinkCalls) }}</b> <span class="text-dim">Last Call ต่อเกม</span></div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mode:disabled {
  opacity: 0.45;
}
.size-chip {
  min-width: 2rem;
  padding: 0.2rem 0.45rem;
  border-radius: 8px;
  font: 700 0.85rem/1.3 'Kanit', sans-serif;
  color: #a08f8b;
  background: #221a1c;
  border: 2px solid #3b2a2c;
}
/* the size of the room right now gets a dashed outline even when another size is picked */
.size-chip.here {
  border-style: dashed;
  border-color: #a08f8b;
}
.size-chip.on {
  color: #f3e7cc;
  background: #e3242b;
  border: 2px solid #050304;
}
.heat {
  display: inline-flex;
  gap: 2px;
}
.heat i {
  width: 7px;
  height: 16px;
  border-radius: 2px;
  background: #3b2a2c;
}
.heat i.on {
  background: #e3242b;
}
</style>
