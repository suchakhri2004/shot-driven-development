<script setup lang="ts">
import { theme } from '~/theme/theme'

/** End of the night: the winner, and the bar tab (a paper receipt) of who drank what and how they went down. */
const room = useRoom()
const lock = useLock(600)

const state = computed(() => room.state.value!)
const payload = computed(() => room.game.value!)
const winner = computed(() => state.value.players.find((p) => p.id === state.value.winnerId))
const iWon = computed(() => state.value.winnerId === state.value.me)

const minutes = computed(() => {
  const end = payload.value.endedAt ?? payload.value.serverNow
  return Math.max(1, Math.round((end - payload.value.startedAt) / 60000))
})
const printedAt = computed(() => new Date(payload.value.endedAt ?? Date.now()).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }))

/** Ranking: winner first, then the last player to go down, and so on. */
const rows = computed(() => {
  const fallen = [...state.value.eliminationOrder].reverse()
  const ranked = [
    ...(winner.value ? [{ player: winner.value, result: 'WINNER' }] : []),
    ...fallen.map((e) => ({
      player: state.value.players.find((p) => p.id === e.playerId)!,
      result: e.by === 'ko' ? theme.overflow : theme.crashed
    }))
  ]
  return ranked.map((row, i) => ({ ...row, rank: i + 1 }))
})
const totalShots = computed(() => state.value.players.reduce((n, p) => n + p.potionsDrunk, 0))
const topDrinker = computed(() => {
  const sorted = [...state.value.players].sort((a, b) => b.potionsDrunk - a.potionsDrunk)
  return sorted[0] && sorted[0].potionsDrunk > 0 ? sorted[0] : null
})

// confetti: paper scraps already mid-fall (negative delays), so there is never a "row" waiting at the top
const COLORS = ['#e3242b', '#f3e7cc', '#ff6b6f', '#8c1015', '#ffffff', '#140f10']
const confetti = Array.from({ length: 30 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  delay: `-${((i * 0.73) % 4).toFixed(2)}s`,
  dx: `${((i * 53) % 120) - 60}px`,
  duration: `${3.4 + (i % 5) * 0.45}s`,
  color: COLORS[i % COLORS.length],
  wide: i % 3 === 0
}))

const again = () => lock.run(() => room.playAgain())
async function leave() {
  await room.leave()
  await navigateTo('/')
}
</script>

<template>
  <div class="anim-fade bg-atmosphere fixed inset-0 z-30 overflow-y-auto">
    <span
      v-for="(c, i) in confetti"
      :key="i"
      class="scrap pointer-events-none fixed top-0"
      :style="{ left: c.left, '--dx': c.dx, background: c.color, width: c.wide ? '12px' : '7px', animation: `confetti ${c.duration} linear ${c.delay} infinite` }"
    />

    <div
      class="relative mx-auto flex min-h-full w-full max-w-md flex-col items-center gap-5 px-4"
      :style="{ paddingBlock: 'calc(1.5rem + var(--safe-top)) calc(1.5rem + var(--safe-bottom))' }"
    >
      <section class="anim-pop flex flex-col items-center text-center">
        <GameIcon name="trophy" variant="sticker" size="4.6rem" />
        <div class="mt-2 font-mono text-xs tracking-widest text-neon">$ {{ theme.winner }}</div>
        <div class="mt-2 flex items-center gap-3">
          <PlayerAvatar v-if="winner" :avatar="winner.avatar" :size="58" />
          <h1 class="winner-name">{{ winner?.name ?? 'ไม่มีผู้ชนะ' }}</h1>
        </div>
        <span v-if="iWon" class="you-win anim-stamp">คุณชนะ!</span>
      </section>

      <!-- the bar tab -->
      <section class="receipt">
        <div class="r-title">THE DEPLOY BAR</div>
        <div class="r-sub">BAR TAB #{{ room.lobby.value?.code }} · {{ printedAt }}</div>
        <div class="r-rule" />
        <div v-for="row in rows" :key="row.player.id" class="r-row">
          <span class="r-rank">{{ row.rank }}</span>
          <span class="r-name">{{ row.player.name }}</span>
          <span class="r-dots" />
          <span class="r-shots">{{ row.player.potionsDrunk }}×</span>
          <span class="r-result" :class="{ win: row.result === 'WINNER' }">{{ row.result }}</span>
        </div>
        <div class="r-rule" />
        <div class="r-row"><span class="r-name">ช็อตรวมทั้งโต๊ะ</span><span class="r-dots" /><b>{{ totalShots }}</b></div>
        <div class="r-row"><span class="r-name">เวลา / เทิร์น</span><span class="r-dots" /><b>{{ minutes }} นาที · {{ state.turnNumber }}</b></div>
        <div v-if="topDrinker" class="r-row"><span class="r-name">สายซดประจำโต๊ะ</span><span class="r-dots" /><b>{{ topDrinker.name }}</b></div>
        <div class="r-rule" />
        <div class="r-foot">ขอบคุณที่อุดหนุน · ดื่มอย่างรับผิดชอบ</div>
        <div class="r-barcode" />
      </section>

      <div class="mt-auto w-full space-y-2">
        <button v-if="room.isHost.value" class="btn btn-primary h-14 w-full text-lg" :disabled="lock.busy.value" @click="again">
          <GameIcon name="rebase" tone="paper" /> เล่นอีกรอบ
        </button>
        <p v-else class="text-center text-sm text-dim">รอเจ้าของห้องกด "เล่นอีกรอบ"</p>
        <button class="btn btn-ghost w-full text-dim" @click="leave">ออกจากห้อง</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrap {
  height: 12px;
  border: 1.5px solid #050304;
  border-radius: 2px;
}
.winner-name {
  font: 800 2.3rem/1 'Kanit', sans-serif;
  color: #f3e7cc;
  -webkit-text-stroke: 5px #050304;
  paint-order: stroke fill;
}
.you-win {
  margin-top: 0.6rem;
  padding: 0.1rem 0.9rem;
  font: 800 1.1rem 'Kanit', sans-serif;
  color: #f2e8dc;
  border: 3px solid #f2e8dc;
  border-radius: 8px;
}
/* a thermal-printer receipt with a torn zig-zag bottom edge */
.receipt {
  width: 100%;
  padding: 1rem 1rem 1.6rem;
  color: #140f10;
  background: #f3e7cc;
  font: 500 0.82rem/1.5 'JetBrains Mono', monospace;
  transform: rotate(-1deg);
  filter: drop-shadow(0 6px 0 #050304);
  -webkit-mask: conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 50% / 16px 100%;
  mask: conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 50% / 16px 100%;
}
.r-title {
  text-align: center;
  font: 800 1.15rem 'Kanit', sans-serif;
  letter-spacing: 0.12em;
}
.r-sub {
  text-align: center;
  font-size: 0.68rem;
  color: #6e5c59;
}
.r-rule {
  margin: 0.5rem 0;
  border-top: 2px dashed #140f10;
}
.r-row {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
}
.r-rank {
  width: 1.1rem;
  font-weight: 800;
}
.r-name {
  max-width: 45%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'IBM Plex Sans Thai', sans-serif;
  font-weight: 600;
}
.r-dots {
  flex: 1;
  border-bottom: 2px dotted #9e8c88;
  transform: translateY(-4px);
}
.r-shots {
  font-weight: 800;
}
.r-result {
  font-size: 0.62rem;
  font-weight: 800;
  color: #b23a2f;
}
.r-result.win {
  color: #140f10;
  text-decoration: underline 2px;
}
.r-foot {
  text-align: center;
  font-size: 0.7rem;
  color: #6e5c59;
}
.r-barcode {
  height: 34px;
  margin: 0.5rem auto 0;
  width: 70%;
  background: repeating-linear-gradient(90deg, #140f10 0 2px, transparent 2px 4px, #140f10 4px 7px, transparent 7px 8px, #140f10 8px 9px, transparent 9px 12px);
}
</style>
