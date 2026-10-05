<script setup lang="ts">
/** The back of a card (draw / discard piles): deep purple stock, cream border, an amber "</>" stamp. */
withDefaults(defineProps<{ size?: number }>(), { size: 40 })
</script>

<template>
  <div class="cardback" :style="{ width: `${size}px`, height: `${size * 1.4}px` }">
    <span :style="{ fontSize: `${size * 0.36}px` }">&lt;/&gt;</span>
  </div>
</template>

<style scoped>
.cardback {
  display: grid;
  place-items: center;
  border-radius: 6px;
  font: 800 1em 'Kanit', sans-serif;
  color: #f3e7cc;
  background:
    repeating-linear-gradient(45deg, rgba(243, 231, 204, 0.08) 0 4px, transparent 4px 9px),
    #4a1015;
  border: 2px solid #050304;
  box-shadow: inset 0 0 0 2px #f3e7cc, inset 0 0 0 4px #4a1015, inset 0 0 0 5px rgba(243, 231, 204, 0.4), 1px 2px 0 #050304;
}
</style>
