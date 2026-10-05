<script setup lang="ts">
const room = useRoom()
const visible = ref<{ id: number; text: string } | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined

watch(
  () => room.toast.value,
  (toast) => {
    if (!toast) return
    visible.value = toast
    clearTimeout(timer)
    timer = setTimeout(() => (visible.value = null), 2800)
  }
)
</script>

<template>
  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="visible"
        :key="visible.id"
        class="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4"
        :style="{ top: 'calc(0.75rem + var(--safe-top))' }"
      >
        <div class="rounded-xl border border-amber/50 bg-panel2 px-4 py-2 text-sm shadow-lg shadow-black/50">{{ visible.text }}</div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate3d(0, -12px, 0);
}
</style>
