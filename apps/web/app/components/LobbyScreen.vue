<script setup lang="ts">
const room = useRoom()
const lobby = computed(() => room.lobby.value!)
const editingProfile = ref(false)

const me = computed(() => lobby.value.players.find((p) => p.id === room.myId.value))
const others = computed(() => lobby.value.players.filter((p) => p.id !== lobby.value.hostId))

/** Why the host cannot start yet (null = can start). */
const blocker = computed(() => {
  const l = lobby.value
  if (l.players.length < l.minPlayers) return `ต้องมีผู้เล่นอย่างน้อย ${l.minPlayers} คน (ตอนนี้ ${l.players.length})`
  if (l.players.some((p) => !p.connected)) return 'มีผู้เล่นหลุดการเชื่อมต่อ'
  if (others.value.some((p) => !p.ready)) return 'รอผู้เล่นกด "พร้อม" ให้ครบ'
  return null
})

function move(playerId: string, delta: -1 | 1) {
  const order = lobby.value.players.map((p) => p.id)
  const from = order.indexOf(playerId)
  const to = from + delta
  if (to < 0 || to >= order.length) return
  ;[order[from], order[to]] = [order[to], order[from]]
  void room.reorder(order)
}

async function leave() {
  await room.leave()
  await navigateTo('/')
}
</script>

<template>
  <main
    class="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-3 px-4"
    :style="{ paddingBlock: 'calc(1rem + var(--safe-top)) calc(1rem + var(--safe-bottom))' }"
  >
    <header class="flex items-center justify-between">
      <h1 class="font-display text-xl font-bold"><GameIcon name="shot" /> ล็อบบี้</h1>
      <button class="btn btn-ghost min-h-9 px-3 text-sm text-dim" @click="leave">ออกจากห้อง</button>
    </header>

    <RoomInvite :code="lobby.code" />

    <section class="panel p-3">
      <div class="mb-2 flex items-center justify-between px-1">
        <h2 class="font-display font-bold">ผู้เล่น {{ lobby.players.length }}/{{ lobby.maxPlayers }}</h2>
        <span class="text-xs text-dim">ลำดับ = ที่นั่ง ตามเข็มนาฬิกา</span>
      </div>

      <TransitionGroup name="vlist" tag="ul" class="space-y-2">
        <li
          v-for="(p, index) in lobby.players"
          :key="p.id"
          class="flex items-center gap-3 rounded-xl border bg-panel2 p-2 pr-3 transition-colors"
          :class="p.id === me?.id ? 'border-neon/60' : 'border-line'"
        >
          <PlayerAvatar :avatar="p.avatar" :size="44" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1 truncate font-semibold">
              <span v-if="p.id === lobby.hostId" title="เจ้าของห้อง"><GameIcon name="crown" /></span>
              <span class="truncate">{{ p.name }}</span>
              <span v-if="p.id === me?.id" class="text-xs text-neon">(คุณ)</span>
            </div>
            <div class="flex flex-wrap gap-1 text-[11px]">
              <span v-if="!p.connected" class="chip border-danger/60 text-danger">หลุด</span>
              <span v-else-if="p.ready" class="chip border-neon/60 text-neon"><GameIcon name="ready" /> พร้อม</span>
              <span v-else class="chip">รอ…</span>
              <span v-if="p.nonAlcoholic" class="chip"><GameIcon name="sober" /> ไม่ดื่มแอลกอฮอล์</span>
            </div>
          </div>
          <div v-if="room.isHost.value" class="flex items-center gap-1">
            <button class="btn btn-ghost min-h-9 px-2" :disabled="index === 0" @click="move(p.id, -1)">▲</button>
            <button class="btn btn-ghost min-h-9 px-2" :disabled="index === lobby.players.length - 1" @click="move(p.id, 1)">▼</button>
            <button v-if="p.id !== lobby.hostId" class="btn btn-danger min-h-9 px-2" @click="room.kick(p.id)">×</button>
          </div>
        </li>
      </TransitionGroup>

      <button class="btn mt-3 w-full text-sm" @click="editingProfile = true">แก้ไขโปรไฟล์ของฉัน</button>
    </section>

    <LobbyConfig :lobby="lobby" :editable="room.isHost.value" />

    <div class="mt-auto space-y-2 pt-2">
      <template v-if="room.isHost.value">
        <p v-if="blocker" class="text-center text-sm text-amber">{{ blocker }}</p>
        <button class="btn btn-primary w-full text-lg" :disabled="!!blocker" @click="room.startGame()">▶ เริ่มเกม</button>
      </template>
      <template v-else>
        <button
          class="btn w-full text-lg"
          :class="me?.ready ? 'btn-ghost' : 'btn-primary'"
          @click="room.setReady(!me?.ready)"
        >
          <template v-if="me?.ready">ยกเลิกพร้อม</template>
          <template v-else><GameIcon name="ready" tone="paper" /> พร้อมแล้ว</template>
        </button>
        <p class="text-center text-xs text-dim">รอเจ้าของห้องกดเริ่มเกม</p>
      </template>
    </div>

    <ProfileSheet v-if="editingProfile" @close="editingProfile = false" />
  </main>
</template>
