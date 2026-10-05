<script setup lang="ts">
import { theme } from '~/theme/theme'

const emit = defineEmits<{ close: []; log: []; rules: [] }>()
const room = useRoom()
const sound = useSound()

/** Dangerous actions need a second tap so nobody drops out by accident. */
const confirming = ref<'ko' | 'leave' | null>(null)
const alive = computed(() => !!room.me.value?.alive && !room.state.value?.finished)

async function declareKo() {
  await room.send({ type: 'declare_ko' })
  emit('close')
}
async function leave() {
  await room.leave()
  await navigateTo('/')
}
</script>

<template>
  <BottomSheet title="เมนู" @close="emit('close')">
    <div class="space-y-2">
      <button class="btn w-full justify-start" @click="emit('rules')"><GameIcon name="rules" /> วิธีเล่น</button>
      <button class="btn w-full justify-start" @click="emit('log')"><GameIcon name="log" /> ดู Game log</button>
      <button class="btn w-full justify-start" @click="sound.toggleMute()">
        <GameIcon :name="sound.muted.value ? 'mute' : 'sound'" tone="steel" /> {{ sound.muted.value ? 'เสียงปิดอยู่ (แตะเพื่อเปิด)' : 'เสียงเปิดอยู่ (แตะเพื่อปิด)' }}
      </button>
      <button class="btn w-full justify-start" :disabled="sound.muted.value" @click="sound.toggleMusic()">
        <GameIcon name="music" tone="steel" /> {{ sound.music.value ? 'เพลงพื้นหลังเปิดอยู่ (แตะเพื่อปิด)' : 'เปิดเพลงพื้นหลัง lo-fi' }}
      </button>
      <p class="px-1 text-xs text-dim">ถ้านั่งห้องเดียวกันหลายเครื่อง แนะนำให้เปิดเพลงแค่เครื่องเดียว</p>

      <template v-if="alive">
        <button v-if="confirming !== 'ko'" class="btn btn-danger w-full justify-start" @click="confirming = 'ko'">
          <GameIcon name="skull" /> ไปต่อไม่ไหวแล้ว ({{ theme.overflow }})
        </button>
        <div v-else class="space-y-2 rounded-xl border border-danger/60 p-3">
          <p class="text-sm">ยืนยันออกจากเกมด้วย <b>{{ theme.overflow }}</b>? ย้อนกลับไม่ได้</p>
          <div class="grid grid-cols-2 gap-2">
            <button class="btn btn-ghost" @click="confirming = null">ไม่ใช่</button>
            <button class="btn btn-danger" @click="declareKo">ยืนยัน</button>
          </div>
        </div>
      </template>

      <button v-if="confirming !== 'leave'" class="btn w-full justify-start text-dim" @click="confirming = 'leave'"><GameIcon name="exit" tone="steel" /> ออกจากห้อง</button>
      <div v-else class="space-y-2 rounded-xl border border-line p-3">
        <p class="text-sm">ออกจากห้อง? ถ้าเกมกำลังเล่นอยู่ คุณจะนับเป็นตกรอบ</p>
        <div class="grid grid-cols-2 gap-2">
          <button class="btn btn-ghost" @click="confirming = null">ยกเลิก</button>
          <button class="btn btn-danger" @click="leave">ออก</button>
        </div>
      </div>
    </div>
  </BottomSheet>
</template>
