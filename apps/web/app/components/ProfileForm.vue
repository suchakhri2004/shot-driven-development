<script setup lang="ts">
import { avatarIds } from '~/theme/theme'

const props = defineProps<{ mode: 'create' | 'join'; initialCode?: string }>()
const emit = defineEmits<{ done: [code: string]; cancel: [] }>()

const room = useRoom()
const saved = import.meta.client ? room.savedProfile() : null

const code = ref((props.initialCode ?? '').toUpperCase())
const name = ref(saved?.name ?? '')
const avatar = ref(saved?.avatar ?? avatarIds[Math.floor(Math.random() * avatarIds.length)])
const nonAlcoholic = ref(saved?.nonAlcoholic ?? false)
const birthYear = ref<number | undefined>(saved?.birthYear)
const adult = ref(false)
const busy = ref(false)

const valid = computed(() => name.value.trim().length > 0 && adult.value && (props.mode === 'create' || code.value.length === 6))

async function submit() {
  if (!valid.value || busy.value) return
  busy.value = true
  const profile = {
    name: name.value.trim(),
    avatar: avatar.value,
    nonAlcoholic: nonAlcoholic.value,
    birthYear: birthYear.value || undefined
  }
  const ok = props.mode === 'create' ? await room.createRoom(profile) : await room.joinRoom(code.value, profile)
  busy.value = false
  if (ok) emit('done', room.lobby.value!.code)
}
</script>

<template>
  <form class="panel anim-pop space-y-4 p-4" @submit.prevent="submit">
    <h2 class="font-display text-xl font-bold">{{ mode === 'create' ? 'สร้างห้องใหม่' : 'เข้าร่วมห้อง' }}</h2>

    <label v-if="mode === 'join'" class="block space-y-1">
      <span class="text-sm text-dim">รหัสห้อง 6 ตัว</span>
      <input
        v-model="code"
        class="input text-center font-mono text-2xl uppercase tracking-[0.4em]"
        maxlength="6"
        autocomplete="off"
        autocapitalize="characters"
        inputmode="text"
        placeholder="ABC123"
      />
    </label>

    <label class="block space-y-1">
      <span class="text-sm text-dim">ชื่อที่ใช้แสดง</span>
      <input v-model="name" class="input" maxlength="20" autocomplete="nickname" placeholder="เช่น Boss" />
    </label>

    <div class="space-y-1">
      <span class="text-sm text-dim">ตำแหน่ง (avatar)</span>
      <AvatarPicker v-model="avatar" />
    </div>

    <label class="block space-y-1">
      <span class="text-sm text-dim">ปีเกิด (ไม่บังคับ — ใช้หาคนอายุมากสุดเพื่อเริ่มก่อน)</span>
      <input v-model.number="birthYear" class="input" type="number" inputmode="numeric" min="1900" max="2100" placeholder="เช่น 1995" />
    </label>

    <label class="flex items-start gap-3 rounded-xl border border-line bg-panel2 p-3">
      <input v-model="nonAlcoholic" type="checkbox" class="mt-1 h-5 w-5 accent-[#f2e8dc]" />
      <span class="text-sm">
        <b>สายไม่ดื่มแอลกอฮอล์</b>
        <span class="block text-xs text-dim">กติกาเหมือนเดิมทุกอย่าง แต่ซดน้ำหรือโซดาแทน</span>
      </span>
    </label>

    <label class="flex items-start gap-3 text-sm">
      <input v-model="adult" type="checkbox" class="mt-1 h-5 w-5 accent-[#f2e8dc]" />
      <span>ฉันอายุ 18 ปีขึ้นไป และเข้าใจว่านี่เป็นเกมดื่ม ฉันจะดื่มอย่างรับผิดชอบและไม่ขับรถหลังดื่ม</span>
    </label>

    <div class="flex gap-2">
      <button type="button" class="btn btn-ghost flex-1" @click="emit('cancel')">ยกเลิก</button>
      <button type="submit" class="btn btn-primary flex-[2]" :disabled="!valid || busy">
        {{ busy ? 'กำลังเชื่อมต่อ…' : mode === 'create' ? 'สร้างห้อง' : 'เข้าห้อง' }}
      </button>
    </div>
  </form>
</template>
