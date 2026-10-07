<script setup lang="ts">
import type { PublicPlayer } from '@sdd/engine'
import { cardIcon, cardTone, theme } from '~/theme/theme'

/** An opponent at the table: a token ringed by their HP, a paper name tag, and tiny badges. `compact` is for big tables. */
const props = defineProps<{ player: PublicPlayer; compact?: boolean }>()
const room = useRoom()
const fx = useFx()

const state = computed(() => room.state.value!)
const isActive = computed(() => state.value.activeId === props.player.id && !state.value.finished)
const online = computed(() => room.connected.value[props.player.id] !== false)
const responding = computed(() => {
  const pending = state.value.pending
  return pending?.kind === 'response' && pending.eligible.includes(props.player.id) && !pending.passed.includes(props.player.id)
})
const deciding = computed(() => {
  const pending = state.value.pending
  return !!pending && pending.kind !== 'response' && pending.playerId === props.player.id
})
const caption = computed(() => {
  const p = props.player
  if (!p.alive) return p.eliminatedBy === 'ko' ? theme.overflow : theme.crashed
  if (!online.value) return 'หลุด…'
  if (responding.value) return 'กำลังตอบโต้'
  if (deciding.value) return 'กำลังตัดสินใจ'
  if (isActive.value) return 'เทิร์นนี้'
  return ''
})
</script>

<template>
  <div :key="fx.shaking.value[player.id] ?? 0" :class="{ 'anim-shake': fx.shaking.value[player.id] }">
    <div class="plate" :class="{ active: isActive, dead: !player.alive, waiting: responding || deciding, compact }" :data-player-id="player.id">
      <FloatersFor :player-id="player.id" />

      <div class="portrait">
        <span v-if="isActive" class="turn-mark" />
        <HpRing :hp="player.hp" :max-hp="player.maxHp" :size="compact ? 40 : 64" :stroke="compact ? 4 : 6">
          <PlayerAvatar :avatar="player.avatar" :size="compact ? 27 : 44" :dead="!player.alive" />
        </HpRing>
        <span class="hp-badge">{{ Math.max(0, player.hp) }}</span>
        <span v-if="compact" class="shots-badge" :title="`ซดไปแล้ว ${player.potionsDrunk} ช็อต`">{{ player.potionsDrunk }}</span>
      </div>

      <span class="tag name">{{ player.name }}</span>
      <div v-if="!compact || caption" class="caption" :class="{ alert: !player.alive || !online, busy: responding || deciding }">{{ caption }}&nbsp;</div>

      <div class="stats">
        <span class="stat amber"><GameIcon name="shot" />{{ player.mana }}</span>
        <span class="stat"><GameIcon name="cards" tone="steel" />{{ player.handCount }}</span>
      </div>
      <div v-if="!compact" class="drunk" :title="`ซดไปแล้ว ${player.potionsDrunk} ช็อต`">
        <GameIcon name="drink" tone="paper" size="0.8rem" />{{ player.nonAlcoholic ? 'ซดน้ำ' : 'ซด' }} {{ player.potionsDrunk }}
      </div>

      <div v-if="player.artifacts.length || player.statuses.length" class="badges">
        <span v-for="a in player.artifacts" :key="a.iid" class="badge" :title="room.cards.value[a.defId]?.name">
          <GameIcon :name="cardIcon(room.cards.value[a.defId])" :tone="room.cards.value[a.defId] ? cardTone(room.cards.value[a.defId]) : undefined" size="0.95rem" />
        </span>
        <span v-for="s in player.statuses" :key="s.id" class="badge status" :title="`${s.name} · ${s.remaining}`">
          <GameIcon name="curse" tone="violet" size="0.95rem" /><i>{{ s.remaining }}</i>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.plate {
  position: relative;
  width: 5.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: opacity 0.3s ease, filter 0.3s ease;
}
/* big tables: everything a notch smaller so two rows of five fit a phone */
.plate.compact {
  width: 4.25rem;
}
/* shots drunk, top-left of the token (Uptime is bottom-right) */
.shots-badge {
  position: absolute;
  left: -6px;
  top: -4px;
  min-width: 1.15rem;
  padding: 0 0.2rem;
  border-radius: 999px;
  font: 800 0.62rem/1.35 'Kanit', sans-serif;
  color: #f3e7cc;
  background: #e3242b;
  border: 2px solid #050304;
}
.plate.compact .stats {
  gap: 0.15rem;
  margin-top: 2px;
}
.plate.compact .caption {
  min-height: 0;
}
.plate.compact .name {
  max-width: 4.2rem;
  margin-top: 0.3rem;
  font-size: 0.66rem;
}
.plate.compact .stat {
  padding: 0 0.25rem;
  font-size: 0.64rem;
}
.plate.compact .hp-badge {
  min-width: 1.25rem;
  font-size: 0.68rem;
}
.plate.dead {
  opacity: 0.55;
  filter: grayscale(1);
}
.portrait {
  position: relative;
  border-radius: 50%;
}
/* whose turn: a thick amber ring + a bobbing marker; whose decision: a teal ring */
.plate.active .portrait {
  box-shadow: 0 0 0 3px #e3242b, 0 0 0 6px #050304;
}
.plate.waiting .portrait {
  box-shadow: 0 0 0 3px #f2e8dc, 0 0 0 6px #050304;
}
.turn-mark {
  position: absolute;
  left: 50%;
  top: -19px;
  z-index: 2;
  width: 16px;
  height: 13px;
  margin-left: -8px;
  background: #e3242b;
  clip-path: polygon(0 0, 100% 0, 50% 100%);
  filter: drop-shadow(0 2px 0 #050304);
  animation: bob 0.9s ease-in-out infinite;
}
.hp-badge {
  position: absolute;
  right: -7px;
  bottom: -3px;
  min-width: 1.5rem;
  padding: 0 0.3rem;
  border-radius: 999px;
  font: 800 0.78rem/1.35 'Kanit', sans-serif;
  color: #140f10;
  background: #f3e7cc;
  border: 2px solid #050304;
}
.name {
  margin-top: 0.45rem;
  transform: rotate(-2deg);
  font-size: 0.74rem;
}
.caption {
  min-height: 0.95rem;
  margin-top: 1px;
  font: 600 0.62rem 'Kanit', sans-serif;
  color: #e3242b;
}
.caption.busy {
  color: #f2e8dc;
}
.caption.alert {
  color: #ef4b3f;
}
.stats {
  display: flex;
  gap: 0.35rem;
}
.stat {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  font: 700 0.72rem/1.5 'Kanit', sans-serif;
  color: #cdbfba;
  background: #050304;
}
.stat.amber {
  color: #e3242b;
}
.drunk {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  margin-top: 3px;
  font: 700 0.62rem/1.4 'Kanit', sans-serif;
  color: #a08f8b;
}
.badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 3px;
  margin-top: 4px;
}
.badge {
  position: relative;
  display: grid;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background: #221a1c;
  border: 2px solid #050304;
}
.badge.status {
  background: #4a1015;
}
.badge i {
  position: absolute;
  right: -4px;
  bottom: -4px;
  font: 800 0.55rem/1.4 'Kanit', sans-serif;
  font-style: normal;
  color: #f3e7cc;
  background: #b3161c;
  border: 1.5px solid #050304;
  border-radius: 999px;
  padding: 0 3px;
}
@keyframes bob {
  0%,
  100% {
    translate: 0 -2px;
  }
  50% {
    translate: 0 3px;
  }
}
</style>
