<script setup lang="ts">
import { cardIcon, cardTone, theme } from '~/theme/theme'

/** Your own HUD: health ring on the left, the whiskey bottle-end on the right, your token and tag between. */
const room = useRoom()
const fx = useFx()

const me = computed(() => room.me.value!)
const state = computed(() => room.state.value!)
const yourTurn = computed(() => state.value.activeId === me.value.id && !state.value.finished)
</script>

<template>
  <div :key="fx.shaking.value[me.id] ?? 0" :class="{ 'anim-shake': fx.shaking.value[me.id] }">
    <section class="hud relative mx-3 flex items-center justify-between gap-2" :data-player-id="me.id">
      <FloatersFor :player-id="me.id" />

      <div class="orb-col">
        <HpRing :hp="me.hp" :max-hp="me.maxHp" :size="86" :stroke="9">
          <span class="big-number" :class="{ low: me.hp <= 3 }">{{ Math.max(0, me.hp) }}</span>
        </HpRing>
        <div class="orb-label"><GameIcon name="hp" /> {{ theme.hp.name }}</div>
      </div>

      <div class="mid" :class="{ turn: yourTurn }">
        <PlayerAvatar :avatar="me.avatar" :size="44" :dead="!me.alive" />
        <span class="tag">{{ me.name }}</span>
        <div class="text-[11px] text-dim">ซด 1 ครั้ง +{{ state.potionYield }}<template v-if="state.manaBank !== null"> · กอง {{ state.manaBank }}</template></div>
        <div class="text-[11px] text-dim">ซดไปแล้ว {{ me.potionsDrunk }} ช็อต</div>
        <div v-if="me.artifacts.length || me.statuses.length" class="badges">
          <span v-for="a in me.artifacts" :key="a.iid" class="badge" :title="room.cards.value[a.defId]?.name">
            <GameIcon :name="cardIcon(room.cards.value[a.defId])" :tone="room.cards.value[a.defId] ? cardTone(room.cards.value[a.defId]) : undefined" size="1.1rem" />
          </span>
          <span v-for="s in me.statuses" :key="s.id" class="badge status" :title="s.name">
            <GameIcon name="curse" tone="violet" size="1.1rem" /><i>{{ s.remaining }}</i>
          </span>
        </div>
      </div>

      <div class="orb-col">
        <ShotVial :mana="me.mana" :size="86" />
        <div class="orb-label"><GameIcon name="shot" /> {{ theme.mana.name }}</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.orb-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}
.big-number {
  font: 800 2rem/1 'Kanit', sans-serif;
  color: #f3e7cc;
  -webkit-text-stroke: 3px #050304;
  paint-order: stroke fill;
}
.big-number.low {
  color: #ef4b3f;
}
.orb-label {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font: 700 0.62rem 'Kanit', sans-serif;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #a08f8b;
}
.mid {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
}
.mid .tag {
  transform: rotate(-1.5deg);
}
.mid.turn :deep(.token) {
  box-shadow: 0 0 0 3px #e3242b, 0 0 0 6px #050304;
}
.badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
}
.badge {
  position: relative;
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
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
  font: 800 0.58rem/1.4 'Kanit', sans-serif;
  font-style: normal;
  color: #f3e7cc;
  background: #b3161c;
  border: 1.5px solid #050304;
  border-radius: 999px;
  padding: 0 3px;
}
</style>
