<script setup lang="ts">
withDefaults(defineProps<{ title?: string; dismissable?: boolean }>(), { title: '', dismissable: true })
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-40 flex items-end justify-center">
      <div class="anim-fade absolute inset-0 bg-black/65" @click="dismissable && emit('close')" />
      <div
        class="sheet anim-sheet relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[22px] bg-panel p-4"
        :style="{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }"
      >
        <div class="mx-auto -mt-1 mb-2 h-1.5 w-12 rounded-full bg-line" />
        <div class="mb-3 flex items-center justify-between">
          <h2 class="font-display text-xl font-bold">{{ title }}</h2>
          <button v-if="dismissable" class="btn btn-ghost min-h-9 px-3" @click="emit('close')">×</button>
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.sheet {
  border: 3px solid #050304;
  border-bottom: 0;
  box-shadow: inset 0 3px 0 #2e2224;
}
</style>
