<script setup lang="ts">
import { DECK_PLAN, MODES } from '@sdd/cards'
import type { LobbyView } from '@sdd/protocol'

/**
 * The host picks how hard the table drinks. Below it: what that means for a table this size,
 * from the bot-game analysis in @sdd/cards deck-plan (estimates, not promises).
 */
const props = defineProps<{ lobby: LobbyView; editable: boolean }>()
const room = useRoom()

const players = computed(() => Math.min(6, Math.max(2, props.lobby.players.length)))
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

    <div v-if="plan && minutes" class="rounded-xl border border-line bg-shade/60 p-3 text-sm">
      <p class="mb-2 text-xs text-dim">วิเคราะห์โต๊ะ {{ players }} คน ในโหมดนี้ (ประมาณจากการจำลองเล่น)</p>
      <div class="grid grid-cols-2 gap-2">
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
