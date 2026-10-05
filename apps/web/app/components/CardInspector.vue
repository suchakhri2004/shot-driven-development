<script setup lang="ts">
import type { HandCard } from '@sdd/engine'
import { cardIcon, cardTone, describeCostDiscard, errorText, theme } from '~/theme/theme'

const props = defineProps<{ card: HandCard }>()
const emit = defineEmits<{ close: [] }>()

const room = useRoom()
const lock = useLock()

const state = computed(() => room.state.value!)
const defs = computed(() => room.cards.value)
const def = computed(() => defs.value[props.card.defId])
/** Always read the live version of this card: its playability changes as the game moves on. */
const live = computed(() => state.value.hand.find((c) => c.iid === props.card.iid))

const inResponse = computed(() => state.value.pending?.kind === 'response')
const myTurnFree = computed(() => room.isMyTurn.value && !state.value.pending)

// ── targets ──
const wantsTarget = computed(() => needsPlayerTarget(def.value))
const candidates = computed(() =>
  state.value.players.filter((p) => {
    if (!p.alive) return false
    if (def.value.target === 'one-opponent') return p.id !== state.value.me
    if (def.value.target === 'artifact') return p.artifacts.length > 0
    return true
  })
)
const targetId = ref<string | null>(candidates.value.length === 1 ? candidates.value[0].id : null)
const artifactId = ref<string | null>(null)
const targetPlayer = computed(() => state.value.players.find((p) => p.id === targetId.value))
watch(targetId, () => (artifactId.value = null))

// ── discard cost ──
const slots = computed(() => costSlots(def.value))
const payable = computed(() =>
  state.value.hand.filter((c) => c.iid !== props.card.iid)
)
const paying = ref<string[]>([])
function togglePay(iid: string) {
  paying.value = paying.value.includes(iid) ? paying.value.filter((id) => id !== iid) : [...paying.value, iid]
}
const costComplete = computed(
  () =>
    paying.value.length === slots.value.length &&
    canPayDiscard(slots.value, paying.value.map((iid) => defs.value[state.value.hand.find((c) => c.iid === iid)!.defId]))
)

// ── what can be done right now ──
const shortBy = computed(() => live.value?.shortBy ?? 0)
const targetReady = computed(
  () => !wantsTarget.value || (!!targetId.value && (def.value.target !== 'artifact' || !!artifactId.value))
)
const canPlay = computed(() => !!live.value?.playable && targetReady.value && costComplete.value)
const canDiscard = computed(() => myTurnFree.value)
const canExchange = computed(() => myTurnFree.value && room.me.value!.mana >= state.value.exchangeCost)

const reasonText = computed(() => {
  const l = live.value
  if (!l || l.playable) return null
  if (l.reason === 'INSUFFICIENT_MANA') return `${theme.mana.name} ไม่พอ ขาดอีก ${shortBy.value}`
  if (l.reason === 'COST_CARDS_REQUIRED') return 'ยังไม่มีการ์ดที่ต้องทิ้งเป็นค่าใช้จ่าย'
  if (l.reason === 'NO_TARGET') return 'ไม่มีเป้าหมายที่เล่นได้'
  return errorText(l.reason ?? '')
})

async function play() {
  const ok = await lock.run(() =>
    room.send({
      type: 'play_card',
      cardId: props.card.iid,
      targets: targetId.value ? [targetId.value] : undefined,
      targetCardId: artifactId.value ?? undefined,
      costCardIds: paying.value
    })
  )
  if (ok) emit('close')
}
async function discard() {
  if (await lock.run(() => room.send({ type: 'discard_card', cardId: props.card.iid }))) emit('close')
}
async function exchange() {
  if (await lock.run(() => room.send({ type: 'exchange_card', cardId: props.card.iid }))) emit('close')
}
const drink = () => lock.run(() => room.send({ type: 'drink' }))

// close if the card leaves the hand (played, discarded, stolen by a swap…)
watch(live, (value) => !value && emit('close'))
</script>

<template>
  <BottomSheet :title="def.name" @close="emit('close')">
    <div class="space-y-4">
      <div class="flex justify-center"><GameCard :def="def" size="lg" :playable="live?.playable" /></div>

      <p v-if="reasonText" class="rounded-lg border border-line bg-panel2 px-3 py-2 text-center text-sm text-amber">
        {{ reasonText }}
      </p>

      <button
        v-if="live?.reason === 'INSUFFICIENT_MANA'"
        class="btn btn-amber w-full"
        :disabled="lock.busy.value"
        @click="drink"
      >
        <GameIcon name="shot" tone="paper" /> {{ theme.drink.button }} (+{{ state.potionYield }})
      </button>

      <!-- who is the target? -->
      <section v-if="wantsTarget" class="space-y-2">
        <h3 class="text-sm font-semibold text-dim">เลือกเป้าหมาย</h3>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="p in candidates"
            :key="p.id"
            class="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-transform active:scale-95"
            :class="targetId === p.id ? 'border-neon bg-neon/10' : 'border-line bg-panel2'"
            @click="targetId = p.id"
          >
            <PlayerAvatar :avatar="p.avatar" :size="24" />
            {{ p.name }}
            <span class="font-mono text-xs text-dim">{{ p.hp }}</span>
          </button>
        </div>
        <div v-if="def.target === 'artifact' && targetPlayer" class="flex flex-wrap gap-2">
          <button
            v-for="a in targetPlayer.artifacts"
            :key="a.iid"
            class="chip !px-3 !py-1.5 text-sm"
            :class="artifactId === a.iid ? 'border-neon bg-neon/10' : ''"
            @click="artifactId = a.iid"
          >
            <GameIcon :name="cardIcon(defs[a.defId])" :tone="defs[a.defId] ? cardTone(defs[a.defId]) : undefined" /> {{ defs[a.defId]?.name }}
          </button>
        </div>
      </section>

      <!-- cards to discard as part of the cost -->
      <section v-if="slots.length" class="space-y-2">
        <h3 class="text-sm font-semibold text-dim">
          ทิ้งเป็นค่าใช้จ่าย ({{ paying.length }}/{{ slots.length }}):
          <span class="text-amber">{{ (def.cost.discard ?? []).map(describeCostDiscard).join(' + ') }}</span>
        </h3>
        <div class="scroll-x gap-2 pb-1">
          <button v-for="c in payable" :key="c.iid" class="shrink-0" @click="togglePay(c.iid)">
            <GameCard :def="defs[c.defId]" size="xs" :selected="paying.includes(c.iid)" />
          </button>
        </div>
      </section>

      <div class="space-y-2">
        <button class="btn btn-primary w-full text-lg" :disabled="!canPlay || lock.busy.value" @click="play">
          <template v-if="inResponse"><GameIcon name="defend" tone="paper" /> ตอบโต้ด้วยการ์ดนี้</template>
          <template v-else><GameIcon name="cards" tone="paper" /> เล่นการ์ด</template>
          <span class="chip !border-shade/40 !bg-shade/30 !text-paper"><GameIcon name="shot" tone="paper" />{{ def.cost.mana }}</span>
        </button>

        <div v-if="!inResponse" class="grid grid-cols-2 gap-2">
          <button class="btn" :disabled="!canDiscard || lock.busy.value" @click="discard"><GameIcon name="trash" /> ทิ้ง (ฟรี)</button>
          <button class="btn" :disabled="!canExchange || lock.busy.value" @click="exchange">
            <span class="whitespace-nowrap"><GameIcon name="rebase" tone="blue" /> {{ theme.rebase.name }}</span><span class="chip whitespace-nowrap"><GameIcon name="shot" />{{ state.exchangeCost }}</span>
          </button>
        </div>
        <p v-if="!inResponse && !myTurnFree" class="text-center text-xs text-dim">ทิ้ง/Rebase ทำได้ในเทิร์นของคุณเท่านั้น</p>
      </div>
    </div>
  </BottomSheet>
</template>
