<script setup lang="ts">
import type { HandCard } from '@sdd/engine'
import { theme } from '~/theme/theme'

const emit = defineEmits<{ inspect: [card: HandCard] }>()
const room = useRoom()
const lock = useLock()

const state = computed(() => room.state.value!)
const pending = computed(() => state.value.pending)

/** Only shown to a player who may answer the attack and has not yet passed. */
const active = computed(() => {
  const p = pending.value
  return p?.kind === 'response' && p.eligible.includes(state.value.me) && !p.passed.includes(state.value.me) ? p : null
})

const top = computed(() => state.value.chain[state.value.chain.length - 1])
const topDef = computed(() => (top.value ? room.cards.value[top.value.defId] : null))
const answers = computed(() => state.value.hand.filter((c) => c.playable))
/** Defensive cards held but not affordable yet: tell the player a drink would fix it. */
const almost = computed(() => state.value.hand.filter((c) => c.reason === 'INSUFFICIENT_MANA'))

const pass = () => lock.run(() => room.send({ type: 'pass_response' }))
const drink = () => lock.run(() => room.send({ type: 'drink' }))
</script>

<template>
  <!-- Time is short here, so the two always-available buttons sit right under the countdown, above the card list -->
  <BottomSheet v-if="active && top && topDef" title="ถูกโจมตี!" :dismissable="false">
    <div class="space-y-3">
      <div class="flex items-center gap-3">
        <GameCard :def="topDef" size="xs" class="shrink-0" />
        <p class="text-sm leading-snug">
          <b class="text-amber">{{ room.nameOf(top.ownerId) }}</b> เล่น <b>{{ topDef.name }}</b>
          <template v-if="top.targets.length"> ใส่ <b>{{ top.targets.map((id) => room.nameOf(id)).join(', ') }}</b></template>
          <span class="mt-1 block text-xs text-dim">{{ topDef.description }}</span>
        </p>
      </div>

      <CountdownBar :timer-key="active.id" :total-sec="active.timeoutSec" />

      <div class="grid grid-cols-2 gap-2">
        <button class="btn btn-amber" :disabled="lock.busy.value" @click="drink">
          <GameIcon name="shot" tone="paper" /> {{ theme.drink.button }} (+{{ state.potionYield }})
        </button>
        <button class="btn" :disabled="lock.busy.value" @click="pass">ปล่อยผ่าน (Pass)</button>
      </div>

      <section v-if="answers.length" class="space-y-2">
        <h3 class="text-sm font-semibold text-neon">ตอบโต้ด้วย:</h3>
        <div class="scroll-x gap-2 pb-1">
          <button v-for="c in answers" :key="c.iid" class="shrink-0" @click="emit('inspect', c)">
            <GameCard :def="room.cards.value[c.defId]" size="sm" :playable="true" />
          </button>
        </div>
      </section>
      <p v-else-if="almost.length" class="text-center text-sm text-amber">
        มีการ์ดตอบโต้แต่ {{ theme.mana.name }} ไม่พอ ลอง {{ theme.drink.button }} ก่อน!
      </p>
    </div>
  </BottomSheet>
</template>
