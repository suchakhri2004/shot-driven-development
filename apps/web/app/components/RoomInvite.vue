<script setup lang="ts">
const props = defineProps<{ code: string }>()
const room = useRoom()

const joinUrl = computed(() => `${location.origin}/room/${props.code}`)
const qr = ref('')

// the QR library is only needed here, so load it lazily and keep the main bundle small
onMounted(async () => {
  const { toDataURL } = await import('qrcode')
  qr.value = await toDataURL(joinUrl.value, { margin: 1, width: 220, color: { dark: '#04130a', light: '#d7e2f0' } })
})

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    room.notify(`คัดลอก${label}แล้ว`)
  } catch {
    room.notify(text)
  }
}
</script>

<template>
  <div class="panel flex items-center gap-4 p-4">
    <div class="min-w-0 flex-1">
      <div class="text-xs text-dim">รหัสห้อง</div>
      <div class="font-mono text-4xl font-bold tracking-[0.25em] text-neon">{{ code }}</div>
      <div class="mt-2 flex flex-wrap gap-2">
        <button class="btn min-h-9 px-3 text-sm" @click="copy(code, 'รหัส')"><GameIcon name="copy" /> รหัส</button>
        <button class="btn min-h-9 px-3 text-sm" @click="copy(joinUrl, 'ลิงก์')"><GameIcon name="link" /> ลิงก์</button>
      </div>
    </div>
    <img v-if="qr" :src="qr" alt="QR เข้าห้อง" class="h-[104px] w-[104px] shrink-0 rounded-lg" />
    <div v-else class="h-[104px] w-[104px] shrink-0 animate-pulse rounded-lg bg-panel2" />
  </div>
</template>
