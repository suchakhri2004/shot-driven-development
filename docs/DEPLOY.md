# Deploy (ฟรีทั้งหมด)

เกมทั้งเกมเป็น **process เดียว พอร์ตเดียว** (server เสิร์ฟหน้าเว็บเองด้วย) จึงขึ้นโฮสต์ฟรีได้ง่าย ไม่ต้องมีฐานข้อมูล

## ต้องมี database ไหม?

**ไม่ต้อง** สำหรับการเล่นกับเพื่อน

- ห้องและเกมที่กำลังเล่นอยู่ใน memory ของ server เกมหนึ่งจบในไม่กี่สิบนาที ไม่มีอะไรต้องเก็บถาวร
- ไม่มีระบบสมาชิก ผู้เล่นกลับเข้าห้องเดิมด้วย session token ที่เก็บในเบราว์เซอร์ของตัวเอง
- ข้อเสียที่ยอมรับได้: ถ้า server restart (deploy เวอร์ชันใหม่ หรือโฮสต์ฟรีหลับ) เกมที่ **กำลังเล่นอยู่** จะหาย ต้องสร้างห้องใหม่

ค่อยเพิ่ม database เมื่ออยากได้ของพวกนี้ (ยังไม่จำเป็นตอนนี้):

| อยากได้ | ใช้อะไร |
|---|---|
| เกมไม่หายตอน server restart | Redis เก็บ snapshot ของ `GameState` (เป็น JSON อยู่แล้ว) |
| รันหลายเครื่องพร้อมกัน (คนเล่นเยอะมาก) | Redis + `@socket.io/redis-adapter` + sticky session |
| ประวัติแมตช์ / สถิติย้อนหลัง | Postgres |

## ทางเลือก A: Render (แนะนำ: มีลิงก์ถาวร เช่น `https://shot-driven-development.onrender.com`)

Render มี free web service ที่รองรับ WebSocket และไม่ต้องผูกบัตร ([Render: Deploy for Free](https://render.com/docs/free))

1. สร้าง repository บน GitHub (ฟรี) แล้ว push โค้ดนี้ขึ้นไป
2. สมัคร [render.com](https://render.com) ด้วยบัญชี GitHub
3. **New → Blueprint** → เลือก repo นี้ → Render จะอ่าน `render.yaml` แล้ว build จาก `Dockerfile` ให้เอง (ครั้งแรกประมาณ 5–10 นาที)
4. เปิดลิงก์ที่ได้ → สร้างห้อง → ส่งรหัสหรือ QR ให้เพื่อน

ข้อจำกัดของแพ็กเกจฟรี:

- ถ้าไม่มีใครใช้ 15 นาที service จะหลับ คนแรกที่เปิดต้องรอประมาณ 1 นาที (ระหว่างเล่น ข้อความ WebSocket นับเป็นการใช้งาน จึงไม่หลับกลางเกม)
- ได้ 750 ชั่วโมงต่อเดือน ซึ่งพอสำหรับ 1 service เปิดทั้งเดือน
- ทุกครั้งที่ push โค้ดใหม่ Render จะ deploy ใหม่ และเกมที่กำลังเล่นอยู่จะหาย

## ทางเลือก B: ใช้คอมของคุณเป็น server + ลิงก์ฟรีจาก Cloudflare (ไม่ต้องสมัครอะไรเลย)

```bash
npm install
npm run play          # terminal 1: เปิดเกมที่ http://localhost:3210
npm run share         # terminal 2: ได้ลิงก์ https://xxxx.trycloudflare.com ส่งให้เพื่อน
```

ติดตั้ง cloudflared ครั้งเดียว: `winget install Cloudflare.cloudflared`
ลิงก์จะเปลี่ยนทุกครั้งที่รัน `npm run share` และคอมต้องเปิดค้างไว้ตลอดที่เล่น

## ทางเลือก C: Hugging Face Spaces (Docker, ฟรี)

1. สร้าง Space ใหม่ เลือก SDK = **Docker**
2. push โค้ดนี้เข้า Space repo และเพิ่มส่วนหัวนี้ไว้บนสุดของ `README.md` ใน Space:
   ```yaml
   ---
   title: Shot-Driven Development
   sdk: docker
   app_port: 3210
   ---
   ```
3. Space จะ build จาก `Dockerfile` เอง แพ็กเกจฟรีจะหลับเมื่อไม่มีคนใช้ 48 ชั่วโมง

## ทางเลือก D: เซิร์ฟเวอร์ของคุณเองพร้อมโดเมน + HTTPS

```bash
cp .env.example .env         # ตั้ง DOMAIN=game.example.com
docker compose -f docker-compose.prod.yml up -d --build
```

ใช้ Caddy (ฟรี) ขอใบรับรอง HTTPS ให้อัตโนมัติ ต้องเปิดพอร์ต 80/443 และชี้ DNS มาที่เครื่อง (ค่าเช่าเครื่องเป็นเรื่องของผู้ให้บริการแต่ละเจ้า ถ้าต้องการฟรี 100% ใช้ A หรือ B)

## ตรวจหลัง deploy

- เปิด `https://<โดเมน>/health` ต้องได้ `{"ok":true,...,"web":true}`
- เปิดหน้าแรกบนมือถือ 2 เครื่อง สร้างห้อง/เข้าห้อง แล้วลองซด 1 ครั้ง
