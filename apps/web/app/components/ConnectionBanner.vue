<script setup lang="ts">
const room = useRoom()
</script>

<template>
  <div
    v-if="room.connection.value !== 'online'"
    class="fixed inset-x-0 top-0 z-50 bg-danger/90 px-3 py-1 text-center text-xs font-semibold text-white"
    :style="{ paddingTop: 'calc(0.25rem + var(--safe-top))' }"
  >
    {{ room.connection.value === 'connecting' ? 'กำลังเชื่อมต่อเซิร์ฟเวอร์…' : 'ขาดการเชื่อมต่อ กำลังต่อใหม่…' }}
  </div>
</template>
