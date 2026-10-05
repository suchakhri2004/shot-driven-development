<script setup lang="ts">
const route = useRoute()
const room = useRoom()

const code = computed(() => String(route.params.code).toUpperCase())
const inThisRoom = computed(() => room.lobby.value?.code === code.value)
/** We hold a saved seat for this room and are re-attaching to it. */
const returning = computed(() => !inThisRoom.value && room.session.value?.code === code.value)
</script>

<template>
  <LobbyScreen v-if="inThisRoom && room.lobby.value!.phase === 'lobby'" />

  <GameScreen v-else-if="inThisRoom && room.state.value" />

  <main v-else-if="inThisRoom || returning" class="grid min-h-dvh place-items-center">
    <div class="text-center text-dim">
      <div class="mb-3 animate-bounce text-5xl"><GameIcon name="shot" /></div>
      กำลังเข้าห้อง {{ code }}…
    </div>
  </main>

  <main v-else class="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-4">
    <p class="text-center text-sm text-dim">ใส่ข้อมูลของคุณเพื่อเข้าห้อง <b class="font-mono text-neon">{{ code }}</b></p>
    <ProfileForm mode="join" :initial-code="code" @done="() => undefined" @cancel="navigateTo('/')" />
  </main>
</template>
