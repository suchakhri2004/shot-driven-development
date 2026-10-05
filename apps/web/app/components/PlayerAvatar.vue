<script setup lang="ts">
import { avatarColor, avatarIcon } from '~/theme/theme'

/** A round player token: flat role colour, ink rim, the role's icon printed on it. */
withDefaults(defineProps<{ avatar: string; size?: number; dead?: boolean }>(), { size: 44, dead: false })
</script>

<template>
  <div
    class="token grid shrink-0 place-items-center rounded-full"
    :style="{ width: `${size}px`, height: `${size}px`, background: dead ? '#55494a' : avatarColor(avatar) }"
  >
    <GameIcon :name="dead ? 'skull' : avatarIcon(avatar)" :size="size * 0.6" variant="print" :plate="dead ? '#857775' : '#f3e7cc'" />
  </div>
</template>

<style scoped>
.token {
  border: 2.5px solid #050304;
  box-shadow: 0 3px 0 #050304, inset 0 -4px 0 rgba(0, 0, 0, 0.18);
}
</style>
