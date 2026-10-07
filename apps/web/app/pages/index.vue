<script setup lang="ts">
import { DECK } from '@sdd/cards'
import { ICON_CREDIT } from '~/theme/icon-data'

const route = useRoute()
const room = useRoom()

const mode = ref<'menu' | 'create' | 'join'>(route.query.join ? 'join' : 'menu')
const prefillCode = String(route.query.join ?? '')

const goToRoom = (code: string) => navigateTo(`/room/${code}`)

const heroCards = ['try-catch', 'null-pointer', 'happy-hour']
const card = (id: string) => DECK.find((c) => c.id === id)!
</script>

<template>
  <div class="relative min-h-dvh overflow-hidden">
    <!-- brick wall behind the neon sign -->
    <div class="bricks" aria-hidden="true" />

    <main
      class="relative mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4"
      :style="{ paddingBlock: 'calc(1.2rem + var(--safe-top)) calc(1.5rem + var(--safe-bottom))' }"
    >
      <header class="flex flex-col items-center gap-4">
        <NeonSign />
        <span class="stamp">18+ · เกมดื่ม · ดื่มอย่างรับผิดชอบ</span>
      </header>

      <!-- a few real cards fanned out under the sign, gently floating -->
      <div v-if="mode === 'menu'" class="hero-fan" aria-hidden="true">
        <GameCard v-for="(id, i) in heroCards" :key="id" :def="card(id)" size="sm" class="hero-card" :style="{ '--i': i - 1 }" />
      </div>

      <template v-if="mode === 'menu'">
        <div class="mt-auto space-y-3">
          <button v-if="room.session.value && room.lobby.value" class="btn btn-primary w-full" @click="goToRoom(room.session.value.code)">
            <GameIcon name="turn" tone="paper" /> กลับเข้าห้อง {{ room.session.value.code }}
          </button>
          <button class="btn btn-amber h-16 w-full text-xl" @click="mode = 'create'"><GameIcon name="drink" tone="paper" size="1.6rem" /> สร้างห้อง</button>
          <button class="btn h-14 w-full text-lg" @click="mode = 'join'"><GameIcon name="link" tone="steel" /> เข้าร่วมด้วยรหัส</button>
          <NuxtLink to="/rules" class="btn btn-ghost w-full text-dim"><GameIcon name="rules" tone="steel" /> วิธีเล่น</NuxtLink>
        </div>
        <footer class="space-y-1 text-center">
          <p class="text-xs text-dim">2–10 คน · คนละเครื่อง · เล่นออนไลน์ผ่านรหัสห้อง</p>
          <p class="text-[10px] text-dim/60">{{ ICON_CREDIT }}</p>
        </footer>
      </template>

      <ProfileForm v-else class="mt-auto" :mode="mode" :initial-code="prefillCode" @done="goToRoom" @cancel="mode = 'menu'" />
    </main>
  </div>
</template>

<style scoped>
.bricks {
  position: absolute;
  inset: 0 0 auto;
  height: 360px;
  background:
    radial-gradient(60% 50% at 50% 30%, rgba(227, 36, 43, 0.12), transparent 70%),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='88' height='44'%3E%3Crect width='88' height='44' fill='%23200c0c'/%3E%3Crect x='3' y='3' width='38' height='16' fill='%23361615'/%3E%3Crect x='47' y='3' width='38' height='16' fill='%232e1212'/%3E%3Crect x='-19' y='25' width='38' height='16' fill='%23331414'/%3E%3Crect x='25' y='25' width='38' height='16' fill='%232f1313'/%3E%3Crect x='69' y='25' width='38' height='16' fill='%23361615'/%3E%3C/svg%3E") 0 0 / 88px 44px;
  -webkit-mask-image: linear-gradient(180deg, #000 40%, transparent);
  mask-image: linear-gradient(180deg, #000 40%, transparent);
  opacity: 0.55;
}
.hero-fan {
  position: relative;
  display: flex;
  justify-content: center;
  height: 9.5rem;
  margin-top: 0.5rem;
}
.hero-card {
  position: absolute;
  top: 0;
  rotate: calc(var(--i) * 11deg);
  translate: calc(var(--i) * 4.6rem) calc(var(--i) * var(--i) * 0.8rem);
  transform-origin: 50% 120%;
  animation: float 4s ease-in-out infinite;
  animation-delay: calc(var(--i) * 0.6s);
}
@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-7px);
  }
}
.stamp {
  padding: 0.15rem 0.7rem;
  font: 800 0.75rem 'Kanit', 'IBM Plex Sans Thai', sans-serif;
  letter-spacing: 0.04em;
  color: #ef4b3f;
  border: 2.5px solid #ef4b3f;
  border-radius: 6px;
  transform: rotate(-3deg);
}
</style>
