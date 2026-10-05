<template>
  <main
    class="mx-auto min-h-dvh w-full max-w-md px-4"
    :style="{ paddingBlock: 'calc(1rem + var(--safe-top)) calc(2rem + var(--safe-bottom))' }"
  >
    <div class="mb-2 flex items-center justify-between">
      <NuxtLink to="/" class="btn btn-ghost -ml-3 min-h-10">← กลับ</NuxtLink>
      <h1 class="font-display text-xl font-bold"><GameIcon name="rules" /> วิธีเล่น</h1>
      <span class="w-14" />
    </div>
    <HowToPlay />
  </main>
</template>
