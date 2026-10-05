<script setup lang="ts">
import { theme } from '~/theme/theme'

/** The middle of the table: green felt, the two piles, whatever spell is being cast, and who we are waiting for. */
const room = useRoom()
const state = computed(() => room.state.value!)
const topItem = computed(() => state.value.chain[state.value.chain.length - 1])
const waitingOn = computed(() => {
  const pending = state.value.pending
  if (!pending) return null
  if (pending.kind === 'response') {
    const names = pending.eligible.filter((id) => !pending.passed.includes(id)).map((id) => room.nameOf(id))
    return names.length ? { text: `รอ ${names.join(', ')} ตอบโต้`, pending } : null
  }
  if (pending.playerId === state.value.me) return null
  const what = pending.kind === 'shortfall' ? 'ตัดสินใจเรื่อง Shot ที่ขาด' : `เลือกทิ้งการ์ด ${pending.count} ใบ`
  return { text: `รอ ${room.nameOf(pending.playerId)} ${what}`, pending }
})

const hint = computed(() => {
  const s = state.value
  if (s.finished) return 'เกมจบแล้ว'
  if (s.phase === 'action' && s.activeId === s.me) return 'เทิร์นของคุณ: เล่นการ์ด ซด ทิ้ง หรือ Rebase แล้วกดจบเทิร์น'
  if (s.phase === 'draw' || s.phase === 'turn_end') return `เทิร์นของ ${room.nameOf(s.activeId)}`
  return `${room.nameOf(s.activeId)} กำลังเล่น…`
})
</script>

<template>
  <section class="tabletop relative flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-3 py-2 text-center">
    <div class="felt" aria-hidden="true" />

    <!-- the two piles -->
    <div class="pile left" :title="theme.drawPile">
      <div class="stack">
        <CardBack :size="38" class="s1" /><CardBack :size="38" class="s2" /><CardBack :size="38" class="s3" />
      </div>
      <div class="count"><GameIcon name="backlog" tone="steel" /> {{ state.drawPileCount }}</div>
    </div>
    <div class="pile right" :title="theme.discardPile">
      <div class="stack"><CardBack :size="38" class="s1 dim" /><CardBack :size="38" class="s2 dim" /></div>
      <div class="count"><GameIcon name="trash" tone="steel" /> {{ state.discardCount }}</div>
    </div>

    <!-- the spell being cast and every answer stacked on top of it -->
    <div v-if="state.chain.length" class="anim-pop relative z-10 flex flex-col items-center gap-1">
      <div class="text-xs text-ink/80">
        <b class="text-amber">{{ room.nameOf(topItem.ownerId) }}</b> เล่น
        <template v-if="topItem.targets.length">ใส่ <b class="text-white">{{ topItem.targets.map((id) => room.nameOf(id)).join(', ') }}</b></template>
      </div>
      <div class="flex items-center">
        <GameCard
          v-for="(item, i) in state.chain"
          :key="item.id"
          :def="room.cards.value[item.defId]"
          size="sm"
          :style="{ marginLeft: i ? '-5.5em' : 0, transform: `rotate(${(i - (state.chain.length - 1) / 2) * 5}deg)`, zIndex: i }"
        />
      </div>
    </div>
    <p v-else class="hint relative z-10 max-w-[13rem]">{{ hint }}</p>

    <div v-if="waitingOn" class="relative z-10 w-full max-w-xs space-y-1">
      <div class="flex items-center justify-center gap-1.5 text-sm text-amber"><GameIcon name="hourglass" tone="gold" />{{ waitingOn.text }}</div>
      <CountdownBar :timer-key="waitingOn.pending.id" :total-sec="waitingOn.pending.timeoutSec" />
    </div>

    <!-- incidents that stay on the table -->
    <div v-if="state.tableEvents.length" class="relative z-10 flex flex-wrap justify-center gap-1">
      <span v-for="e in state.tableEvents" :key="e.inst.iid" class="incident">
        <GameIcon name="incident" size="0.95rem" />{{ room.cards.value[e.inst.defId]?.name }} · {{ e.remaining }}
      </span>
    </div>

    <div class="relative z-10 font-mono text-[11px] text-dim">เทิร์น {{ state.turnNumber }}</div>
  </section>
</template>

<style scoped>
/* a card table: green baize inside a wooden rail with a dark outer edge */
.felt {
  position: absolute;
  inset: 10px 14px;
  border-radius: 50%;
  background:
    radial-gradient(ellipse at 50% 35%, rgba(255, 255, 255, 0.07), transparent 60%),
    repeating-radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.05) 0 1px, transparent 1px 4px),
    #6e1016;
  box-shadow:
    inset 0 0 0 3px rgba(0, 0, 0, 0.25),
    inset 0 10px 24px rgba(0, 0, 0, 0.35),
    0 0 0 9px #2a1f20,
    0 0 0 11px #141011,
    0 0 0 14px #050304,
    0 9px 0 14px #050304;
}
.hint {
  font: 500 0.9rem/1.35 'Kanit', 'IBM Plex Sans Thai', sans-serif;
  color: rgba(243, 231, 204, 0.85);
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.35);
}
.pile {
  position: absolute;
  bottom: 14%;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.pile.left {
  left: 9%;
}
.pile.right {
  right: 9%;
}
.stack {
  position: relative;
  width: 38px;
  height: 56px;
}
.stack > * {
  position: absolute;
  inset: 0;
}
.s1 {
  translate: 0 0;
}
.s2 {
  translate: 2px -2px;
  rotate: 3deg;
}
.s3 {
  translate: 4px -4px;
  rotate: -2deg;
}
.dim {
  filter: saturate(0.4) brightness(0.8);
}
.count {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  padding: 0 0.4rem;
  border-radius: 999px;
  font: 700 0.7rem/1.5 'Kanit', sans-serif;
  color: #f3e7cc;
  background: rgba(18, 13, 24, 0.75);
}
.incident {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.1rem 0.6rem;
  border-radius: 6px;
  font: 700 0.7rem 'Kanit', sans-serif;
  color: #140f10;
  background: #f6c93d;
  border: 2px solid #050304;
  box-shadow: 2px 2px 0 #050304;
}
</style>
