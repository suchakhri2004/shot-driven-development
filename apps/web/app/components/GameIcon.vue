<script setup lang="ts">
import { iconData } from '~/theme/icon-data'

/**
 * Game icon from the icon set, drawn in flat colour.
 *   variant "flat"  : one solid colour (HUD, buttons, text)
 *   variant "print"   : ink silhouette over a slightly offset colour layer, like a two-colour screen print
 *                       whose plates are a little out of register (card artwork and other light surfaces)
 *   variant "sticker" : the coloured icon with a hard ink shadow (for big icons on the dark background)
 */
type Tone = 'fire' | 'ice' | 'bolt' | 'gold' | 'green' | 'violet' | 'red' | 'blue' | 'steel' | 'ink' | 'paper'

const props = withDefaults(
  defineProps<{
    name: string
    size?: number | string
    tone?: Tone
    variant?: 'flat' | 'print' | 'sticker'
    /** colour of the offset plate in "print" mode */
    plate?: string
  }>(),
  { size: '1em', tone: undefined, variant: 'flat', plate: '#f3e7cc' }
)

const COLOR: Record<Tone, string> = {
  fire: '#ef4b3f',
  ice: '#4b9cf0',
  bolt: '#f6c93d',
  gold: '#ffaa2b',
  green: '#3fbfa3',
  violet: '#9b70ee',
  red: '#e3242b',
  blue: '#7fc8f8',
  steel: '#cdbfba',
  ink: '#140f10',
  paper: '#f3e7cc'
}

/** Each icon's natural colour: elements and card types keep the colours players learn. */
const DEFAULT_TONE: Record<string, Tone> = {
  hp: 'paper', shot: 'red', drink: 'red', hotfix: 'fire', freeze: 'ice', deploy: 'bolt',
  attack: 'red', defend: 'blue', support: 'green', curse: 'violet', artifact: 'gold', incident: 'red',
  skull: 'steel', crown: 'gold', trophy: 'gold', alarm: 'red', sober: 'blue', sparkles: 'violet'
}

const body = computed(() => iconData[props.name] ?? iconData.sparkles)
const color = computed(() => COLOR[props.tone ?? DEFAULT_TONE[props.name] ?? 'steel'])
const markup = computed(() => {
  if (props.variant === 'print') return `<g transform="translate(22 20)" fill="${props.plate}">${body.value}</g><g fill="#140f10">${body.value}</g>`
  if (props.variant === 'sticker') return `<g transform="translate(14 26)" fill="#050304">${body.value}</g><g>${body.value}</g>`
  return body.value
})
</script>

<template>
  <svg
    class="gicon"
    :viewBox="variant === 'flat' ? '0 0 512 512' : '-6 -6 546 546'"
    :width="size"
    :height="size"
    :fill="color"
    aria-hidden="true"
    v-html="markup"
  />
</template>

<style scoped>
.gicon {
  display: inline-block;
  flex: none;
  vertical-align: -0.15em;
  overflow: visible;
}
</style>
