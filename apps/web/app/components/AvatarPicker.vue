<script setup lang="ts">
import { avatarIds, avatars } from '~/theme/theme'

const model = defineModel<string>({ required: true })
</script>

<template>
  <div class="grid grid-cols-4 gap-2">
    <button
      v-for="id in avatarIds"
      :key="id"
      type="button"
      class="flex flex-col items-center gap-1 rounded-xl border py-2 transition-transform active:scale-95"
      :class="model === id ? 'border-neon bg-neon/10' : 'border-line bg-panel2'"
      @click="model = id"
    >
      <GameIcon :name="avatars[id].icon" size="1.9rem" tone="blue" />
      <span class="text-[10px] text-dim">{{ avatars[id].label }}</span>
    </button>
  </div>
</template>
