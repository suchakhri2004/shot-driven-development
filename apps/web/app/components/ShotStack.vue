<script setup lang="ts">
const props = withDefaults(defineProps<{ mana: number; big?: boolean }>(), { big: false })

const MAX_GLASSES = 9
const glasses = computed(() => Math.min(props.mana, MAX_GLASSES))
</script>

<template>
  <div class="flex items-center gap-2">
    <span class="font-mono font-bold text-amber" :class="big ? 'text-3xl' : 'text-base'">{{ mana }}</span>
    <div class="flex items-end" :class="big ? 'h-8' : 'h-5'">
      <TransitionGroup name="glass">
        <span
          v-for="n in glasses"
          :key="n"
          class="glass inline-block leading-none"
          :style="{ fontSize: big ? '24px' : '15px', marginLeft: n > 1 ? (big ? '-8px' : '-5px') : '0' }"
        ><GameIcon name="shot" /></span>
      </TransitionGroup>
      <span v-if="mana > MAX_GLASSES" class="ml-1 text-xs text-dim">+{{ mana - MAX_GLASSES }}</span>
    </div>
  </div>
</template>

<style scoped>
.glass-enter-active {
  animation: glass-pop 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.glass-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.glass-leave-to {
  opacity: 0;
  transform: translate3d(0, 8px, 0);
}
@keyframes glass-pop {
  from {
    opacity: 0;
    transform: translate3d(0, -14px, 0) scale(1.4);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}
</style>
