<script setup lang="ts">
import { DRINK_CALLS, MINI_GAMES } from '@sdd/cards'
import { theme } from '~/theme/theme'

/** House rule H3: the whole table sees the coffee break countdown, the mini-game rules or the drink call. */
const room = useRoom()
const lock = useLock()
const now = useNow()

const state = computed(() => room.state.value!)
const interlude = computed(() => (state.value.pending?.kind === 'interlude' ? state.value.pending : null))
const ownerName = computed(() => room.nameOf(interlude.value?.playerId))
/** What a mini-game or a drink call shows: the same screen, different words. */
const call = computed(() => {
  const i = interlude.value
  if (!i || i.mode === 'pause') return null
  if (i.mode === 'minigame') {
    const game = MINI_GAMES[i.roll % MINI_GAMES.length]
    return {
      stamp: 'MINI GAME',
      icon: 'hackathon',
      source: `${ownerName.value} เปิด Hackathon`,
      title: game.title,
      text: game.rules,
      hint: `ใครแพ้ ดื่ม 1 ช็อตจริง แล้วกดปุ่มด้านล่าง (เสีย ${state.value.config.miniGamePenalty} ${theme.mana.name})`,
      button: 'ฉันแพ้',
      done: 'แพ้',
      end: 'จบมินิเกม เล่นต่อ'
    }
  }
  return {
    stamp: 'LAST CALL',
    icon: 'last-call',
    source: 'Incident',
    title: 'ใครโดนบ้าง?',
    text: DRINK_CALLS[i.roll % DRINK_CALLS.length].text,
    hint: 'ใครเข้าข่าย ดื่ม 1 ช็อตจริง แล้วกดปุ่มด้านล่าง',
    button: 'ฉันโดน ดื่มแล้ว',
    done: 'ดื่มแล้ว',
    end: 'ไปต่อ'
  }
})
const canEnd = computed(() => interlude.value?.playerId === state.value.me || room.isHost.value)
const iLost = computed(() => !!interlude.value?.losers.includes(state.value.me))
const amAlive = computed(() => !!room.me.value?.alive)

const clock = computed(() => {
  const sec = Math.ceil(room.msLeft(now.value) / 1000)
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
})

const end = () => lock.run(() => room.send({ type: 'end_interlude' }))
const lose = () => lock.run(() => room.send({ type: 'take_drink' }))
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

    <!-- mini-game or drink call: the app only says what to do, the table does it for real -->
    <template v-else-if="call">
      <div>
        <span class="stamp">{{ call.stamp }}</span>
        <p class="mt-2 text-xs text-dim">{{ call.source }} · ปิดเองใน {{ clock }}</p>
      </div>
      <div class="rules-card">
        <GameIcon :name="call.icon" variant="print" plate="#e3242b" size="2.6rem" />
        <h2 class="font-display text-2xl font-bold">{{ call.title }}</h2>
        <p class="text-lg leading-relaxed">{{ call.text }}</p>
      </div>
      <p class="text-sm">{{ call.hint }}</p>

      <div v-if="interlude.losers.length" class="flex flex-wrap justify-center gap-2">
        <span v-for="id in interlude.losers" :key="id" class="tag">{{ room.nameOf(id) }} {{ call.done }}</span>
      </div>

      <div class="flex w-full max-w-xs flex-col gap-2">
        <button v-if="amAlive" class="btn btn-amber h-14 text-lg" :disabled="iLost || lock.busy.value" @click="lose">
          <GameIcon name="drink" tone="paper" /> {{ iLost ? 'ดื่มแล้ว' : call.button }}
        </button>
        <button v-if="canEnd" class="btn h-12" :disabled="lock.busy.value" @click="end">{{ call.end }}</button>
        <p v-else class="text-xs text-dim">{{ ownerName }} หรือเจ้าของห้องกด{{ call.end }}</p>
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
