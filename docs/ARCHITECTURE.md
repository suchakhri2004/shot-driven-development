# Architecture

เอกสารนี้สำหรับทีมที่จะมา implement ต่อ อ่านจบใน ~10 นาที

## 1. ภาพรวม

```
 Browser (Nuxt SPA) Node server Engine (pure TS)
 ─────────────────── ─────────── ────────────────
 หน้าจอ + animation ── game_action ──▶ validate (zod) dispatch(state, player, action)
 เก็บแค่ snapshot ◀── game_state ─── GameSession ───── dispatch() ─────▶ → state ใหม่ + fx
 ที่ server ส่งมา timers / actionId dedupe projectFor(state, player)
```

**กฎเหล็ก 3 ข้อ**

1. **Server เป็นผู้ตัดสินทุกอย่าง** client ส่งแค่ "ความตั้งใจ" (`play_card`, `drink`, …) ค่า HP/Mana คำนวณที่ server ทั้งหมด
2. **Engine เป็น TypeScript ล้วน** ไม่รู้จัก socket, timer, หรือ UI จึง test ได้โดยไม่เปิด server/browser (`packages/engine/test`)
3. **ซ่อนข้อมูลที่ server** ผู้เล่นแต่ละคนได้ `projectFor()` ของตัวเอง: มือคนอื่นเหลือแค่จำนวนใบ, ลำดับกองจั่วไม่ถูกส่งออกไปเลย

## 2. อยากแก้อะไร ไปดูไฟล์ไหน

| อยากทำ | ไฟล์ |
|---|---|
| เปลี่ยน/เพิ่มการ์ด | `packages/cards/src/deck.ts` (ชุดเล่นจริง) · `test-deck.ts` ใช้เฉพาะ test |
| เพิ่ม effect ชนิดใหม่ | `engine/src/types.ts` (Effect) → `queue.ts` (expandEffect) → `effects.ts` (handler) |
| แก้กติกาการเล่นการ์ด/ค่าใช้จ่าย | `engine/src/actions/play-card.ts`, `validation.ts` |
| แก้ response window / chain | `engine/src/chain.ts` |
| แก้การจั่ว / Event / ลำดับเทิร์น | `engine/src/deck.ts`, `turn.ts`, `advance.ts` |
| แก้ Mana ไม่พอ (shortfall) | `engine/src/shortfall.ts` |
| แก้การตกรอบ / ชนะ | `engine/src/elimination.ts` |
| เพิ่ม modifier (เช่น ลดค่าใช้จ่าย) | `engine/src/stats.ts` + `types.ts` (Stat) |
| เพิ่ม action ที่ผู้เล่นทำได้ | `engine/src/actions/*` + `dispatch.ts` + `protocol/src/index.ts` (actionSchema) |
| เปลี่ยนหน้าห้อง / lobby | `server/src/rooms/room.ts` |
| เปลี่ยน timer ฝั่ง server | `server/src/game/game-session.ts` |
| เพิ่ม socket event | `protocol/src/index.ts` → `server/src/socket/handlers.ts` → `web/app/composables/useRoom.ts` |
| เปลี่ยนชื่อ/ไอคอน/ข้อความไทย | `web/app/theme/theme.ts`, `theme/format-log.ts` |
| เปลี่ยนหน้าตาการ์ด | `web/app/components/GameCard.vue` + `assets/css/game.css` (`.card`, `.card-art[data-art=…]`) |
| เปลี่ยน/เพิ่มไอคอน | รายการใน `scripts/build-icons.mjs` แล้วรัน `node scripts/build-icons.mjs` (สร้าง `theme/icon-data.ts`) · การจับคู่การ์ด→ไอคอน = ชื่อไอคอนตรงกับ id การ์ด · ใช้ผ่าน `<GameIcon name="…">` |
| เปลี่ยนหน้าตา HUD (วงแหวน HP, ขวดช็อต, โต๊ะ, มือการ์ด, ปุ่ม) | `HpRing.vue`, `ShotVial.vue`, `PlayerSeat.vue`, `MyPanel.vue`, `TableCenter.vue`, `HandRail.vue`, `ActionBar.vue` |
| เปลี่ยน animation / เสียง / ประกาย | `composables/useFx.ts` (cue → เอฟเฟกต์), `useParticles.ts` (ประกายด้วย anime.js), `useSound.ts`, `components/FxLayer.vue` |

## 3. Engine (`packages/engine/src`)

```
types.ts ทุก type: CardDef, Effect, GameState, Action, PublicState …
dispatch.ts ประตูเดียวที่เปลี่ยนเกม: dispatch(state, playerId, action) → {ok,state,fx} | {ok:false,error}
setup.ts createGame()
advance.ts game loop (ดูข้อ 3.1)
actions/ handler ต่อ action: drink, play-card, hand-actions (ทิ้ง/Rebase), decisions (pass/ทิ้ง/timeout/KO), turn-actions
validation.ts ตรวจหน้าต่างเวลา (turn/response), เป้าหมาย, การ์ดที่ทิ้งเป็นค่าใช้จ่าย
chain.ts response window + chain (LIFO)
queue.ts แตก effect เป็น step ต่อเป้าหมาย
effects.ts handler ของแต่ละ effect
shortfall.ts กติกา Mana ไม่พอ / ทิ้งการ์ดไม่พอ
deck.ts จั่ว, สับกองทิ้งกลับ, เปิด Event
turn.ts จั่วถึง hand limit, จบเทิร์น, ข้ามเทิร์น, status/event หมดอายุ
stats.ts getStat(): ค่า handLimit/potionYield/damage หลังรวม modifier
resources.ts bank ของ Mana (ซด/จ่าย)
elimination.ts ตกรอบ + จบเกม
projection.ts projectFor(): มุมมองของผู้เล่นคนหนึ่ง
playability.ts บอก UI ว่าการ์ดใบนี้เล่นได้ไหม/เพราะอะไรไม่ได้
```

### 3.1 Game loop (`advance.ts`) ← เข้าใจไฟล์นี้ก่อน

State ทั้งหมดเป็น JSON ล้วน และสิ่งที่ "ค้างอยู่" เก็บใน 2 ที่: `queue` (effect ที่รอรัน) กับ `pending` (การตัดสินใจที่รอคน: response / shortfall / เลือกทิ้งการ์ด)

```
loop:
  ตรวจตกรอบ/ชนะ
  มี pending? → หยุด (รอ action จากผู้เล่น หรือ timeout จาก server)
  queue ไม่ว่าง → รัน step ถัดไป
  ไม่งั้น → ทำตาม phase: draw → action → resolve(chain) → turn_end
```

เพราะแบบนี้ Event ที่เจอกลางการจั่ว, shortfall กลาง effect, หรือหน้าต่างตอบโต้ กลาง chain **หยุดแล้วกลับมาทำต่อได้** โดยไม่ต้องมี callback/async ใด ๆ — เมื่อมี action เข้ามา `dispatch` จะเรียก `advance` อีกรอบ

### 3.2 Effect หนึ่งตัวทำงานอย่างไร

`play_card` → การ์ดเข้า `chain` → เปิด response window (ถ้ามีคนตอบโต้ได้) → ทุกคน pass/หมดเวลา → pop ใบบนสุด → `queueEffects` แตกเป็น step ต่อเป้าหมาย (เรียงตามที่นั่ง) → `runStep` ทีละ step

### 3.3 Modifier

Artifact / Status / Event ที่ค้างบนโต๊ะไม่ได้แก้ค่าตรง ๆ แต่ประกาศ `modifiers` แล้ว `getStat()` รวมให้ทุกครั้งที่ถาม (`handLimit`, `potionYield`, `damageTaken`, `damageDealt`)

### 3.4 Determinism

- RNG เป็น seeded (`rng.ts`) เก็บใน state → เกมเดียวกัน + seed เดียวกัน + action ชุดเดียวกัน = ผลเหมือนเดิม
- `dispatch` ไม่แก้ state เดิม (clone ก่อน) และถ้า reject จะไม่เปลี่ยนอะไรเลย
- ลำดับ resolve: chain ใบล่าสุดก่อน (LIFO); หลายเป้าหมายเรียงตามที่นั่งเริ่มจากผู้เล่นที่เล่นการ์ด

## 4. Server (`apps/server/src`)

```
index.ts / app.ts เปิด HTTP + Socket.IO (/health) และเสิร์ฟเว็บที่ build แล้ว
static-files.ts เสิร์ฟไฟล์ static + SPA fallback + กัน path traversal (ทำให้ทั้งเกมเป็น 1 process 1 พอร์ต)
socket/handlers.ts ทุก event: rate limit → zod validate → เรียก Room → ack
rooms/room-manager.ts สร้าง/หา/ลบห้อง, เก็บกวาดห้องร้าง
rooms/room.ts สมาชิก, lobby, ready/kick/reorder/config, เริ่มเกม, ส่ง lobby view
game/game-session.ts เกมที่กำลังเล่น: state จริง, timers, ส่ง snapshot รายคน, กัน action ซ้ำ
```

- **Identity:** `playerId` (uuid) + `sessionToken` (128-bit) ที่ client เก็บใน localStorage; ทุก socket ใหม่ต้อง `reconnect_room` ด้วย token
- **Reconnect:** หลุดแล้วที่นั่งยังอยู่; กลับมาได้ state เดิม + มือเดิม; ถ้าถึงตาคนที่หลุดนานเกิน `DISCONNECT_GRACE_SEC` server จบเทิร์นให้ (ช็อตเปิดเกมก็ซดให้)
- **ไม่มี race condition:** handler ทุกตัว synchronous ต่อหนึ่ง action; คนกดพร้อมกัน = ถูกประมวลผลทีละคน
- **Idempotency:** `actionId` ซ้ำ (กดรัว / ส่งซ้ำตอน reconnect) ได้ผลลัพธ์เดิม ไม่ทำซ้ำ
- **Timers (ฝั่ง server เท่านั้น):** หมดเวลาตอบโต้ = ทุกคน pass; หมดเวลา shortfall = เสีย HP; หมดเวลาเลือกทิ้ง = สุ่มทิ้ง
- **ผู้เล่นออกกลางเกม** นับเป็น `declare_ko`
- **ส่งเหตุการณ์:** แต่ละ action ส่ง `game_state` (มี `fx` = cue สำหรับ animation) ให้ทุกคน คนละ projection

### Protocol (`packages/protocol`)

เลือกใช้ event เดียว `game_action { actionId, action }` (action เป็น discriminated union) แทนการแยก event ต่อ action เพราะ validate และ rate limit จุดเดียว และเพิ่ม action ใหม่ไม่ต้องแตะ socket layer `timeout` ไม่อยู่ใน schema → client ส่งเองไม่ได้

## 5. Web (`apps/web/app`)

```
pages/index.vue หน้าแรก (สร้าง/เข้าห้อง)
pages/room/[code].vue สลับ Lobby ↔ Game ตาม phase (+ ฟอร์มเข้าห้องถ้าเปิดลิงก์ตรง)
pages/rules.vue กติกา
composables/useRoom.ts socket เดียว + state กลางของห้อง/เกม + คำสั่งทั้งหมด (จุดรวมของ client)
composables/useFx.ts แปลง fx cue → ตัวเลขลอย/แบนเนอร์/เสียง/สั่น
components/ หน้าจอ: LobbyScreen, GameScreen (ประกอบ OpponentRail, TableCenter, MyPanel, HandRail, ActionBar),
                         modal: CardInspector, ResponseModal, DecisionModals, OpeningShot, GameOver
theme/ ชื่อ/ไอคอน/ข้อความทั้งหมด (เปลี่ยน theme ที่นี่)
```

- client **ไม่ import engine** (เฉพาะ type) → bundle เล็ก
- UI ถามสิทธิ์เล่นการ์ดจาก `hand[].playable/reason` ที่ server คำนวณมาให้ ไม่คิดกติกาซ้ำ
- `shallowRef` สำหรับ payload ใหญ่ (ไม่ต้อง proxy ลึก), animation ใช้เฉพาะ `transform/opacity`, ไม่ใช้ `backdrop-filter`, เสียงสังเคราะห์ด้วย WebAudio (ไม่มีไฟล์เสียงให้โหลด)
- ปุ่มกันกดรัว: `useLock` (และ server กันซ้ำด้วย actionId อีกชั้น)

## 6. สิ่งที่ตัดสินใจเอง (ต้องยืนยันกับกติกา/การ์ดจริง)

คู่มือที่ได้รับไม่ได้ระบุเรื่องเหล่านี้ จึงทำเป็น config หรือเลือกค่าที่เป็นไปได้ที่สุด **ถ้าการ์ดจริงขัดกับข้อใด แก้จุดเดียวตามตาราง**

| เรื่อง | ที่ทำไว้ | แก้ที่ |
|---|---|---|
| KO จากการซด ("ไปต่อไม่ไหว") | ผู้เล่นประกาศเอง; option จำกัดจำนวนช็อต | `config.koMode`, `actions/decisions.ts` |
| จำนวนคริสตัล Mana ในกล่อง | ไม่จำกัด (`manaBankSize: null`) | `config.manaBankSize` |
| HP เกิน 10 | ฟื้นเกิน 10 ไม่ได้ | `config.maxHp` |
| กองจั่วหมด | สับกองทิ้งกลับมา | `deck.ts` |
| ใครตอบโต้ได้ | เฉพาะคนที่เป็นเป้าหมาย (หรือเจ้าของ item ที่ถูกสกัด) | `config.responderScope`, `chain.ts` |
| การ์ดป้องกันกับสเปลล์หลายเป้าหมาย | ป้องกันเฉพาะคนที่เล่นการ์ดป้องกัน | `effects.ts` (counterSpell), `chain.ts` (isFizzled) |
| การ์ดป้องกันถูกสกัดซ้ำ (Force Push) | การ์ดป้องกันที่ถูกสกัดไม่มีผล | `chain.ts` |
| การ์ดป้องกันเล่นในเทิร์นตัวเอง | ห้าม (ไม่มีอะไรให้สกัด) | `validation.ts` |
| ผู้ตอบโต้ที่ไม่มีการ์ดตอบโต้ในมือ | ข้ามอัตโนมัติ (ไม่เปิดหน้าต่าง) — ผลข้างเคียง: คนอื่นพอเดาได้ว่าเขาไม่มีการ์ดป้องกัน | `chain.ts` (eligibleResponders) |
| ตกรอบพร้อมกันทุกคน | ไม่มีผู้ชนะ (`winnerId: null`) | `elimination.ts` |
| Event ที่ค้างบนโต๊ะ | นับอายุเป็น "จำนวนเทิร์นรวม" | `turn.ts` |
| ช็อตเปิดเกม `git init` | บ้านเรา (house rule) เปิดไว้, ปิดได้ | `config.openingShot` |
| ผู้เล่นเริ่มก่อน | อายุมากสุดถ้าทุกคนใส่ปีเกิด ไม่งั้นสุ่ม | `rooms/room.ts` (pickFirstPlayer) |
| Anti-Joker | **ไม่ได้ทำ** ไม่ทราบข้อความการ์ดจริง | — |

## 7. ข้อจำกัดที่รู้อยู่

- **ชุดการ์ดออกแบบขึ้นเอง 90 ใบ** (`deck.ts`) ไม่ใช่การ์ดจริงของเกมต้นฉบับ ตัวเลข/ข้อความ/จำนวนใบจึงต่างจากกล่องจริง; balance ผ่านการจำลองเกมสุ่มเท่านั้น ยังไม่ผ่านการ playtest จริง ถ้าเล่นแล้วรู้สึกแรง/อ่อนเกินให้ปรับตัวเลขในไฟล์เดียว
- **ห้องอยู่ใน memory** restart server = เกมหาย; scale หลาย instance ไม่ได้
  ทางต่อยอด: ทำ `RoomStore` interface ครอบ `RoomManager` แล้ว snapshot `GameState` (เป็น JSON ล้วน serialize ได้ตรง ๆ) ลง Redis + ใช้ `@socket.io/redis-adapter` + sticky session; Postgres เก็บประวัติแมตช์จาก `GameState.log` / `eliminationOrder`
- ทดสอบ UI ด้วย Chrome (mobile emulation) เท่านั้น ยังไม่ได้ลองบน iOS Safari / Android จริง
- ไม่มีบอท / ไม่มีโหมดดูเกม (spectator)
- ภาพการ์ดวาดด้วย CSS ล้วน (`.card-art[data-art=…]` ใน `game.css`) (ลายตามธาตุ/ประเภท + emoji เป็นสัญลักษณ์) ตั้งใจไม่ใช้ไฟล์รูป: emoji หน้าตาต่างกันตามระบบปฏิบัติการ ถ้าอยากให้เหมือนกันทุกเครื่องค่อยเปลี่ยนเป็น SVG inline
- เสียงทั้งหมดสังเคราะห์สดด้วย WebAudio (`useSound.ts`) รวมเพลง lo-fi พื้นหลังซึ่งปิดไว้เป็นค่าเริ่มต้น (เปิดในเมนูเกม) ยังไม่ได้ฟังบนมือถือจริง
