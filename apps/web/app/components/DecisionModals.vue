<script setup lang="ts">
import { theme } from '~/theme/theme'

const room = useRoom()
const lock = useLock()

const state = computed(() => room.state.value!)
const shortfall = computed(() => {
  const p = state.value.pending
  return p?.kind === 'shortfall' && p.playerId === state.value.me ? p : null
})
const discard = computed(() => {
  const p = state.value.pending
  return p?.kind === 'discard' && p.playerId === state.value.me ? p : null
})

const bankEmpty = computed(() => state.value.manaBank !== null && state.value.manaBank <= 0)

// discard choice: reset whenever a new decision opens
const picked = ref<string[]>([])
watch(() => discard.value?.id, () => (picked.value = []))
function toggle(iid: string) {
  if (!discard.value) return
  if (picked.value.includes(iid)) picked.value = picked.value.filter((id) => id !== iid)
  else if (picked.value.length < discard.value.count) picked.value = [...picked.value, iid]
}

const drink = () => lock.run(() => room.send({ type: 'drink' }))
const decline = () => lock.run(() => room.send({ type: 'decline_shortfall' }))
const confirmDiscard = () => lock.run(() => room.send({ type: 'choose_discard', cardIds: picked.value }))
</script>

<template>
  <BottomSheet v-if="shortfall" :title="`${theme.mana.name} ไม่พอ!`" :dismissable="false">
    <div class="space-y-3">
      <p class="text-center">
        ต้องจ่ายอีก <b class="text-2xl text-amber">{{ shortfall.remaining }}</b> <GameIcon name="shot" /><br />
        <span class="text-sm text-dim">ซดเติมตอนนี้ หรือยอมเสีย {{ theme.hp.name }} {{ shortfall.remaining }}</span>
      </p>
      <CountdownBar :timer-key="shortfall.id" :total-sec="shortfall.timeoutSec" />
      <div class="grid grid-cols-2 gap-2">
        <button class="btn btn-amber" :disabled="bankEmpty || lock.busy.value" @click="drink">
          <GameIcon name="shot" tone="paper" /> {{ theme.drink.button }} (+{{ state.potionYield }})
        </button>
        <button class="btn btn-danger" :disabled="lock.busy.value" @click="decline">เสีย <GameIcon name="hp" /> {{ shortfall.remaining }}</button>
      </div>
    </div>
  </BottomSheet>

  <BottomSheet v-else-if="discard" title="ต้องทิ้งการ์ด" :dismissable="false">
    <div class="space-y-3">
      <p class="text-center text-sm">
        เลือกการ์ดที่จะทิ้ง <b class="text-amber">{{ picked.length }}/{{ discard.count }}</b> ใบ
      </p>
      <CountdownBar :timer-key="discard.id" :total-sec="discard.timeoutSec" />
      <div class="scroll-x gap-2 pb-1">
        <button v-for="c in state.hand" :key="c.iid" class="shrink-0" @click="toggle(c.iid)">
          <GameCard :def="room.cards.value[c.defId]" size="sm" :selected="picked.includes(c.iid)" />
        </button>
      </div>
      <button class="btn btn-primary w-full" :disabled="picked.length !== discard.count || lock.busy.value" @click="confirmDiscard">
        ยืนยันทิ้ง
      </button>
    </div>
  </BottomSheet>
</template>
