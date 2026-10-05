<script setup lang="ts">
import type { LobbyView } from '@sdd/protocol'

const props = defineProps<{ lobby: LobbyView; editable: boolean }>()
const room = useRoom()

const config = computed(() => props.lobby.config)
const open = ref(false)

const set = (patch: Parameters<typeof room.updateConfig>[0]) => room.updateConfig(patch)
</script>

<template>
  <div class="panel">
    <button class="flex w-full items-center justify-between p-4" @click="open = !open">
      <span class="font-display font-bold">ตั้งค่าเกม</span>
      <span class="text-dim">{{ open ? '▲' : '▼' }}</span>
    </button>

    <div v-if="open" class="space-y-4 border-t border-line p-4 text-sm">
      <label class="flex items-center justify-between gap-3">
        <span>
          <b>git init</b> ช็อตเปิดเกม
          <span class="block text-xs text-dim">ทุกคนซดคนละช็อตก่อนเริ่ม (กติกาบ้าน ปิดเพื่อเล่นตามต้นฉบับ)</span>
        </span>
        <input
          type="checkbox"
          class="h-6 w-6 accent-[#f2e8dc]"
          :checked="config.openingShot"
          :disabled="!editable"
          @change="set({ openingShot: ($event.target as HTMLInputElement).checked })"
        />
      </label>

      <label class="flex items-center justify-between gap-3">
        <span>
          <b>การ์ดพิเศษ</b> Coffee Break + Hackathon
          <span class="block text-xs text-dim">พักเกม 10 นาที และมินิเกมเล่นกันในวง (กติกาบ้าน ปิดเพื่อเล่นตามต้นฉบับ)</span>
        </span>
        <input
          type="checkbox"
          class="h-6 w-6 accent-[#f2e8dc]"
          :checked="config.houseCards"
          :disabled="!editable"
          @change="set({ houseCards: ($event.target as HTMLInputElement).checked })"
        />
      </label>

      <label class="flex items-center justify-between gap-3">
        <span>
          เวลาตอบโต้ (วินาที)
          <span class="block text-xs text-dim">หน้าต่างให้เล่นการ์ด Defend ตอนถูกโจมตี</span>
        </span>
        <select
          class="input w-24"
          :value="config.responseWindowSec"
          :disabled="!editable"
          @change="set({ responseWindowSec: Number(($event.target as HTMLSelectElement).value) })"
        >
          <option v-for="s in [5, 10, 15, 20, 30]" :key="s" :value="s">{{ s }}</option>
        </select>
      </label>

      <label class="flex items-center justify-between gap-3">
        <span>
          KO จากการซด
          <span class="block text-xs text-dim">ต้นฉบับ: ผู้เล่นประกาศเองว่า "ไปต่อไม่ไหว"</span>
        </span>
        <select
          class="input w-36"
          :value="config.koMode"
          :disabled="!editable"
          @change="set({ koMode: ($event.target as HTMLSelectElement).value as 'self-declare' | 'potion-limit', potionLimit: config.potionLimit ?? 8 })"
        >
          <option value="self-declare">ประกาศเอง</option>
          <option value="potion-limit">จำกัดจำนวนช็อต</option>
        </select>
      </label>

      <label v-if="config.koMode === 'potion-limit'" class="flex items-center justify-between gap-3">
        <span>ซดได้สูงสุด (ช็อต)</span>
        <input
          type="number"
          class="input w-24"
          min="1"
          max="50"
          :value="config.potionLimit ?? 8"
          :disabled="!editable"
          @change="set({ potionLimit: Number(($event.target as HTMLInputElement).value) })"
        />
      </label>

      <p v-if="!editable" class="text-xs text-dim">เฉพาะเจ้าของห้องเปลี่ยนการตั้งค่าได้</p>
    </div>
  </div>
</template>
