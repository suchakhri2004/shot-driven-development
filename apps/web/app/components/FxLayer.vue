<script setup lang="ts">
import { BANNER_MS } from '~/composables/useFx'
import { theme } from '~/theme/theme'

/** Big one-shot moments drawn over the table: cards being cast, blocks, incidents, players going down. */
const room = useRoom()
const fx = useFx()

const defOf = (id?: string) => (id ? room.cards.value[id] : undefined)
</script>

<template>
  <Teleport to="body">
    <!-- red flash at the screen edges when I take damage -->
    <div
      v-if="fx.flash.value"
      :key="fx.flash.value.id"
      class="pointer-events-none fixed inset-0 z-50"
      :style="{ background: `radial-gradient(circle, transparent 45%, ${fx.flash.value.color})`, animation: 'flash 0.5s ease-out forwards' }"
    />

    <div class="pointer-events-none fixed inset-x-0 top-[26%] z-50 flex flex-col items-center gap-3 px-4">
      <template v-for="b in fx.banners.value" :key="b.id">
        <!-- a card was played: it flips up over the table -->
        <div
          v-if="b.kind === 'play' && defOf(b.defId)"
          class="pointer-events-auto flex flex-col items-center gap-2"
          :style="{ animation: `cast-fly ${BANNER_MS.play}ms ease forwards` }"
          @click="fx.dismiss(b.id)"
        >
          <span class="tag">{{ room.nameOf(b.playerId) }} เล่น</span>
          <GameCard :def="defOf(b.defId)!" size="md" />
        </div>

        <!-- a block: a blue rubber stamp -->
        <div v-else-if="b.kind === 'counter'" class="flex flex-col items-center gap-2">
          <span class="stamp blue anim-stamp">CATCH!</span>
          <span class="tag">{{ room.nameOf(b.playerId) }} · {{ defOf(b.defId)?.name }}</span>
        </div>
      </template>
    </div>

    <!-- someone drank: a notice on every screen so a drink cannot be pressed in secret -->
    <div
      v-for="d in fx.drinkCalls.value"
      :key="d.id"
      class="pointer-events-none fixed inset-x-0 top-[33%] z-[56] flex justify-center px-4"
    >
      <div class="drink-call">
        <PlayerAvatar :avatar="d.avatar" :size="48" />
        <div class="flex min-w-0 flex-col items-start gap-1">
          <span class="stamp red anim-stamp">{{ d.sober ? 'ซดน้ำ!' : 'ซด!' }}</span>
          <span class="tag">{{ d.name }} · ช็อตที่ {{ d.shot }}<template v-if="d.lost"> · {{ theme.mana.name }} -{{ d.lost }}</template></span>
        </div>
      </div>
    </div>

    <!-- "your turn": at the top edge so it never covers a card or a sheet -->
    <div
      v-for="b in fx.banners.value.filter((x) => x.kind === 'turn')"
      :key="b.id"
      class="pointer-events-none fixed inset-x-0 z-[55] flex justify-center"
      :style="{ top: 'calc(0.6rem + var(--safe-top))' }"
    >
      <span class="turn-tag" style="animation: cast-fly 1.4s ease forwards">เทิร์นของคุณ!</span>
    </div>

    <!-- incident: hazard tape across the screen + the card -->
    <template v-for="b in fx.banners.value.filter((x) => x.kind === 'event')" :key="b.id">
      <div class="pointer-events-none fixed inset-0 z-50 bg-danger" style="animation: siren 0.5s ease-in-out 9 both" />
      <div class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4" @click="fx.dismiss(b.id)">
        <div class="hazard anim-pop"><span>INCIDENT!</span></div>
        <GameCard v-if="defOf(b.defId)" :def="defOf(b.defId)!" size="lg" class="anim-pop" />
        <span class="text-xs text-ink/70">แตะเพื่อปิด</span>
      </div>
    </template>

    <!-- someone went down: a big red rubber stamp -->
    <template v-for="b in fx.banners.value.filter((x) => x.kind === 'eliminated' && !room.state.value?.finished)" :key="b.id">
      <div class="fixed inset-0 z-50 grid place-items-center bg-black/60" style="animation: fade-in 0.2s ease" @click="fx.dismiss(b.id)">
        <div class="flex flex-col items-center gap-3">
          <span class="stamp red big anim-stamp">{{ b.by === 'ko' ? theme.overflow : theme.crashed }}</span>
          <span class="tag"><GameIcon name="skull" tone="ink" /> {{ room.nameOf(b.playerId) }}</span>
          <span v-if="room.state.value?.config.knockoutShots" class="stamp red">ดื่ม {{ room.state.value.config.knockoutShots }} ช็อต</span>
        </div>
      </div>
    </template>
  </Teleport>
</template>

<style scoped>
.stamp {
  display: inline-block;
  padding: 0.1rem 0.9rem;
  font: 800 2rem/1.1 'Kanit', sans-serif;
  letter-spacing: 0.04em;
  border: 4px solid currentColor;
  border-radius: 10px;
  background: rgba(18, 13, 24, 0.85);
  box-shadow: inset 0 0 0 3px rgba(18, 13, 24, 0.85), inset 0 0 0 5px currentColor;
}
.stamp.blue {
  color: #7fc8f8;
}
.stamp.red {
  color: #ef4b3f;
}
.stamp.big {
  font-size: 2.6rem;
  text-align: center;
}
.drink-call {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  max-width: 100%;
  padding: 0.6rem 1rem 0.6rem 0.7rem;
  background: #0e0a0b;
  border: 3px solid #e3242b;
  border-radius: 14px;
  box-shadow: 0 5px 0 #050304;
  animation: cast-fly 1.5s ease forwards;
}
.turn-tag {
  padding: 0.25rem 1rem;
  font: 800 1rem 'Kanit', sans-serif;
  color: #f3e7cc;
  background: #e3242b;
  border: 2.5px solid #050304;
  border-radius: 10px;
  box-shadow: 0 4px 0 #050304;
}
.hazard {
  width: 120vw;
  padding: 0.4rem 0;
  text-align: center;
  transform: rotate(-4deg);
  background: repeating-linear-gradient(45deg, #f6c93d 0 22px, #140f10 22px 44px);
  border-block: 4px solid #050304;
}
.hazard span {
  padding: 0 1rem;
  font: 800 2rem/1.2 'Kanit', sans-serif;
  letter-spacing: 0.08em;
  color: #140f10;
  background: #f6c93d;
}
</style>
