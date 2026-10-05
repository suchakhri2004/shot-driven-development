<script setup lang="ts">
import type { CardDef } from '@sdd/engine'
import { cardFileName, cardIcon, cardTypeStyle, describeCostDiscard } from '~/theme/theme'

/** A printed card: cost coin + name, two-colour artwork, rules text, the line to read aloud, and a serial. */
const props = withDefaults(
  defineProps<{
    def: CardDef
    size?: 'xs' | 'sm' | 'md' | 'lg'
    /** true = playable frame, false = faded out, undefined = neutral */
    playable?: boolean
    selected?: boolean
  }>(),
  { size: 'md', playable: undefined, selected: false }
)

const typeLabel = computed(() => cardTypeStyle[props.def.type].label)
const isEvent = computed(() => props.def.type === 'event')
</script>

<template>
  <div class="card" :class="[size, { playable: playable === true, unplayable: playable === false, selected }]">
    <div class="card-head">
      <span class="card-cost" :class="{ free: isEvent }">{{ isEvent ? '!' : def.cost.mana }}</span>
      <span class="card-name">{{ def.name }}</span>
    </div>
    <div class="card-art" :data-art="def.element ?? def.type">
      <span class="card-icon"><GameIcon :name="cardIcon(def)" variant="print" size="5.4em" /></span>
      <span class="card-type">{{ typeLabel }}</span>
    </div>
    <div class="card-text">{{ def.description }}</div>
    <div v-for="(slot, i) in def.cost.discard ?? []" :key="i" class="card-extra">+ {{ describeCostDiscard(slot) }}</div>
    <div v-if="size === 'lg' && def.incantation" class="card-incant">“{{ def.incantation }}”</div>
    <span v-if="size !== 'xs'" class="card-serial">{{ cardFileName(def) }}</span>
  </div>
</template>
