<script setup lang="ts">
import { MINI_GAMES } from '@sdd/cards'
import { theme } from '~/theme/theme'

/** House rule H3: the whole table sees the coffee break countdown or the mini-game rules. */
const room = useRoom()
const lock = useLock()
const now = useNow()

const state = computed(() => room.state.value!)
const interlude = computed(() => (state.value.pending?.kind === 'interlude' ? state.value.pending : null))
const game = computed(() => (interlude.value ? MINI_GAMES[interlude.value.roll % MINI_GAMES.length] : null))
const ownerName = computed(() => room.nameOf(interlude.value?.playerId))
const canEnd = computed(() => interlude.value?.playerId === state.value.me || room.isHost.value)
const iLost = computed(() => !!interlude.value?.losers.includes(state.value.me))
const amAlive = computed(() => !!room.me.value?.alive)

const clock = computed(() => {
  const sec = Math.ceil(room.msLeft(now.value) / 1000)
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
})

const end = () => lock.run(() => room.send({ type: 'end_interlude' }))
const lose = () => lock.run(() => room.send({ type: 'lose_minigame' }))
</script>

<template>
  <div v-if="interlude" class="arrive bg-atmosphere fixed inset-0 z-[45] flex flex-col items-center justify-center gap-5 overflow-y-auto px-6 py-8 text-center">
    <!-- coffee break -->
    <template v-if="interlude.mode === 'pause'">
      <GameIcon name="coffee-break" variant="sticker" tone="paper" size="5rem" class="steam" />
      <div>
        <span class="stamp">COFFEE BREAK</span>
        <p class="mt-5 text-sm text-dim">{{ ownerName }} ขอพักเกม ไปเข้าห้องน้ำ เติมแก้ว หรือกินกับแกล้มกันก่อน</p>
      </div>
      <div class="font-mono text-6xl font-bold text-neon">{{ clock }}</div>
      <p class="text-xs text-dim">ครบเวลาแล้วเกมจะเล่นต่อเอง</p>
      <button v-if="canEnd" class="btn btn-primary h-14 w-full max-w-xs text-lg" :disabled="lock.busy.value" @click="end">
        <GameIcon name="play" tone="paper" /> เลิกพัก เล่นต่อ
      </button>
      <p v-else class="text-sm text-dim">รอ {{ ownerName }} หรือเจ้าของห้องกดเลิกพัก</p>
    </template>

    <!-- mini-game: rules only, the table plays it for real -->
    <template v-else-if="game">
      <div>
        <span class="stamp">MINI GAME</span>
        <p class="mt-2 text-xs text-dim">{{ ownerName }} เปิด Hackathon · ปิดเองใน {{ clock }}</p>
      </div>
      <div class="rules-card">
        <GameIcon name="hackathon" variant="print" plate="#e3242b" size="2.6rem" />
        <h2 class="font-display text-2xl font-bold">{{ game.title }}</h2>
        <p class="text-base leading-relaxed">{{ game.rules }}</p>
      </div>
      <p class="text-sm">
        ใครแพ้ <b class="text-neon">ดื่ม 1 ช็อตจริง</b> แล้วกดปุ่มด้านล่าง <span class="whitespace-nowrap">(เสีย {{ state.config.miniGamePenalty }} {{ theme.mana.name }})</span>
      </p>

      <div v-if="interlude.losers.length" class="flex flex-wrap justify-center gap-2">
        <span v-for="id in interlude.losers" :key="id" class="tag">{{ room.nameOf(id) }} แพ้</span>
      </div>

      <div class="flex w-full max-w-xs flex-col gap-2">
        <button v-if="amAlive" class="btn btn-amber h-14 text-lg" :disabled="iLost || lock.busy.value" @click="lose">
          <GameIcon name="drink" tone="paper" /> {{ iLost ? 'ดื่มแล้ว' : 'ฉันแพ้' }}
        </button>
        <button v-if="canEnd" class="btn h-12" :disabled="lock.busy.value" @click="end">จบมินิเกม เล่นต่อ</button>
        <p v-else class="text-xs text-dim">{{ ownerName }} หรือเจ้าของห้องกดจบมินิเกม</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* wait for the "X played a card" animation (1.9s) before covering the table */
.arrive {
  animation: fade-in 0.3s ease 1.5s both;
}
.stamp {
  display: inline-block;
  padding: 0.1rem 0.9rem;
  font: 800 2.2rem/1.15 'Kanit', sans-serif;
  letter-spacing: 0.04em;
  color: #ff4d52;
  border: 4px solid currentColor;
  border-radius: 10px;
  box-shadow: inset 0 0 0 3px #0e0a0b, inset 0 0 0 5px currentColor;
  transform: rotate(-4deg);
  animation: stamp 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) 1.6s both;
}
.rules-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  max-width: 22rem;
  padding: 1.1rem 1.2rem 1.3rem;
  color: #140f10;
  background: #f3e7cc;
  border: 3px solid #050304;
  border-radius: 14px;
  box-shadow: 0 6px 0 #050304;
  transform: rotate(-1deg);
}
.steam {
  animation: bob 2.4s ease-in-out infinite;
}
@keyframes bob {
  0%,
  100% {
    translate: 0 -3px;
  }
  50% {
    translate: 0 4px;
  }
}
</style>
