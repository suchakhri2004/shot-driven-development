<script setup lang="ts">
import { DECK } from '@sdd/cards'
import { ICON_CREDIT } from '~/theme/icon-data'
import { theme } from '~/theme/theme'

/**
 * The "how to play" guide: short sections, big pictures, real cards as examples.
 * Used by the /rules page and by the in-game menu, so players can check the rules without leaving a room.
 */
const card = (id: string) => DECK.find((c) => c.id === id)!

const sections = [
  { id: 'goal', label: 'เป้าหมาย' },
  { id: 'basics', label: 'พื้นฐาน' },
  { id: 'shot', label: 'ซด' },
  { id: 'turn', label: 'เทิร์น' },
  { id: 'play', label: 'เล่นการ์ด' },
  { id: 'types', label: 'ประเภท' },
  { id: 'defend', label: 'ตอบโต้' },
  { id: 'short', label: 'ไม่พอ' },
  { id: 'out', label: 'ตกรอบ' }
]

const rebase = [1, 2, 3, 4]
const cardTypes = [
  { id: 'null-pointer', title: 'โจมตี', text: 'ทำให้คนอื่นเสีย Uptime' },
  { id: 'try-catch', title: 'ป้องกัน', text: 'ใช้ตอบโต้ตอนถูกโจมตี' },
  { id: 'rubber-duck', title: 'ซัพพอร์ต', text: 'ฟื้น Uptime จั่วการ์ด' },
  { id: 'memory-leak', title: 'คำสาป', text: 'ทำให้คู่แข่งเสียเปรียบ' },
  { id: 'mechanical-keyboard', title: 'Artifact', text: 'วางไว้ ได้ผลต่อเนื่อง' },
  { id: 'prod-down', title: 'Incident', text: 'จั่วได้ปุ๊บ เกิดผลทันที' }
]

function jump(id: string) {
  document.getElementById(`howto-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div class="space-y-5 pb-4">
    <!-- jump bar -->
    <nav class="scroll-x sticky top-0 z-10 -mx-1 gap-2 bg-bg/95 px-1 py-2">
      <button v-for="s in sections" :key="s.id" class="chip shrink-0 !px-3 !py-1.5 text-xs" @click="jump(s.id)">{{ s.label }}</button>
    </nav>

    <!-- 1. goal -->
    <section id="howto-goal" class="panel anim-pop space-y-3 p-4">
      <h2 class="font-display text-xl font-bold text-neon"><GameIcon name="trophy" /> เป้าหมาย: เหลือคนสุดท้าย</h2>
      <div class="flex items-end justify-center gap-2">
        <div v-for="(p, i) in [{ a: 'frontend', hp: 0.0, out: true }, { a: 'qa', hp: 0.0, out: true }, { a: 'backend', hp: 0.7, out: false }, { a: 'devops', hp: 0.0, out: true }]" :key="i" class="w-[22%] text-center">
          <div v-if="!p.out" class="mb-1 text-2xl"><GameIcon name="trophy" /></div>
          <PlayerAvatar :avatar="p.a" :size="44" :dead="p.out" class="mx-auto" />
          <div class="mt-1"><HpBar :hp="p.hp * 10" :max-hp="10" /></div>
        </div>
      </div>
      <p class="text-sm leading-relaxed">ซดและร่ายการ์ดใส่กัน <b>ใครเหลือคนเดียวคือผู้ชนะ</b> แพ้ได้ 2 ทาง:</p>
      <div class="grid grid-cols-2 gap-2 text-center text-sm">
        <div class="rounded-xl border border-danger/50 bg-danger/10 p-3"><div class="text-2xl"><GameIcon name="attack" /></div><b>{{ theme.crashed }}</b><div class="text-xs text-dim">{{ theme.hp.name }} เหลือ 0</div></div>
        <div class="rounded-xl border border-amber/50 bg-amber/10 p-3"><div class="text-2xl"><GameIcon name="skull" /></div><b>{{ theme.overflow }}</b><div class="text-xs text-dim">ซดเยอะจนไปต่อไม่ไหว</div></div>
      </div>
    </section>

    <!-- 2. basics -->
    <section id="howto-basics" class="panel space-y-3 p-4">
      <h2 class="font-display text-xl font-bold text-neon"><GameIcon name="cards" /> ทุกคนเริ่มด้วย 3 อย่าง</h2>
      <div class="grid grid-cols-3 gap-2 text-center">
        <div class="rounded-xl border border-neon/40 bg-panel2 p-3">
          <div class="font-mono text-3xl font-bold text-neon">10</div>
          <div class="text-xs"><GameIcon name="hp" /> {{ theme.hp.name }}</div>
          <div class="mt-1 text-[11px] text-dim">เลือด หมดคือแพ้</div>
        </div>
        <div class="rounded-xl border border-amber/40 bg-panel2 p-3">
          <div class="font-mono text-3xl font-bold text-amber">0</div>
          <div class="text-xs"><GameIcon name="shot" /> {{ theme.mana.name }}</div>
          <div class="mt-1 text-[11px] text-dim">พลังเวท ใช้จ่ายค่าการ์ด</div>
        </div>
        <div class="rounded-xl border border-violet/40 bg-panel2 p-3">
          <div class="font-mono text-3xl font-bold text-violet">5</div>
          <div class="text-xs"><GameIcon name="cards" /> การ์ดในมือ</div>
          <div class="mt-1 text-[11px] text-dim">จั่วเติมจนครบ 5 ทุกเทิร์น</div>
        </div>
      </div>
    </section>

    <!-- 3. drinking -->
    <section id="howto-shot" class="panel space-y-3 p-4">
      <h2 class="font-display text-xl font-bold text-neon"><GameIcon name="shot" /> ซด 1 ช็อต = ได้ Shot Stack +3</h2>
      <div class="flex items-center justify-center gap-3">
        <div class="btn btn-amber pointer-events-none flex-col !gap-0 py-1 leading-tight">
          <span><GameIcon name="shot" tone="paper" /> {{ theme.drink.button }}</span>
          <span class="font-mono text-[11px] opacity-80">+3 {{ theme.mana.name }}</span>
        </div>
        <span class="text-2xl text-neon">→</span>
        <div class="text-center">
          <ShotStack :mana="3" big />
          <div class="text-[11px] text-dim">ดื่มจริง 1 ช็อต แล้วกดปุ่ม</div>
        </div>
      </div>
      <ul class="space-y-1 text-sm">
        <li><b>ซดได้ทุกเวลา</b> แม้ไม่ใช่เทิร์นคุณ แม้ตอนโดนโจมตีอยู่</li>
        <li>Shot Stack ไม่มีเพดาน แต่ซดมากไปก็เสี่ยง {{ theme.overflow }}</li>
        <li><GameIcon name="sober" /> เลือก "สายไม่ดื่มแอลกอฮอล์" ได้ กติกาเหมือนเดิม แค่ซดน้ำแทน</li>
      </ul>
    </section>

    <!-- 4. turn -->
    <section id="howto-turn" class="panel space-y-3 p-4">
      <h2 class="font-display text-xl font-bold text-neon">▶ เทิร์นของคุณ</h2>
      <div class="space-y-2">
        <div class="flex items-center gap-3 rounded-xl bg-panel2 p-3">
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neon font-bold text-black">1</span>
          <div class="text-sm"><b>จั่วการ์ด</b> จนมือครบ 5 ใบ<span class="block text-xs text-dim">ถ้าเจอ Incident <GameIcon name="incident" /> ให้เปิดและทำตามทันที แล้วจั่วใบใหม่</span></div>
        </div>
        <div class="text-center text-neon">⬇</div>
        <div class="rounded-xl border border-neon/40 bg-panel2 p-3">
          <div class="mb-2 flex items-center gap-3">
            <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neon font-bold text-black">2</span>
            <b class="text-sm">ทำอะไรก็ได้ กี่ครั้งก็ได้ สลับลำดับได้</b>
          </div>
          <div class="grid grid-cols-2 gap-2 text-center text-xs">
            <div class="rounded-lg bg-panel p-2"><GameIcon name="cards" /> <b>เล่นการ์ด</b></div>
            <div class="rounded-lg bg-panel p-2"><GameIcon name="shot" /> <b>ซด</b></div>
            <div class="rounded-lg bg-panel p-2"><GameIcon name="trash" /> <b>ทิ้งการ์ด</b> (ฟรี)</div>
            <div class="rounded-lg bg-panel p-2"><GameIcon name="rebase" tone="blue" /> <b>{{ theme.rebase.name }}</b> ทิ้ง 1 จั่ว 1</div>
          </div>
        </div>
        <div class="text-center text-neon">⬇</div>
        <div class="flex items-center gap-3 rounded-xl bg-panel2 p-3">
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neon font-bold text-black">3</span>
          <div class="text-sm"><b>กด "จบเทิร์น"</b> ส่งต่อให้คนถัดไป (ตามเข็มนาฬิกา)</div>
        </div>
      </div>
      <div class="rounded-xl border border-line p-3 text-sm">
        <b>{{ theme.rebase.name }} แพงขึ้นเรื่อย ๆ ในเทิร์นเดียว:</b>
        <div class="mt-2 flex items-center justify-center gap-2">
          <template v-for="(n, i) in rebase" :key="n">
            <span class="rounded-lg bg-panel2 px-3 py-1 text-center">ครั้งที่ {{ n }}<br /><b class="font-mono text-amber"><GameIcon name="shot" />{{ n }}</b></span>
            <span v-if="i < rebase.length - 1" class="text-dim">›</span>
          </template>
        </div>
        <div class="mt-1 text-center text-xs text-dim">เทิร์นใหม่เริ่มนับที่ 1 ใหม่</div>
      </div>
    </section>

    <!-- 5. playing a card -->
    <section id="howto-play" class="panel space-y-3 p-4">
      <h2 class="font-display text-xl font-bold text-neon"><GameIcon name="cards" /> เล่นการ์ด ทำยังไง</h2>
      <div class="flex items-center gap-4">
        <GameCard :def="card('null-pointer')" size="sm" playable />
        <div class="min-w-0 flex-1 space-y-2 text-sm">
          <div class="rounded-lg bg-panel2 p-2 text-center">
            <div class="text-xs text-dim">ตัวอย่าง: การ์ดนี้ราคา <GameIcon name="shot" />2</div>
            <div class="font-mono text-lg"><span class="text-amber">3</span> − <span class="text-amber">2</span> = <b class="text-neon">1</b> เหลือ</div>
          </div>
          <div class="text-xs text-dim">มี 3 → จ่าย 2 → เหลือ 1 แล้วโจมตีใส่คนที่เลือก (-3 {{ theme.hp.name }})</div>
        </div>
      </div>
      <ol class="space-y-1.5 text-sm">
        <li><b class="text-amber">①</b> ดูมุมซ้ายบนของการ์ด = ราคา (ถ้า {{ theme.mana.name }} ไม่พอ ซดก่อน)</li>
        <li><b class="text-amber">②</b> แตะการ์ดในมือ → เลือกเป้าหมาย</li>
        <li><b class="text-amber">③</b> กด "เล่นการ์ด"</li>
        <li><b class="text-amber">④</b> อ่านข้อความสีเขียวบนการ์ดออกเสียงให้ทุกคนได้ยิน</li>
      </ol>
      <div class="flex items-center gap-3 rounded-xl border border-amber/40 bg-panel2 p-3">
        <GameCard :def="card('merge-conflict')" size="xs" />
        <div class="text-xs leading-relaxed">
          <b class="text-amber">บางใบต้อง "ทิ้งการ์ดอีกใบ" ด้วย</b><br />
          เช่น Merge Conflict ต้องทิ้งการ์ด <GameIcon name="hotfix" /> Hotfix 1 ใบ แลกกับพลังโจมตีที่แรงกว่า ราคาถูกกว่า
        </div>
      </div>
    </section>

    <!-- 6. card types -->
    <section id="howto-types" class="panel space-y-3 p-4">
      <h2 class="font-display text-xl font-bold text-neon"><GameIcon name="cards" /> การ์ด 6 ประเภท</h2>
      <div class="grid grid-cols-3 gap-x-2 gap-y-3">
        <div v-for="t in cardTypes" :key="t.id" class="flex flex-col items-center gap-1 text-center">
          <GameCard :def="card(t.id)" size="xs" />
          <b class="text-xs">{{ t.title }}</b>
          <span class="text-[10px] leading-tight text-dim">{{ t.text }}</span>
        </div>
      </div>
      <div class="rounded-xl bg-panel2 p-3 text-xs leading-relaxed">
        <b>โจมตีมี 3 ธาตุ</b> (สีบนการ์ดต่างกัน):
        <span class="chip border-hotfix/60 text-hotfix"><GameIcon name="hotfix" /> Hotfix</span>
        <span class="chip border-freeze/60 text-freeze"><GameIcon name="freeze" /> Code Freeze</span>
        <span class="chip border-deploy/60 text-deploy"><GameIcon name="deploy" /> Deploy</span><br />
        ธาตุสำคัญเวลาการ์ดบอกให้ "ทิ้งการ์ดธาตุเดียวกัน" เป็นค่าใช้จ่าย
      </div>
    </section>

    <!-- 7. defending -->
    <section id="howto-defend" class="panel space-y-3 p-4">
      <h2 class="font-display text-xl font-bold text-neon"><GameIcon name="defend" /> โดนโจมตี? ตอบโต้ได้!</h2>
      <div class="flex items-center justify-center gap-2">
        <div class="text-center"><PlayerAvatar avatar="backend" :size="40" class="mx-auto" /><div class="text-[11px]">Alice</div></div>
        <GameCard :def="card('null-pointer')" size="xs" />
        <span class="text-2xl text-danger">→</span>
        <div class="text-center"><PlayerAvatar avatar="qa" :size="40" class="mx-auto" /><div class="text-[11px]">Bob</div></div>
      </div>
      <p class="text-center text-sm">Bob จะมี <b class="text-amber">10 วินาที</b> ให้ตัดสินใจ:</p>
      <div class="grid grid-cols-2 gap-2 text-center text-xs">
        <div class="space-y-1 rounded-xl border border-neon/50 bg-neon/10 p-2">
          <GameCard :def="card('try-catch')" size="xs" class="mx-auto" />
          <div><b>เล่นการ์ดป้องกัน</b></div>
          <div class="text-neon">ยกเลิก ไม่เสียอะไร</div>
        </div>
        <div class="space-y-1 rounded-xl border border-danger/50 bg-danger/10 p-2">
          <div class="grid h-[7.4rem] place-items-center text-4xl"><GameIcon name="endturn" /></div>
          <div><b>กด Pass / หมดเวลา</b></div>
          <div class="text-danger"><GameIcon name="attack" /> โดนเต็ม ๆ -3 {{ theme.hp.name }}</div>
        </div>
      </div>
      <ul class="space-y-1 text-sm">
        <li><GameIcon name="shot" /> ซดได้ระหว่างนี้ ถ้า {{ theme.mana.name }} ไม่พอจ่ายค่าการ์ดป้องกัน</li>
        <li><GameIcon name="rebase" /> ผู้โจมตีอาจตอบโต้การป้องกันกลับได้ ถ้ามีการ์ดที่ใช้ได้ (เช่น Force Push)</li>
        <li>ไม่มีการ์ดป้องกันในมือ = ระบบข้ามให้เลย ไม่ต้องกดอะไร</li>
      </ul>
    </section>

    <!-- 8. not enough -->
    <section id="howto-short" class="panel space-y-3 p-4">
      <h2 class="font-display text-xl font-bold text-neon"><GameIcon name="hp" /> ของไม่พอ ทำยังไง</h2>
      <div class="space-y-2 text-sm">
        <div class="rounded-xl bg-panel2 p-3">
          <b><GameIcon name="shot" /> ต้องเสีย {{ theme.mana.name }} แต่มีไม่พอ</b>
          <div class="mt-1 text-xs text-dim">เช่น โดน Memory Leak (-3) แต่มี 1 → ขาด 2</div>
          <div class="mt-2 grid grid-cols-2 gap-2 text-center text-xs">
            <div class="rounded-lg border border-amber/50 bg-amber/10 p-2">ซดเติมทันที <GameIcon name="shot" /><br />(เลือกเอง)</div>
            <div class="rounded-lg border border-danger/50 bg-danger/10 p-2">หรือเสีย {{ theme.hp.name }}<br />เท่าที่ขาด (-2)</div>
          </div>
        </div>
        <div class="rounded-xl bg-panel2 p-3">
          <b><GameIcon name="trash" /> ต้องทิ้งการ์ดแต่การ์ดไม่พอ</b>
          <div class="mt-1 text-xs text-dim">เช่น ต้องทิ้ง 2 ใบแต่มีใบเดียว → ใบที่ขาดเสีย {{ theme.mana.name }} ใบละ 1</div>
        </div>
      </div>
    </section>

    <!-- 9. out -->
    <section id="howto-out" class="panel space-y-3 p-4">
      <h2 class="font-display text-xl font-bold text-neon"><GameIcon name="skull" /> ตกรอบเมื่อไหร่</h2>
      <ul class="space-y-2 text-sm">
        <li class="flex gap-3 rounded-xl bg-panel2 p-3"><span class="text-2xl"><GameIcon name="attack" /></span><span><b>{{ theme.hp.name }} เหลือ 0 หรือติดลบ</b> ตกรอบทันที ไม่ต้องรอจบเทิร์น</span></li>
        <li class="flex gap-3 rounded-xl bg-panel2 p-3"><span class="text-2xl"><GameIcon name="skull" /></span><span><b>ซดจนไปต่อไม่ไหว</b> กดปุ่ม ⋯ เมนู → "ไปต่อไม่ไหวแล้ว" ({{ theme.overflow }})</span></li>
      </ul>

      <h3 class="pt-1 font-display font-bold text-amber"><GameIcon name="sparkles" /> เคล็ดลับ</h3>
      <ul class="space-y-1 text-sm">
        <li>• เก็บการ์ดป้องกันไว้ 1–2 ใบ และเก็บ {{ theme.mana.name }} ไว้จ่ายมันด้วย</li>
        <li>• แอบดู {{ theme.mana.name }} ของคู่แข่ง: คนที่ไม่มีเลยอ่อนแอที่สุด</li>
        <li>• Artifact อย่าง Keyboard (ซดได้ +4) ช่วยให้ซดน้อยลงแต่ได้เท่าเดิม</li>
        <li>• ซดเมื่อจำเป็นเท่านั้น คุมสติ คุมปริมาณ</li>
      </ul>
    </section>
    <p class="px-2 text-center text-[10px] text-dim/70">{{ ICON_CREDIT }}</p>
  </div>
</template>
