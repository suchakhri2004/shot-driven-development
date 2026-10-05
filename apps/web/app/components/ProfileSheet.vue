<script setup lang="ts">
const emit = defineEmits<{ close: [] }>()
const room = useRoom()

const mine = computed(() => room.lobby.value?.players.find((p) => p.id === room.myId.value))
const name = ref(mine.value?.name ?? '')
const avatar = ref(mine.value?.avatar ?? 'backend')
const nonAlcoholic = ref(mine.value?.nonAlcoholic ?? false)

async function save() {
  const ok = await room.updateProfile({ name: name.value.trim() || mine.value?.name, avatar: avatar.value, nonAlcoholic: nonAlcoholic.value })
  if (ok) emit('close')
}
</script>

<template>
  <BottomSheet title="แก้ไขโปรไฟล์" @close="emit('close')">
    <div class="space-y-4">
      <input v-model="name" class="input" maxlength="20" />
      <AvatarPicker v-model="avatar" />
      <label class="flex items-center gap-3 rounded-xl border border-line bg-panel2 p-3 text-sm">
        <input v-model="nonAlcoholic" type="checkbox" class="h-5 w-5 accent-[#f2e8dc]" />
        สายไม่ดื่มแอลกอฮอล์
      </label>
      <button class="btn btn-primary w-full" @click="save">บันทึก</button>
    </div>
  </BottomSheet>
</template>
