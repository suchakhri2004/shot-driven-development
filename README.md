# SHOT-DRIVEN DEVELOPMENT

เกมการ์ดดื่มออนไลน์ 3–6 คน คนละเครื่อง เล่นผ่านเว็บ ใช้กลไกแบบ **Not Enough Mana (มานาหมด ซดเลย!)** ในธีมชีวิต dev ออฟฟิศซอฟต์แวร์ (Mana → Shot Stack, HP → Uptime, KO → STACK OVERFLOW)

> เกมดื่ม 18+ ทำไว้เล่นกันเองในกลุ่ม ไม่ได้ขาย ดื่มอย่างรับผิดชอบและไม่ขับรถหลังดื่ม (ผู้เล่นเลือก "สายไม่ดื่มแอลกอฮอล์" ได้ในล็อบบี้)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/suchakhri2004/shot-driven-development)

กดปุ่มด้านบนเพื่อเปิดเกมออนไลน์บน Render ฟรี (รายละเอียดใน [docs/DEPLOY.md](docs/DEPLOY.md))

## เริ่มเล่น (ฟรี ไม่ต้องสมัครอะไร)

ต้องมี Node.js 22+

```bash
npm install
npm run play # build เว็บ + เปิดเกมที่ http://localhost:3210
```

เปิด `http://localhost:3210` → **สร้างห้อง** → เพื่อนเข้าด้วยรหัส 6 ตัว หรือสแกน QR ในล็อบบี้

| เล่นแบบไหน | ทำยังไง |
|---|---|
| เครื่องเดียว (ลองคนเดียวหลายแท็บ) | เปิดหลายแท็บที่ `http://localhost:3210` |
| มือถือในวง Wi-Fi เดียวกัน | เปิด `http://<IP เครื่องคุณ>:3210` บนมือถือ (ถ้าเข้าไม่ได้ ให้อนุญาตพอร์ต 3210 ใน Windows Firewall) |
| **เพื่อนอยู่คนละที่ (อินเทอร์เน็ต) — ฟรี**| เปิดอีก terminal แล้วรัน `npm run share` ได้ลิงก์ `https://….trycloudflare.com` ส่งให้เพื่อน (ใช้ Cloudflare quick tunnel: ไม่ต้องสมัคร ไม่ต้องใช้บัตร) ติดตั้งครั้งเดียว: `winget install Cloudflare.cloudflared` |

เครื่องคุณต้องเปิดเกมค้างไว้ตลอดที่เล่น (ห้องอยู่ในหน่วยความจำของ server)

## ค่าใช้จ่าย: 0 บาท

ทุกอย่างในโปรเจกต์เป็นโอเพนซอร์สและฟรี ไม่มี API/บริการเสียเงิน:

- โค้ดและไลบรารี: Nuxt, Vue, Tailwind, Socket.IO, zod, qrcode, **anime.js** (MIT) · เครื่องมือ dev: Vitest, Playwright (ไม่ถูกรวมในเกม)
- **ไม่มีไฟล์รูปและไฟล์เสียง**: พื้นหลังการ์ด/โต๊ะ/ขวด/วงแหวนวาดด้วย CSS+SVG, เสียงเอฟเฟกต์และเพลงสังเคราะห์สดด้วย WebAudio
- **ไอคอนในเกม** มาจาก [game-icons.net](https://game-icons.net) (Lorc, Delapouite & contributors) ลิขสิทธิ์ **CC BY 3.0** ใช้ฟรีแต่ต้องให้เครดิต ซึ่งแสดงไว้ในหน้าแรกและหน้าวิธีเล่นแล้ว **ห้ามลบเครดิตนี้** (ไอคอนที่ใช้ถูกคัดลอกเข้าโปรเจกต์ ไม่ได้โหลดจากเน็ตตอนเล่น)
- ฟอนต์ Kanit, IBM Plex Sans Thai, JetBrains Mono (OFL ฟรี) ฝังมากับเกม ไม่ต้องโหลดจาก Google ตอนเล่น
- ออนไลน์: ใช้เครื่องคุณเป็น server + Cloudflare quick tunnel (ฟรี) — **ไม่ต้องเช่า server**

## สถานะ

| | |
|---|---|
| พร้อมเล่น | กติกาครบ (R1–R19 + ช็อตเปิดเกม), ห้อง/lobby/QR, เล่นจนจบเกม 3–6 คน, กลับเข้าห้องเดิมได้, หน้าจอมือถือ, เสียง/เพลง |
| การ์ด | **ชุดเล่นจริง 90 ใบ (`packages/cards/src/deck.ts`) ที่ออกแบบขึ้นเอง** ตามโครงสร้างของเกมต้นฉบับ (โจมตี 3 ธาตุ, ป้องกัน, ซัพพอร์ต, คำสาป, Artifact, Incident) **ไม่ใช่การ์ดที่พิมพ์ในกล่องจริง** ถ้าได้รายการการ์ดจริงมา แทนที่ไฟล์นี้ไฟล์เดียว |
| ยังไม่มี | Anti-Joker (ไม่ทราบข้อความการ์ดจริง), เก็บห้องลง Redis/Postgres (restart server = เกมหาย), บอท, ทดสอบบน iOS Safari / Android จริง |

ข้อตัดสินใจเรื่องกติกาที่คู่มือไม่ได้ระบุ: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) หัวข้อ 6 · แผนและสถานะ: [PLAN.md](PLAN.md)

## พัฒนาต่อ

```bash
npm run dev:server # game server -> http://localhost:3210
npm run dev:web # หน้าเว็บ (hot reload) -> http://localhost:3100
```

> พอร์ต 3100 (เว็บ dev) และ 3210 (เกม) ถูกเลือกให้ไม่ชนพอร์ตที่โปรเจกต์อื่นมักใช้ (3000, 3001 ฯลฯ) เปลี่ยนได้ที่ `apps/web/package.json` และตัวแปร `PORT`

## Test

```bash
npm test # ทั้งหมด (126 tests, ~30 วินาที)
npx vitest run packages/engine # กติกา
npx vitest run apps/server # server (เปิด socket จริง)
npm run typecheck # engine + server
npm run typecheck -w @sdd/web # หน้าเว็บ
```

| ชุด test | ครอบคลุม |
|---|---|
| `engine/test/setup-and-turns` | เริ่มเกม, ช็อตเปิดเกม, ซด/bank, ลำดับเทิร์น, จั่ว/Incident, Rebase 1+2+3, ซ่อนมือคนอื่น |
| `engine/test/combat` | เล่นการ์ด/ค่าใช้จ่าย/เป้าหมาย, ตอบโต้ + chain, Mana ไม่พอ, ทิ้งการ์ดไม่พอ, ตกรอบ/ชนะ, status |
| `engine/test/simulation` | สุ่มเล่นเต็มเกม 3–6 คน × 4 seed × (ชุดทดสอบ + **ชุดเล่นจริง**) ตรวจ invariant ทุก action |
| `cards/test/deck` | ความสมบูรณ์ของชุดการ์ด 90 ใบ (id ไม่ซ้ำ, ธาตุพอจ่ายค่าทิ้ง, เป้าหมายตรงกับ effect, สัดส่วน Incident/ป้องกัน) |
| `server/test/lobby` | สร้าง/เข้าห้อง, 6 คนเต็ม, kick, host, reorder, config, rate limit |
| `server/test/game-flow` | client จริง 3–6 ตัวเล่นพร้อมกันจนจบ, validation, actionId ซ้ำ, reconnect |
| `server/test/game-session` | timer ฝั่ง server (หมดเวลาตอบโต้/Mana ไม่พอ/ผู้เล่นหลุด) |
| `server/test/static-files` | เสิร์ฟเว็บ, SPA fallback, กัน path traversal |

นอกจาก test อัตโนมัติ ผมขับ Chrome (วิวมือถือ) เล่นจริง 3 หน้าต่าง: สร้าง/เข้าห้อง → เล่นการ์ด → ตอบโต้ → ทิ้งการ์ด → รีเฟรชแล้วกลับมามือเดิม → KO → Game Over → เล่นอีกรอบ ไม่มี console error ไม่มี overflow ทั้งบน dev server, บน `npm run play`, และใน Docker

## โครงสร้างโปรเจกต์

```
apps/
  server/ Node + Socket.IO : ห้อง, lobby, timers, ส่ง state รายคน, เสิร์ฟเว็บที่ build แล้ว
  web/ Nuxt 4 (SPA) : หน้าจอทั้งหมด, เสียง/animation (ไม่มีไฟล์รูป/เสียง)
packages/
  engine/ กติกาเกม (TypeScript ล้วน ไม่แตะ network/UI)
  cards/ deck.ts = ชุดเล่นจริง · test-deck.ts = ชุดเล็กสำหรับ test
  protocol/ ชื่อ event + zod schema + type ที่ client/server ใช้ร่วมกัน
scripts/ share.mjs (เปิดลิงก์ออนไลน์ฟรี) · build-icons.mjs (สร้างไฟล์ไอคอนจาก game-icons.net)
docs/ ARCHITECTURE.md, RULES-MAPPING.md
```

เริ่มอ่านโค้ดที่ [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (มีตาราง "อยากแก้อะไร ไปดูไฟล์ไหน")

## เพิ่ม/แก้การ์ด

การ์ดเป็นข้อมูลล้วน ๆ ใน `packages/cards/src/deck.ts` ไม่ต้องแตะ engine:

```ts
{
  id: 'null-pointer', name: 'Null Pointer', description: 'ทำ 3 damage ใส่ 1 คน',
  type: 'offensive', element: 'hotfix',
  cost: { mana: 2 }, // เพิ่ม discard: [{ count: 1, element: 'hotfix' }] ถ้าต้องทิ้งการ์ดด้วย
  target: 'one-opponent',
  effects: [{ kind: 'damage', amount: 3, to: 'targets' }],
  incantation: 'Cannot read properties of undefined!',
  copies: 3, source: 'house-original'
}
```

effect ที่มี: `damage` `heal` `gainMana` `loseMana` `draw` `discard` `status` `swapHands` `counter` `destroyArtifact` · แก้การ์ดแล้วรัน `npm test` (มี test ตรวจความสมบูรณ์ของชุดการ์ด) · ไอคอนบนการ์ดอยู่ที่ `apps/web/app/theme/theme.ts`

## ตั้งค่า

ดู [.env.example](.env.example) (ทุกตัวมีค่าเริ่มต้น ไม่ต้องสร้าง `.env`) กติกาที่ปรับในล็อบบี้ (host): ช็อตเปิดเกม `git init`, เวลาตอบโต้, วิธี KO

## Docker (ถ้าอยากใช้)

```bash
docker compose up --build # -> http://localhost:3210 (image เดียว: server + เว็บ)
```

ขึ้นเซิร์ฟเวอร์ของตัวเองพร้อมโดเมนและ HTTPS อัตโนมัติ: `docker-compose.prod.yml` + `Caddyfile` (Caddy ฟรี) — ไม่จำเป็นสำหรับการเล่นกับเพื่อน ใช้ `npm run share` ก็พอ

ข้อควรรู้: ห้องอยู่ใน memory → restart server = เกมที่กำลังเล่นหาย และรันได้ instance เดียว
