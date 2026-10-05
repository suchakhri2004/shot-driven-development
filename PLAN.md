# SHOT-DRIVEN DEVELOPMENT (SDD) — Implementation Plan

> *"ซดก่อน ค่อย Debug" · คืนวันศุกร์ที่ออฟฟิศ ทุกคน deploy ใส่กันจนเหลือ Dev คนสุดท้ายที่ยังไม่ล่ม*
>
> เกมการ์ด multiplayer ออนไลน์บนเว็บ ใช้กลไกเดียวกับ **Not Enough Mana (มานาหมด ซดเลย!)** แต่เปลี่ยน theme เป็นชีวิตคนทำงานบริษัทซอฟต์แวร์
> **ยังเป็น drinking game เหมือนต้นฉบับ (18+):** ซด 1 ครั้ง = ดื่มจริง 1 ครั้ง
> เป้าหมาย: เล่นได้จริงตั้งแต่ต้นจนจบ 3–6 คน คนละเครื่อง ผ่าน internet

---

## สถานะการ implement (อัปเดตล่าสุด: Phase 1–5 เสร็จ)

| Phase | สถานะ | หมายเหตุ |
|---|---|---|
| 1 Scaffold | | monorepo, Nuxt, server, Docker, `.env.example` |
| 2–3 Engine + Effect/Chain | | กติกา R1–R19 + H1 ครบ ดู [docs/RULES-MAPPING.md](docs/RULES-MAPPING.md) |
| 4 Server | | room, socket, validation, timers, reconnect, rate limit (ยังไม่มี Redis/Postgres) |
| 5 Frontend | | lobby+QR, หน้าเกม, response/shortfall/discard, Game Over, เสียง/animation พื้นฐาน |
| 6 การ์ด | ชุดออกแบบเอง 90 ใบ | `packages/cards/src/deck.ts` (ผู้ใช้ไม่มีการ์ดจริงให้ จึงออกแบบเองตามโครงสร้างเกมต้นฉบับ; ถ้าได้การ์ดจริงภายหลังให้แทนไฟล์นี้) |
| 7 Polish | บางส่วน | animation/เสียง/theme ทำแล้วในระดับพื้นฐาน; ภาพบนการ์ดเป็น CSS ล้วน (ตัดสินใจแล้ว: ไม่มีไฟล์รูป); ทดสอบ iOS/Android จริงยังไม่ได้ทำ |
| 8–9 E2E / Deploy | ฟรี | ขับ Chrome เล่นจริงผ่านแล้ว; เล่นออนไลน์ด้วย `npm run share` (Cloudflare quick tunnel ฟรี) ไม่ต้องเช่า server; Docker image เดียว; ยังไม่ได้ทดสอบ tunnel จริงเพราะเครื่องยังไม่ติดตั้ง cloudflared |

**ที่เบี่ยงจากแผนเดิม (เพื่อความง่าย):**
- **ข้อกำหนดของผู้ใช้: ห้ามมีค่าใช้จ่ายใดๆ และไม่มีไฟล์รูป/เสียง** → ภาพ CSS ล้วน, เสียงสังเคราะห์, server เสิร์ฟเว็บเอง (พอร์ตเดียว) เล่นออนไลน์ผ่าน tunnel ฟรี
- ใช้ **npm workspaces** แทน pnpm (เครื่องไม่มี pnpm)
- ข้อมูลการ์ดเป็น **TypeScript** (`packages/cards/src/test-deck.ts`) แทน JSON เพื่อให้ type ช่วยตรวจ
- ไฟล์ชื่อ/ไอคอน theme เป็น `apps/web/app/theme/theme.ts` แทน `theme.json`
- เว็บใช้พอร์ต **3100** (3000 ชนกับโปรเจกต์อื่นในเครื่อง)
- socket event ฝั่งเกมรวมเป็น `game_action` เดียว (ดูเหตุผลใน [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md))
- เว็บใช้ CSS animation + WebAudio แทน GSAP/Howler (เบากว่า ไม่ต้องโหลดไฟล์เสียง)

---

## 0. หลักการของแผนนี้

1. **กติกาเหมือน Not Enough Mana เป๊ะ เปลี่ยนแค่ theme:** HP, Mana, Potion, ค่าแลกการ์ด, Event, Defensive นอกเทิร์น, KO, ตัวเลขบนการ์ด และจำนวนการ์ดในกอง ต้องตรงกับเกมจริงทุกอย่าง ที่เปลี่ยนมีแค่ชื่อ ภาพ เสียง และบรรยากาศ
   - house rule ที่ไม่มีในคู่มือ (เช่น H1) แยกเป็น config ทั้งหมด จะได้ปิดแล้วกลับไปเป็นกติกาต้นฉบับ 100% ได้ทันที
   - ส่วนที่ต้องเพิ่มเพราะเล่นออนไลน์ (เช่น countdown ตอน response) ทำแค่แทนสิ่งที่คนบนโต๊ะจริงทำกันเอง ไม่ได้เปลี่ยนกติกา
2. **ไม่แต่งกติกาหรือการ์ดขึ้นเอง:** จุดไหนคู่มือไม่ได้ระบุ ให้ทำเป็นค่า config และติดป้าย ` NEEDS CONFIRMATION` ไว้ใน PLAN นี้กับในโค้ด
3. **Server-authoritative:** client มีหน้าที่แค่ส่ง "ความตั้งใจ" (intent) ไป server ส่วนการคำนวณทุกอย่างทำที่ server
4. **Engine แยกจาก UI และ network:** engine เป็น pure TypeScript จึงเขียน unit test ได้ 100% โดยไม่ต้องเปิด browser
5. **ทำทีละ phase:** ทุก phase มีเกณฑ์ "Done when" ที่ตรวจสอบได้ เมื่อจบ phase จะรายงานว่าอะไรใช้ได้แล้ว และอะไรยังเหลือ

---

## 1. Theme Mapping: Wizard → Dev

ชื่อทุกอย่างเป็นแค่หน้าตาและอยู่ใน `theme.json` ส่วนกลไกตรงกับเกมจริงทุกข้อ

| เกมจริง | SDD | ไอคอน |
|---|---|---|
| Wizard (พ่อมด) | **Dev** (avatar ตามตำแหน่ง: Frontend, Backend, DevOps, QA, PM, Designer มีแค่หน้าตา ไม่มีผลกับกติกา) | |
| HP 10 / Health Crystal | **Uptime** ถ้าเหลือ 0 → **503 CRASHED**| |
| Mana / Mana Crystal | **Shot Stack** (แก้วช็อตซ้อนกันบนจอ ยิ่งซดยิ่งสูง) | |
| Mana Potion (ซด 1 ช็อต = +3) | ปุ่ม **`$ sudo shot`** ดื่มจริง 1 ช็อต = +3 | |
| Too Much Mana (KO) | **STACK OVERFLOW** (ซดจนล้น ไปต่อไม่ไหว) | |
| ช็อตเปิดเกม (H1) | **`git init` ** ทุกคนชนแก้วช็อตแรก | |
| Hand Limit | **WIP Limit**| |
| แลกการ์ด (1→2→3) | **Rebase** (ยิ่ง rebase หลายรอบยิ่งแพง) | |
| Draw pile / Discard pile | **Backlog**/ **`/dev/null`**| |
| Fire spell | **Hotfix** (แดง) | |
| Ice spell | **Code Freeze** (ฟ้า) | |
| Electric spell | **Deploy** (เหลือง) | |
| Defensive Spell | **`try/catch`, Rollback, Firewall** (ตอนโดนโจมตีกด "CATCH!") | |
| Supporting Spell | **Copilot, Pair Programming, Rubber Duck**| |
| Curse | **Technical Debt, Memory Leak, Scope Creep, ประชุม 3 ชม.**| |
| Artifact | **Dev Setup:** Mechanical Keyboard, จอ Ultrawide, เก้าอี้ Gaming | |
| Event | **INCIDENT:** Prod Down, ลูกค้าเปลี่ยน Requirement, Deploy วันศุกร์ | |
| Incantation | **Commit Message** ที่ต้องตะโกนออกเสียง เช่น `"fix: แก้ทุกอย่าง ไม่ต้อง review"` | |
| ผู้ชนะ | **LAST DEV STANDING**| |

**ตัวอย่างการ re-skin:** Fireball (Cost 1 + ทิ้ง Fire 1 ใบ, ทำ 2 damage) → **"Merge Conflict"** (Cost 1 + ทิ้งการ์ด Hotfix 1 ใบ, ทำ 2 Uptime damage) ตัวเลขเท่าเดิม เปลี่ยนแค่ชื่อและภาพ

> **Naming ในโค้ด:**
> - engine ใช้คำตามต้นฉบับ (`mana`, `hp`, `potion`) ส่วนชื่อ theme อยู่ใน `theme.json` ทั้งหมด
> - ลำดับการ์ดที่รอ resolve ใน engine ใช้ชื่อ `chain` ไม่ใช้ `stack` จะได้ไม่สับสนกับ Shot Stack

---

## 1.5 Visual & Feel: สวย ลื่น เล่นแล้วรู้สึกเหมือน Not Enough Mana

**ความรู้สึกที่ต้องได้:** โต๊ะการ์ดที่มีชีวิต การ์ดลอยออกจากมือ ร่ายใส่กันแล้วมีแสง มีเสียง ตัวเลขเด้ง และทุกเครื่องเห็นพร้อมกัน

### Art direction: "Neon Terminal Bar"
- พื้นดำแบบ terminal ผสมกับบาร์ยามดึก
  - สี: neon green `#39FF14` สำหรับ UI, **อำพันวิสกี้** `#FFB000` สำหรับ Shot Stack, ม่วง `#A855F7` สำหรับ spell, แดง/ฟ้า/เหลืองตาม element
- **การ์ด:**
  - กรอบเป็นหน้าต่าง code editor (มีจุดสามสี และชื่อไฟล์ `merge-conflict.ts`)
  - ภาพบนการ์ดวาดด้วย CSS ล้วน (gradient + ลายตามธาตุ/ประเภท) ไม่มีไฟล์รูปในโปรเจกต์
  - ข้อความ effect เขียนแบบ syntax highlight
  - การ์ดหายากมีขอบ holographic ที่เอียงตาม gyroscope ของมือถือ
- **font:** `Chakra Petch` สำหรับหัวข้อ (ดูเท่ และรองรับไทย), `JetBrains Mono` สำหรับตัวเลขและโค้ด, `IBM Plex Sans Thai` สำหรับเนื้อหา
- ไม่ใช้ชื่อหรือแบรนด์บริษัทใด ๆ ในเกม

### Signature animations (สิ่งที่ทำให้เกม "เท่")
| ช่วงเวลา | Animation |
|---|---|
| `sudo shot` | แก้วช็อตใบใหม่หล่นลงมาซ้อนบน stack, เหล้าสีอำพันเติมเต็มแก้ว, ตัวเลข +3 เด้งขึ้น, มือถือสั่นเบา ๆ |
| `git init` | แก้วของทุกคนพุ่งเข้ากลางจอแล้วชนกันพร้อมเสียง "กริ๊ง" |
| เล่นการ์ด | การ์ดลอยจากมือไปกลางโต๊ะแล้วขยายใหญ่, commit message พิมพ์ขึ้นทีละตัว, แล้วพุ่ง particle ตาม element ไปหาเป้าหมาย |
| โดนโจมตี | avatar สั่น จอขอบแดงวาบ ตัวเลข −2 เด้ง และแถบ Uptime ลดลงแบบมี delay ช่วงสั้น ๆ (แบบเกม fighting) |
| CATCH! (Defensive) | มีโล่ `{ }` กางรับ particle แล้วสะท้อนกลับ |
| INCIDENT | ไฟไซเรนแดงกวาดทั้งจอทุกเครื่อง แล้วการ์ดค่อย ๆ พลิกเปิด |
| 503 CRASHED | avatar glitch แล้วกลายเป็นจอฟ้า (Blue Screen) |
| STACK OVERFLOW | แก้วที่ซ้อนกันโยกไปมาแล้วล้มกระจาย |
| ชนะ | terminal พิมพ์ `LAST DEV STANDING` พร้อม confetti ที่เป็นแก้วช็อต |

### หลักทำให้ลื่น (smooth)
- **60fps บนมือถือ Android ระดับกลาง:** animate แค่ `transform` และ `opacity` ซึ่งใช้ GPU ส่วน particle วาดบน `<canvas>` ชั้นเดียว ไม่ใช้ DOM element หลายร้อยตัว
- **GSAP** ทำ timeline กับการ์ดลอย (FLIP technique) และใช้ Vue `<TransitionGroup>` กับมือการ์ด
- **คิว animation (`fx` queue):** server ส่ง `fx` cue มาตามลำดับ client เล่นทีละ cue ทุกเครื่องจึงเห็นลำดับเหตุการณ์เหมือนกัน ถ้า cue ค้างเกิน 3 ตัวให้เร่งความเร็วเพื่อตาม state ให้ทัน
- **ตอบสนองทันที:** กดปุ่มแล้วมี press state ภายใน 1 frame ระหว่างรอ server ยืนยัน แต่ตัวเลข HP/Mana เปลี่ยนเมื่อ server ยืนยันแล้วเท่านั้น
- **โหลดล่วงหน้า:** ไม่มีไฟล์รูป/เสียงให้โหลดเลย (CSS + WebAudio สังเคราะห์) จึงเปิดเร็ว
- **Haptics:** ใช้ `navigator.vibrate` บน Android ส่วน iOS ยังไม่รองรับ จึงให้ใช้ภาพและเสียงแทน
- รองรับ `prefers-reduced-motion` (ลด animation ให้เหลือแค่ fade)

---

## 2. กติกาที่ Implement (สรุปจากคู่มือที่ได้รับ)

| # | กติกา | ที่มา |
|---|---|---|
| R1 | ทุกคนเริ่มด้วย HP 10 (= Max HP เริ่มต้น), Mana 0, การ์ด 5 ใบ | คู่มือ |
| R2 | ถ้าจั่วได้ Event ตอนแจกมือเริ่มต้น → ทิ้ง Event ใบนั้นแล้วจั่วใบใหม่ (Event ไม่อยู่ในมือเริ่มต้น) | คู่มือ |
| R3 | คนที่อายุมากที่สุดเริ่มก่อน แล้ววนตามเข็มนาฬิกา | คู่มือ |
| R4 | ซด 1 ช็อต = +3 Mana (3 เม็ด) ซดได้ **ทุกเวลา** รวมถึงนอกเทิร์นและตอนกำลังโดนโจมตี | คู่มือ |
| H1 | **Opening Shot:** ก่อนเริ่มเกม ทุกคนต้องซดคนละ 1 ช็อต ได้ +3 Mana ตาม R4 แต่ละคนจึงเริ่มเกมด้วย Mana 3 | house rule ของโต๊ะเรา (config `openingShot`, default เปิด) |
| R5 | Mana ไม่มี cap | คู่มือ |
| R6 | ถ้า Mana ในกองกลาง (bank) หมด การซดจะไม่ได้ Mana | คู่มือ |
| R7 | ต้นเทิร์นจั่วจนมือเต็ม Hand Limit (ปกติ 5 แต่ Artifact/Event ปรับได้) | คู่มือ |
| R8 | ถ้าจั่วได้ Event ระหว่างเติมมือ → เปิดให้ทุกคนเห็น วางกลางโต๊ะ resolve effect แล้วจั่วใบใหม่แทน วนจนได้การ์ดปกติ | คู่มือ |
| R9 | Action phase: เล่นการ์ด, ทิ้งการ์ด, แลกการ์ด, ซด ได้หลายครั้งและสลับลำดับได้อิสระ | คู่มือ |
| R10 | ขั้นตอนเล่นการ์ด: วางการ์ด → จ่าย cost → พูด incantation → เลือก target → resolve effect → การ์ดและการ์ดที่ใช้จ่าย cost ลงกองทิ้ง | คู่มือ |
| R11 | Cost อาจมีมากกว่า Mana เช่น "ทิ้ง Fire Spell 1 ใบ" | คู่มือ (ตัวอย่าง Fireball) |
| R12 | Defensive Spell เล่นนอกเทิร์นได้ เพื่อรับมือ Spell ของคู่แข่ง | คู่มือ |
| R13 | แลกการ์ด (ทิ้ง 1 → จ่าย Mana → จั่ว 1): ครั้งที่ n ในเทิร์นเดียวกันมีค่า n Mana และ reset เมื่อขึ้นเทิร์นใหม่ | คู่มือ |
| R14 | ถูกบังคับทิ้งการ์ดแต่การ์ดไม่พอ → เสีย 1 Mana ต่อใบที่ขาด | คู่มือ |
| R15 | Mana ไม่พอจ่าย → ต้องซดเติม**ทันที** ถ้าไม่ซดหรือซดไม่ได้ → เสีย HP เท่ากับจำนวนที่ขาด | คู่มือ |
| R16 | Artifact, Curse บางใบ และ Event บางใบ อยู่บนโต๊ะจนกว่า effect หมดหรือถูกทำลาย | คู่มือ |
| R17 | HP ≤ 0 → ตกรอบ**ทันที** ไม่ต้องรอจบเทิร์น | คู่มือ |
| R18 | Too Much Mana: "ไม่สามารถต่อสู้ต่อได้" → ตกรอบ | คู่มือ |
| R19 | เหลือคนสุดท้ายคือผู้ชนะ | คู่มือ |

### จุดที่คู่มือไม่ได้ระบุ → ทำเป็น config (` NEEDS CONFIRMATION`)

| Config key | ปัญหา | Default ที่เสนอ |
|---|---|---|
| `koMode` | คู่มือบอกแค่ว่า "ไปต่อไม่ไหว" ซึ่งเป็นการตัดสินของคนจริง ไม่มีตัวเลข | **`self-declare`**: มีปุ่ม "ไม่ไหวแล้ว " ให้ผู้เล่นกดยอม KO เอง (ตรงคู่มือที่สุด) และมี option `potionLimit` ให้ host ตั้งเพดานจำนวนครั้งที่ซดได้ (house rule, ปิดไว้เป็น default) |
| `manaBankSize` | ในกล่องมี Mana Crystal กี่อัน | ต้องนับจากกล่องจริง ระหว่างนี้ใช้ `unlimited` |
| `sanityBankSize` | Health Crystal จำกัดหรือไม่ และ heal เกิน 10 ได้ไหม | Max HP = 10, heal เกิน 10 ไม่ได้ |
| `deckReshuffle` | ถ้ากองจั่วหมดทำยังไง | สับกองทิ้งกลับมาเป็นกองจั่ว |
| `responseWindowSec` | ในโต๊ะจริงไม่มีจับเวลา แต่ออนไลน์ต้องมี | 10 วินาที |
| `responderScope` | ใครเล่น Defensive ตอบได้บ้าง: เฉพาะคนที่โดน target หรือทุกคน | เฉพาะคนที่โดน target |
| `chainRule` | Defensive ตอบ Defensive ได้ไหม (chain ซ้อนกัน) | stack แบบ LIFO และให้ตอบซ้อนได้ ถ้าการ์ดใบนั้นระบุว่าใช้กับ Spell ได้ |
| `shortfallTimeoutSec` | เวลาที่ให้เลือกซดเติมก่อนโดนหัก HP | 15 วินาที ถ้าหมดเวลาให้หัก HP |
| `firstPlayerMode` | ต้องรู้อายุผู้เล่น | กรอกปีเกิดใน lobby (ไม่บังคับ) หรือให้ host เลือกคนเริ่ม |
| `incantationPenalty` | ลืมพูด incantation มีบทลงโทษไหม (เป็น house rule ไม่ใช่กติกาหลัก) | ปิดไว้ |
| `drinkMode` | ทุกคนดื่มเหล้า/เบียร์ตามต้นฉบับ แต่บางคนอาจต้องขับรถกลับ | **default = ดื่มจริง** ทุกคนกดปุ่ม แล้วดื่มจริง และแต่ละคนเลือก "สายไม่ดื่มแอลกอฮอล์" ได้เองใน lobby (กติกาเหมือนเดิม แค่เปลี่ยนเครื่องดื่มเป็นน้ำหรือโซดา) |
| Anti-Joker | ไม่รู้ว่าการ์ดนี้ทำอะไร | รอข้อความจากการ์ดจริง |

---

## 3. Blocker ที่ต้องได้ก่อนถึง Phase 6: ข้อมูลการ์ด

**การ์ดคือหัวใจของเกม และข้อมูลการ์ดของเกมจริงไม่มีเผยแพร่ออนไลน์**

| ทางเลือก | ข้อดี | ข้อเสีย |
|---|---|---|
| **A. ถ่ายรูปการ์ดจากกล่องจริงทุกใบ** แล้วผมถอดข้อมูลเป็น JSON และ re-skin ให้ **แนะนำ**| เหมือนเกมจริงที่สุด, balance ผ่านการทดสอบมาแล้ว | ต้องมีกล่องจริง และต้องถ่ายรูปประมาณ 100 ใบ (ประมาณการ) |
| B. ออกแบบการ์ดชุดของเราเองขึ้นใหม่ทั้งหมด โดยใช้กลไกเดิม | เป็นเกมของเราเอง 100% ไม่มีประเด็นลิขสิทธิ์เลย | ต้อง balance เอง และจะไม่ "เหมือนเกมจริง" |
| C. เริ่มด้วย A แล้วค่อยเพิ่มการ์ดชุดของเราเองเป็น expansion | ได้ทั้งความเหมือนและความเป็นของเราเอง | งานเยอะที่สุด |

สิ่งที่ต้องได้จากรูปแต่ละใบ: ชื่อ, ประเภท, element, cost (Mana และ cost อื่น), ข้อความ effect, incantation, **จำนวนใบในกล่อง**
ช่วง Phase 1–5 จะใช้การ์ดชุดทดสอบเล็ก ๆ ไปก่อน (ติดป้าย `TEST FIXTURE` ไว้ จะไม่ปนกับการ์ดจริง)

> **ขอบเขตการใช้งาน:** ทำไว้เล่นกันเองในกลุ่มเพื่อความสนุก ไม่ได้ขาย จึงใช้ทางเลือก A คือเหมือนต้นฉบับทุกใบแล้วเปลี่ยนแค่ theme

---

## 4. Tech Stack

| ส่วน | เลือกใช้ | เหตุผล |
|---|---|---|
| Monorepo | **pnpm workspaces**| ทุก package ใช้ type ชุดเดียวกัน |
| Frontend | **Nuxt (Vue 3 + TS)**, `ssr: false` (SPA) | ทีมถนัด Vue อยู่แล้ว เกมไม่ต้องใช้ SSR |
| Styling | **Tailwind CSS**| |
| Animation | **GSAP** (ทำ timeline และ FLIP), Vue `<TransitionGroup>`, `<canvas>` สำหรับ particle | ลื่น 60fps (หัวข้อ 1.5) |
| Audio | **Howler.js** (audio sprite ไฟล์เดียว) | โหลดเร็ว และรองรับข้อจำกัดเรื่องเสียงของ iOS |
| State (client) | **Pinia**| client เก็บแค่ snapshot ล่าสุดที่ server ส่งมา |
| Backend | **Node.js 22 + TypeScript + Socket.IO** (แยก process จาก Nuxt) | มี room, ack และ auto-reconnect ให้ในตัว |
| Validation | **zod** ใช้ validate payload ทุก event | ไม่เชื่อ input จาก client |
| Engine | `packages/engine`: pure TS ไม่มี dependency กับ IO | test ง่าย, deterministic (seeded RNG) |
| Test | **Vitest** (unit/integration), **Playwright** (e2e หลาย browser context) | |
| Persistence | **v1: in-memory** + snapshot ลง **Redis** (optional) เพื่อให้ server restart แล้วไม่หาย · **Postgres** เก็บประวัติแมตช์ (optional, phase สุดท้าย) | ใช้กันในบริษัท instance เดียวก็พอ |
| Dev env | **Docker Compose** (web, server, redis, postgres) | |
| QR code | `qrcode` (generate ฝั่ง client) | |

 prompt เดิมระบุ Nuxt 3 แต่ปัจจุบัน Nuxt 4 เป็น stable แล้ว ผมแนะนำ **Nuxt 4** เพราะ API แทบเหมือนเดิมและ support นานกว่า ถ้าอยากใช้ Nuxt 3 ก็ได้

---

## 5. Project Structure

```
shot-driven-development/
├─ apps/
│ ├─ web/ # Nuxt SPA
│ │  ├─ pages/ # index (home), room/[code] (lobby+game), rules
│ │  ├─ components/
│ │  │ ├─ lobby/ # PlayerList, RoomCode, QrJoin, HostControls
│ │  │ ├─ table/ # Table, PlayerSeat, ArtifactRow, ActiveEffects
│ │  │ ├─ hand/ # Hand, Card, CardInspect
│ │  │ ├─ action/ # ActionBar, DrinkButton, TargetPicker, ExchangeButton
│ │  │ ├─ response/ # ResponseWindow, ShortfallPrompt, EventReveal
│ │  │ └─ fx/ # damage/heal/caffeine/elimination animations
│ │  ├─ stores/game.ts # Pinia: snapshot + derived getters
│ │  ├─ composables/useSocket.ts
│ └─ server/
│ ├─ src/rooms/ # RoomManager, Room (lobby + seat + session token)
│ ├─ src/socket/ # event handlers → engine.dispatch
│ ├─ src/timers/ # response window / shortfall / turn timers (server-side)
│ ├─ src/persistence/ # in-memory, redis adapter
│ └─ test/ # integration: socket.io-client 3–6 clients
├─ packages/
│ ├─ engine/
│ │  ├─ src/state.ts # GameState, PlayerState, Zone types
│ │  ├─ src/machine.ts # phase transitions
│ │  ├─ src/actions.ts # action reducers + validation
│ │  ├─ src/effects/ # effect primitives + resolver + stack
│ │  ├─ src/projection.ts # projectFor(playerId) → ซ่อนมือคนอื่น
│ │  ├─ src/rng.ts # seeded shuffle
│ │  └─ test/
│ ├─ protocol/ # socket event names + zod schemas + DTO types
│ └─ cards/
│ ├─ cards.schema.json
│ ├─ cards.house.json # การ์ดจริงหลัง re-skin
│ └─ cards.test.json # TEST FIXTURE
├─ docker-compose.yml
├─ .env.example
└─ README.md
```

---

## 6. Domain Model

```ts
type Element = 'hotfix' | 'freeze' | 'deploy' | null // fire / ice / electric
type CardType = 'offensive' | 'defensive' | 'support' | 'curse' | 'artifact' | 'event' | 'anti-joker'

interface CardDef {
  id: string // 'merge-conflict'
  name: string; nameTh?: string
  type: CardType
  element: Element
  cost: { mana: number; discard?: { element?: Element; type?: CardType; count: number }[] }
  target: 'none' | 'self' | 'one-opponent' | 'any-player' | 'all-opponents' | 'all-players' | 'artifact' | 'spell-on-stack'
  playableWhen: ('own-action-phase' | 'in-response-to-spell' | 'anytime')[]
  effects: Effect[] // data-driven primitives
  duration?: { kind: 'instant' | 'permanent' | 'turns' | 'until-trigger'; turns?: number }
  incantation?: string
  copies: number // จำนวนใบในกอง
  image?: string
  source: 'official-reskin' | 'house-original' | 'test-fixture'
  needsConfirmation?: boolean
}
```

**Effect primitives** (เพิ่มได้ภายหลังโดยไม่ต้องแก้ resolver):
`damage`, `heal`, `gainMana`, `loseMana` (ใช้ R15 shortfall), `draw`, `discard` (ใช้ R14), `discardRandom`, `swapHands`, `stealCard`, `modifyHandLimit`, `modifyPotionYield`, `preventDamage`, `counterSpell`, `redirect`, `destroyArtifact`, `attachStatus`, `skipTurn`, `custom:<handlerId>`
→ การ์ดที่ effect ซับซ้อนเกินกว่า primitive จะรองรับ ให้เขียน `custom` handler เป็นราย ๆ ไป

**Modifier system:** Artifact, Curse และ Event ที่ค้างบนโต๊ะจะลงทะเบียน modifier ไว้ (เช่น `handLimit +1`, `potionYield +1`, `onDamageTaken`) แล้ว engine จะถามค่าผ่าน `getEffective(stat, player)` ทุกครั้ง ไม่เขียนค่าทับลงไปตรง ๆ

```ts
interface PlayerState {
  id: string; name: string; avatar: string; seat: number
  hp: number; maxHp: number; mana: number
  hand: CardInstance[] // private
  artifacts: CardInstance[]; statuses: StatusInstance[]
  potionsDrunk: number // ใช้กับ koMode=potionLimit และใช้ทำสถิติ
  alive: boolean; eliminatedBy?: 'sanity' | 'overload'
  connected: boolean
}
interface GameState {
  version: number // +1 ทุก action → client ใช้ตรวจว่า state ตรงกัน
  phase: Phase; activePlayerId: string; turnNumber: number
  exchangeCountThisTurn: number // R13
  drawPile: CardInstance[]; discardPile: CardInstance[]; tableEvents: CardInstance[]
  manaBank: number | null // null = unlimited (R6)
  stack: StackItem[] // spell ที่รอ resolve + response
  pending?: PendingDecision // response window / shortfall / target / discard choice
  log: LogEntry[]; config: GameConfig; seed: string
}
```

---

## 7. State Machine

```
LOBBY ──start──▶ SETUP (แจกมือ R1, R2, เลือกคนเริ่ม R3)
                   │
                   ▼
               OPENING_SHOT (H1: รอจนทุกคนกด ครบ คนละ 1 ครั้ง → +3 Mana)
                   │
                   ▼
          ┌─▶ TURN_START (reset exchangeCount, trigger "start of turn")
          │ ▼
          │ DRAW ──เจอ Event──▶ EVENT_RESOLVE ──▶ กลับ DRAW (R8)
          │ ▼
          │ ACTION ◀────────────────────────────────┐
          │ │ play card │
          │ ▼                                    │
          │ PAY_COST ──ไม่พอ──▶ SHORTFALL (R15) │
          │ ▼                                    │
          │ TARGETING ─▶ STACK_PUSH ─▶ RESPONSE_WINDOW (timer)
          │ │ ทุกคน pass / หมดเวลา
          │ ▼
          │ RESOLVE_STACK (LIFO) ─▶ CHECK_ELIMINATION ─┘
          │ │ finish turn
          │ ▼
          └──── TURN_END (หาคนถัดไปที่ยังไม่ตกรอบ)
                   │ เหลือ 1 คน
                   ▼
               GAME_OVER
```

**Interrupt ที่เกิดได้ทุก phase** (ยกเว้น LOBBY และ GAME_OVER):
- `drink`: R4 ทำได้ทุกเวลา และถ้าอยู่ใน SHORTFALL จะนับเป็นการเติม Mana ที่ขาดทันที
- `declareKO`: R18
- `CHECK_ELIMINATION` ทำงานหลังทุก effect (R17) ถ้าคนที่ตกรอบคือคนที่กำลังเล่นเทิร์น → ข้ามไป TURN_END

**Determinism:**
- ทุก action ถูก serialize ผ่าน queue ของแต่ละห้อง และ engine เป็น synchronous จึงไม่เกิด race condition
- ใช้ seeded RNG ทำให้ replay จาก log ได้
- ทุก action มี `actionId` (uuid) ไว้ตัดคำสั่งซ้ำ เช่นกดเบิ้ลหรือส่งซ้ำตอน reconnect

---

## 8. Socket Protocol

**Client → Server** (ทุก event มี zod schema และส่ง ack `{ ok, error? }` กลับ)

| Event | Payload | ใช้ได้ตอน |
|---|---|---|
| `create_room` | name, avatar | — |
| `join_room` | code, name, avatar | LOBBY |
| `reconnect_room` | code, sessionToken | ทุกเวลา |
| `leave_room` / `kick_player` / `player_ready` / `set_seat_order` / `update_config` | … | LOBBY |
| `start_game` | — | LOBBY, host เท่านั้น, ต้องมี ≥3 คนและทุกคน ready |
| `play_card` | actionId, cardInstanceId, targets?, costCardIds? | ACTION (เจ้าของเทิร์น) หรือ RESPONSE_WINDOW (คนที่มีสิทธิ์ตอบ) |
| `drink_potion` | actionId | ทุกเวลา |
| `discard_card` | actionId, cardInstanceId | ACTION |
| `exchange_card` | actionId, cardInstanceId | ACTION |
| `choose` | actionId, decisionId, choice | ตอบ pending decision เช่นเลือกการ์ดที่จะทิ้ง |
| `pass_response` | actionId | RESPONSE_WINDOW |
| `finish_turn` | actionId | ACTION (เจ้าของเทิร์น) |
| `declare_ko` | actionId | ทุกเวลา |

**Server → Client**
- `state` → ส่ง `projectFor(playerId)` แยกให้แต่ละ socket: มือของคนอื่นเหลือแค่จำนวนใบ และไม่ส่งลำดับกองจั่ว
- `fx` → cue สำหรับ animation เช่น `{ kind: 'damage', target, amount }` ให้ client เล่นตามลำดับ
- `log_entry`, `player_eliminated`, `game_finished`, `error`

**Reconnect:**
- ตอน join server ออก `sessionToken` (random 128-bit) ให้ client เก็บใน `localStorage`
- ถ้าหลุดระหว่างเกม ที่นั่งจะถูก mark `connected=false` ไว้ แต่ไม่ถูกลบ
- ถ้าเป็นเทิร์นของคนที่หลุด → นับเวลา `disconnectGraceSec` (default 60 วินาที) ถ้าหมดเวลาให้ auto `finish_turn`
- ถ้าคนที่หลุดอยู่ใน response window → auto pass

---

## 9. UI Screens (mobile-first, portrait)

1. **Home:** logo "SHOT-DRIVEN DEVELOPMENT " พร้อม tagline "ซดก่อน ค่อย Debug", ป้าย 18+ และปุ่ม Create Room / Join Room / Rules / How to Play
2. **Lobby:**
   - room code พร้อมปุ่ม copy และ QR สำหรับ join (`/room/ABC123`)
   - รายชื่อผู้เล่นพร้อม avatar และสถานะ ready
   - host ลากเรียงที่นั่งได้ เพื่อให้ตรงกับที่นั่งจริงถ้านั่งโต๊ะเดียวกัน
   - host ตั้ง config และ kick ผู้เล่นได้
   - ก่อนเข้าห้อง ผู้เล่นทุกคนต้องติ๊กยืนยันว่าอายุ 18+
   - toggle "สายไม่ดื่มแอลกอฮอล์" ให้แต่ละคนเลือกเอง ระบบติดไอคอนไว้ข้างชื่อ แต่กติกาไม่เปลี่ยน
3. **Game:**
   - ด้านบน: คู่แข่งเรียงเป็นแถวที่ scroll ได้ แสดง avatar, HP, Mana, จำนวนการ์ดในมือ และ artifact ของแต่ละคน โดย active player มี glow
   - ตรงกลาง: Event/Curse ที่ค้างอยู่บนโต๊ะ, stack ที่กำลัง resolve, และ game log (กางออกได้)
   - ด้านล่าง (sticky): HP กับ Mana ตัวใหญ่, มือที่ scroll แนวนอนได้, action bar [`sudo shot` ] [Rebase (n)] [ทิ้ง] [จบเทิร์น]
   - ปุ่ม **`sudo shot`** ต้องอยู่บนจอตลอดเวลา (R4)
4. **Card Inspect:** แสดงรายละเอียดเต็ม, cost, เหตุผลที่เล่นไม่ได้ (เช่น "ขาด 2 — ซดเพิ่ม 1 shot?"), ต่อด้วย target picker, ปุ่ม confirm, และ incantation ตัวใหญ่ให้พูดออกเสียง
5. **Response Window:** modal ทับเต็มจอ แสดงการ์ดที่โดนเล่นใส่, countdown, Defensive card ที่เล่นได้, ปุ่ม Pass และปุ่ม ซด
6. **Shortfall Prompt:** "ขาด 3 — ซดเติม หรือยอมเสีย 3?" พร้อม countdown
7. **Event Reveal:** การ์ด Event เด้งขึ้นจอทุกคนพร้อมกัน
7.5 **Opening Shot:** หน้าจอ "ชนแก้วก่อนเริ่ม! " แสดงรายชื่อทุกคนพร้อมสถานะว่าซดแล้วหรือยัง เมื่อครบทุกคน เกมจะเริ่มเทิร์นแรกอัตโนมัติ
8. **Game Over:** ผู้ชนะ, ลำดับคนตกรอบ (503 CRASHED หรือ STACK OVERFLOW), เวลาที่เล่น, สถิติจำนวนครั้งที่ซดของแต่ละคน ("สายซดประจำโต๊ะ "), ปุ่ม Play Again / Back to Lobby

**Mobile:**
- ปุ่มสูงอย่างน้อย 44px
- ใช้ `touch-action: manipulation` และ debounce ปุ่ม action ฝั่ง client (ฝั่ง server มี actionId กันซ้ำอยู่แล้ว)
- ใช้ `100dvh` และ safe-area inset
- หน้าเว็บต้องไม่ scroll แนวนอน (เฉพาะแถบมือการ์ดที่ scroll ได้)
- ใช้ Wake Lock API กันจอดับระหว่างเกม (ถ้า browser รองรับ)

**Audio/FX:** ดูรายละเอียดในหัวข้อ 1.5 · เสียงที่ต้องมี: แก้วกระทบ, เหล้าริน, คีย์บอร์ดตอนพิมพ์ commit message, ไซเรน incident, error beep · มีปุ่ม mute และเพลงพื้นหลัง lo-fi แบบ optional

---

## 10. Phases

### Phase 0: ยืนยันการตัดสินใจ (ก่อนเริ่มเขียนโค้ด)
- ตอบคำถามในหัวข้อ 12
- **Done when:** ได้คำตอบครบ และ PLAN ถูกอัปเดตตามนั้น

### Phase 1: Scaffold
- pnpm monorepo, Nuxt app, server, packages (engine, protocol, cards), Tailwind, Vitest, ESLint, Docker Compose, `.env.example`
- **Done when:** `docker compose up` แล้วเปิดเว็บเจอหน้า Home, server ตอบ health check ได้, `pnpm test` ผ่าน

### Phase 2: Engine core (ยังไม่มีการ์ด effect)
- state, setup (R1–R3), turn loop, draw + Event loop (R7, R8), drink + bank (R4–R6), exchange (R13), discard (R14), shortfall (R15), elimination (R17, R18), win (R19), projection, seeded RNG
- **Unit tests:** turn rotation ที่ข้ามคนตกรอบ, exchange cost 1+2+3=6 และ reset ตอนขึ้นเทิร์นใหม่, shortfall หัก HP ถูกต้อง, discard ขาดแล้วหัก Mana, Event ไม่อยู่ในมือเริ่มต้น, bank หมดแล้วซดไม่ได้อะไร, opening shot (H1) ทำให้ทุกคนเริ่มด้วย Mana 3 และเทิร์นแรกยังไม่เริ่มจนกว่าทุกคนจะซดครบ, ตกรอบกลางเทิร์น, projection ไม่รั่ว
- **Done when:** จำลองทั้งเกมใน test ได้ 3–6 คน ผ่าน action ตรง ๆ จนมีผู้ชนะ

### Phase 3: Effect engine + Stack + Response
- effect primitives, modifier system, stack LIFO, response window, counter/prevent/redirect, target validation, ค่า cost แบบทิ้งการ์ด (R11)
- ทดสอบด้วยการ์ดชุด `cards.test.json`
- **Tests:** chain A→B(defend)→A(counter), cost ที่ต้องทิ้ง element ตรงเงื่อนไข, artifact modifier เปลี่ยน hand limit และ potion yield, เล่นการ์ดนอกเทิร์นไม่ได้ถ้าไม่ใช่ defensive
- **Done when:** ทุก primitive มี test และ chain resolve ได้ deterministic

### Phase 4: Server: rooms + socket + validation
- RoomManager, room code 6 ตัว (ตัดตัวที่สับสนกันออก เช่น 0/O, 1/I), session token, lobby, ready, kick, seat order, config, การส่ง `state` แบบแยกต่อคน, timer ฝั่ง server, reconnect, Redis snapshot (optional)
- **Integration tests:** เปิด socket.io-client 3–6 ตัว เล่นจนจบเกม, ยิง action ผิดเทิร์นต้องโดน reject, ส่ง actionId ซ้ำต้องไม่ทำงานซ้ำ, client ต้องไม่เห็นมือคนอื่น, หลุดแล้ว reconnect ได้ state เดิม, กดซดพร้อมกันหลายคน
- **Done when:** integration test เล่นจบเกมผ่าน socket ได้

### Phase 5: Frontend: เล่นได้จริงด้วย UI เรียบ ๆ
- Home, Lobby + QR, Game screen, card inspect, targeting, response window, shortfall, event reveal, game over, game log
- **Done when:** เปิด 3 browser ต่างเครื่องแล้วเล่นจนจบเกมด้วยการ์ดทดสอบได้

### Phase 6: การ์ดจริง (ต้องมีข้อมูลจากหัวข้อ 3)
- ถอดข้อมูลการ์ดเป็น JSON, re-skin เป็น theme dev, ใส่จำนวนใบให้ตรงกล่อง, เพิ่ม primitive หรือ custom handler ที่ยังขาด
- **Test:** การ์ดทุกใบต้องมีอย่างน้อย 1 test ที่ยืนยันว่า effect ตรงกับข้อความบนการ์ด
- **Done when:** การ์ดครบทุกใบ ไม่มีใบไหนติดป้าย `needsConfirmation`

### Phase 7: Theme + Polish
- ทำตามหัวข้อ 1.5 ทั้งหมด: Neon Terminal Bar theme, card frame, signature animations, เสียง, หน้า How to Play แบบ interactive
- (ตัดออก: ไม่มีไฟล์รูป ภาพการ์ดเป็น CSS ล้วนแล้ว)
- **Done when:**
  - ทดสอบบน iOS Safari และ Android Chrome ของจริงแล้ว ไม่มี overflow และทุกปุ่มกดง่าย
  - animation ได้ ~60fps บน Android ระดับกลาง (วัดด้วย Chrome DevTools Performance)
  - ไม่มี layout shift ตอน state อัปเดต

### Phase 8: E2E + Playtest
- Playwright เปิด 3/4/6 browser context พร้อมกันแล้วเล่นจนจบ
- playtest จริงกับทีมในบริษัท แล้วเก็บ feedback
- **Done when:** playtest จบเกมได้โดยไม่มี desync หรือ crash

### Phase 9: Deploy
- Dockerfile (multi-stage) สำหรับ web (static) และ server, reverse proxy (Caddy ทำ HTTPS อัตโนมัติ) ที่รองรับ WebSocket upgrade
- deploy ได้บน VPS บริษัท, Render หรือ Fly.io ส่วน Vercel/Netlify ใช้ได้แค่ static web (server ต้องอยู่ที่อื่น)
- ถ้ามีหลาย instance ต้องเปิด sticky session และใช้ Redis adapter
- Postgres เก็บประวัติแมตช์ (optional)
- **Done when:** เปิดผ่าน URL สาธารณะด้วยมือถือ 4G แล้วเล่นได้

---

## 11. Deliverables
- Source code ครบตามโครงสร้างในหัวข้อ 5
- `docker-compose.yml`, `.env.example`, Dockerfiles
- `README.md`: setup, dev, test, deploy, วิธีเพิ่มหรือแก้การ์ด
- `docs/rules-mapping.md`: กติกาแต่ละข้อ (R1–R19) ↔ โค้ด ↔ test
- Test suites: engine unit, server integration, Playwright e2e
- DB schema (`matches`, `match_players`, `match_events`) ถ้าเลือกใช้ Postgres

---

## 12. คำถามที่ต้องตอบก่อนเริ่ม

| # | คำถาม | ค่าที่เสนอ |
|---|---|---|
| Q1 | มีกล่องเกมจริงไหม และถ่ายรูปการ์ดทุกใบได้ไหม (หัวข้อ 3) | A: ถ่ายรูป |
| Q2 | ชื่อเกม | "SHOT-DRIVEN DEVELOPMENT " |
| Q3 | ตาราง Theme Mapping ในหัวข้อ 1 โอเคไหม หรืออยากแก้ตรงไหน | ตามตาราง |
| Q4 | logo / สีแบรนด์ | ไม่ใช้แบรนด์ใด ๆ (ตัดสินใจแล้ว) |
| Q12 | ช็อต `git init` ตอนเปิดเกมได้ +3 Mana ทำให้ทุกคนเริ่มที่ 3 ใช่ไหม | ใช่ |
| Q5 | KO mode | `self-declare` + ปุ่ม option `potionLimit` |
| Q6 | ในกล่องมี Mana Crystal กี่อัน (bank size) | นับจากกล่องจริง |
| Q7 | ~~ใช้ภายในหรือเปิดสาธารณะ~~ | ตอบแล้ว: เล่นกันเองเพื่อความสนุก ไม่ได้ขาย |
| Q8 | Deploy ที่ไหน | VPS บริษัท + Caddy |
| Q9 | Nuxt 4 หรือ Nuxt 3 | Nuxt 4 |
| Q10 | Response window ให้กี่วินาที | 10 วินาที |
