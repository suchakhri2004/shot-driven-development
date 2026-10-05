<script setup lang="ts">
import { theme } from '~/theme/theme'

/** House rule "git init": everyone takes a first shot together before turn one. */
const room = useRoom()
const lock = useLock()

const state = computed(() => room.state.value!)
const mine = computed(() => room.me.value!)
const done = computed(() => state.value.players.filter((p) => p.openingShotDone).length)
const drink = () => lock.run(() => room.send({ type: 'drink' }))
</script>

<template>
  <div class="anim-fade bg-atmosphere fixed inset-0 z-30 flex flex-col items-center justify-center gap-5 px-6 text-center">
    <!-- two shot glasses swinging in to clink -->
    <div class="clink" aria-hidden="true">
      <GameIcon name="shot" variant="sticker" size="4.2rem" class="glass left" />
      <GameIcon name="shot" variant="sticker" size="4.2rem" class="glass right" />
    </div>

    <div>
      <h2 class="font-mono text-3xl font-bold text-neon">$ {{ theme.opening.title }}</h2>
      <p class="mt-1 text-sm text-dim">{{ theme.opening.subtitle }}</p>
    </div>

    <!-- one coaster per player: it fills with a glass once they have drunk -->
    <div class="flex flex-wrap justify-center gap-3">
      <div v-for="p in state.players" :key="p.id" class="flex w-16 flex-col items-center gap-1">
        <div class="coaster" :class="{ full: p.openingShotDone }">
          <GameIcon v-if="p.openingShotDone" name="shot" variant="print" plate="#e3242b" size="1.9rem" class="anim-pop" />
          <PlayerAvatar v-else :avatar="p.avatar" :size="34" />
        </div>
        <span class="w-full truncate text-xs font-semibold">{{ p.name }}</span>
      </div>
    </div>
    <p class="font-mono text-xs text-dim">{{ done }}/{{ state.players.length }} ชนแก้วแล้ว</p>

    <button v-if="!mine.openingShotDone" class="btn btn-amber h-16 w-full max-w-xs text-xl" :disabled="lock.busy.value" @click="drink">
      <GameIcon name="shot" tone="paper" /> {{ theme.drink.button }} (+{{ state.potionYield }})
    </button>
    <p v-else class="font-display text-lg text-neon">ชนแก้วแล้ว! รอเพื่อนซดให้ครบ…</p>
  </div>
</template>

<style scoped>
.clink {
  position: relative;
  width: 9rem;
  height: 5rem;
}
.glass {
  position: absolute;
  top: 0.4rem;
}
.glass.left {
  left: 0.6rem;
  transform-origin: 50% 100%;
  animation: clink-left 1.6s ease-in-out infinite;
}
.glass.right {
  right: 0.6rem;
  transform-origin: 50% 100%;
  animation: clink-right 1.6s ease-in-out infinite;
}
@keyframes clink-left {
  0%,
  100% {
    transform: translateX(-10px) rotate(-14deg);
  }
  45%,
  55% {
    transform: translateX(10px) rotate(8deg);
  }
}
@keyframes clink-right {
  0%,
  100% {
    transform: translateX(10px) rotate(14deg);
  }
  45%,
  55% {
    transform: translateX(-10px) rotate(-8deg);
  }
}
.coaster {
  display: grid;
  place-items: center;
  width: 3.4rem;
  height: 3.4rem;
  border-radius: 50%;
  background: repeating-radial-gradient(circle, #e3d2ad 0 3px, #f3e7cc 3px 6px);
  border: 3px solid #050304;
  box-shadow: 0 4px 0 #050304;
  transition: background 0.3s ease;
}
.coaster.full {
  background: repeating-radial-gradient(circle, #ff7b7f 0 3px, #ffd0d1 3px 6px);
}
</style>
