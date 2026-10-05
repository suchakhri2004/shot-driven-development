<script setup lang="ts">
const room = useRoom()
const sound = useSound()

onMounted(() => {
  room.init()
  // browsers block audio until the first touch
  window.addEventListener('pointerdown', sound.unlock, { once: true })
})
</script>

<template>
  <div class="bg-atmosphere min-h-dvh">
    <ConnectionBanner />
    <NuxtPage />
    <ToastHost />
  </div>
</template>
