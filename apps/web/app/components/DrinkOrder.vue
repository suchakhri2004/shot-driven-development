<script setup lang="ts">
import { theme } from '~/theme/theme'

/**
 * "You have to drink": shown only on the phone of the player someone used git blame on, and held
 * until they press the button. The table-wide notice is too quick to notice when it is about you.
 * Built for a phone held in one hand: words in the middle, one big button where the thumb is.
 */
const room = useRoom()
const fx = useFx()
const sound = useSound()

const order = computed(() => fx.orders.value[0] ?? null)
const sober = computed(() => !!room.me.value?.nonAlcoholic)

function obey() {
  sound.play('drink')
  fx.obeyOrder()
}
</script>

<template>
  <Transition name="order">
    <div v-if="order" :key="order.id" class="order bg-atmosphere fixed inset-0 z-[60] flex flex-col px-6 text-center">
      <div class="flex flex-1 flex-col items-center justify-center gap-5">
        <div class="flex items-center gap-3">
          <PlayerAvatar :avatar="order.byAvatar" :size="56" />
          <p class="text-left text-base leading-snug">
            <b class="text-lg">{{ order.byName }}</b><br />
            <span class="text-dim">ใช้ <b class="text-ink">{{ order.card || 'การ์ด' }}</b> ใส่คุณ</span>
          </p>
        </div>

        <span class="big-stamp">{{ sober ? 'ซดน้ำ!' : 'ดื่ม!' }}</span>

        <p class="font-display text-2xl font-bold">1 ช็อต{{ sober ? ' (น้ำ/โซดา)' : 'จริง' }}</p>
        <p v-if="order.lost" class="text-sm text-dim">และเสีย {{ theme.mana.name }} {{ order.lost }}</p>
        <p v-if="fx.orders.value.length > 1" class="text-xs text-dim">ยังมีอีก {{ fx.orders.value.length - 1 }} คำสั่งรออยู่</p>
      </div>

      <button class="btn btn-amber obey w-full text-xl" @click="obey">
        <GameIcon name="drink" tone="paper" size="1.6rem" /> ดื่มแล้ว
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.order {
  padding-top: calc(1.5rem + var(--safe-top));
  padding-bottom: calc(1.25rem + var(--safe-bottom));
}
.big-stamp {
  display: inline-block;
  padding: 0.1rem 1.4rem;
  font: 800 4rem/1.15 'Kanit', sans-serif;
  color: #ff4d52;
  border: 5px solid currentColor;
  border-radius: 14px;
  box-shadow: inset 0 0 0 4px #0e0a0b, inset 0 0 0 7px currentColor;
  transform: rotate(-6deg);
  animation: stamp 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) 0.15s both;
}
/* the thumb's button: tall, full width, at the bottom of the screen */
.obey {
  min-height: 4.25rem;
}
.order-enter-active {
  transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.order-leave-active {
  transition: opacity 0.18s ease;
}
.order-enter-from {
  opacity: 0;
  transform: translateY(24px);
}
.order-leave-to {
  opacity: 0;
}
</style>
