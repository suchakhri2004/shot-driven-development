<script setup lang="ts">
import type { HandCard } from '@sdd/engine'
import { theme } from '~/theme/theme'

const room = useRoom()
const state = computed(() => room.state.value!)

const inspecting = ref<HandCard | null>(null)
const menuOpen = ref(false)
const logOpen = ref(false)
const rulesOpen = ref(false)

const turnLabel = computed(() => {
  const s = state.value
  if (s.phase === 'opening_shot') return theme.opening.title
  return s.activeId === s.me ? '▶ เทิร์นของคุณ' : `เทิร์นของ ${room.nameOf(s.activeId)}`
})

// keep the screen awake while playing (phones dim during other players' turns)
let wakeLock: { release: () => Promise<void> } | null = null
onMounted(async () => {
  try {
    wakeLock = await (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<typeof wakeLock> } }).wakeLock?.request('screen') ?? null
  } catch {
    /* not supported or denied: harmless */
  }
})
onBeforeUnmount(() => void wakeLock?.release())
</script>

<template>
  <div class="mx-auto flex h-dvh w-full max-w-xl flex-col overflow-hidden" :style="{ paddingTop: 'var(--safe-top)' }">
    <header class="flex items-center justify-between px-4 pt-2 text-xs">
      <span class="font-mono text-dim">#{{ room.lobby.value?.code }}</span>
      <span class="font-display text-sm font-bold" :class="state.activeId === state.me ? 'text-neon' : 'text-ink'">{{ turnLabel }}</span>
      <span class="font-mono text-dim">T{{ state.turnNumber }}</span>
    </header>

    <OpponentRail />
    <TableCenter />
    <MyPanel />
    <HandRail @inspect="inspecting = $event" />
    <ActionBar @menu="menuOpen = true" />

    <OpeningShot v-if="state.phase === 'opening_shot'" />
    <ResponseModal @inspect="inspecting = $event" />
    <DecisionModals />
    <InterludeOverlay />
    <CardInspector v-if="inspecting" :key="inspecting.iid" :card="inspecting" @close="inspecting = null" />
    <GameMenu v-if="menuOpen" @close="menuOpen = false" @log="(menuOpen = false), (logOpen = true)" @rules="(menuOpen = false), (rulesOpen = true)" />
    <GameLogSheet v-if="logOpen" @close="logOpen = false" />
    <BottomSheet v-if="rulesOpen" title="วิธีเล่น" @close="rulesOpen = false"><HowToPlay /></BottomSheet>
    <FxLayer />
    <GameOver v-if="state.finished" />
  </div>
</template>
