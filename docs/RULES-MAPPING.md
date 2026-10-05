# กติกา ↔ โค้ด ↔ test

อ้างอิงเลข R1–R19 จาก [PLAN.md](../PLAN.md) (กติกาจากคู่มือที่ได้รับ) และ H1–H3 (house rule ของโต๊ะเรา)
test ทุกตัวอยู่ใน `packages/engine/test/` (`setup-and-turns` = ST, `combat` = CB, `simulation` = SIM)

| # | กติกา | โค้ด (`packages/engine/src`) | test |
|---|---|---|---|
| R1 | เริ่ม HP 10 / Mana 0 / การ์ด 5 ใบ | `setup.ts` (createPlayer, dealStartingHands) | ST "starts every player with 10 HP…" |
| R2 | Event ไม่อยู่ในมือเริ่มต้น | `setup.ts` (dealStartingHands) | ST "never deals an Event…" |
| R3 | คนอายุมากสุดเริ่ม, วนตามเข็มนาฬิกา | `setup.ts` (firstPlayerId), `turn.ts` (pickNextPlayer); เลือกคนเริ่ม: `server/rooms/room.ts` | ST "passes the turn clockwise…", "the first player is…" |
| R4 | ซด 1 ครั้ง = +3 Mana ทุกเวลา | `actions/drink.ts` | ST "gives 3 mana and works at any time…" |
| R5 | Mana ไม่มี cap | `resources.ts` | ST "has no mana cap" |
| R6 | คริสตัลหมด = ซดไม่ได้ Mana | `resources.ts` (canDrink/giveMana), `actions/drink.ts` | ST "gives nothing once the bank is empty" |
| R7 | จั่วถึง hand limit | `turn.ts` (drawTowardHandLimit), `advance.ts` | ST "refills the hand to 5", "raised hand limit" |
| R8 | จั่วได้ Event → เปิด ทำตาม จั่วใหม่ | `deck.ts` (drawCard, revealEvent), `effects.ts` (drawFromEffect) | ST "resolves a drawn Event immediately…", "timed Event" |
| R9 | action phase: เล่น/ทิ้ง/แลก/ซด หลายครั้ง สลับลำดับได้ | `advance.ts` (phase action), `actions/*` | SIM (สุ่มลำดับ action) |
| R10 | ขั้นตอนเล่นการ์ด: จ่าย → เป้าหมาย → effect → ลงกองทิ้ง | `actions/play-card.ts` | CB "pays mana, resolves the effect…" |
| R11 | ค่าใช้จ่ายแบบทิ้งการ์ด (เช่น ทิ้ง Fire 1 ใบ) | `validation.ts` (validateCostCards) | CB "requires a matching card to discard…" |
| R12 | Defensive เล่นนอกเทิร์นตอบโต้ได้ | `chain.ts`, `validation.ts` (assertPlayWindow) | CB ทั้งกลุ่ม "response windows and chains" |
| R13 | Rebase ครั้งที่ n = n Mana, reset ทุกเทิร์น | `actions/hand-actions.ts` (exchangeCard), `turn.ts` | ST "costs 1, then 2, then 3 mana…" |
| R14 | บังคับทิ้งแต่ไม่พอ → เสีย Mana ใบละ 1 | `effects.ts` (forceDiscard), `shortfall.ts` | CB "charges 1 mana per card that cannot be discarded" |
| R15 | Mana ไม่พอ → ซดเติมทันที ไม่งั้นเสีย HP เท่าที่ขาด | `shortfall.ts` | CB กลุ่ม "mana shortfall…" |
| R16 | Artifact/Curse/Event ค้างจนหมดผล | `stats.ts`, `turn.ts` (decay), `effects.ts` (addStatus, destroyArtifact) | CB "statuses", "artifact damage reduction", "destroys an artifact" |
| R17 | HP ≤ 0 ตกรอบทันที | `elimination.ts` (checkEliminations) | CB "eliminates a player the moment HP hits 0" |
| R18 | Too Much Mana / ไปต่อไม่ไหว → ตกรอบ | `actions/decisions.ts` (declareKo), `actions/drink.ts` (enforcePotionLimit) | CB "declare KO", "potion limit" |
| R19 | เหลือคนสุดท้ายชนะ | `elimination.ts` (finishGame) | CB "ends the game when one player is left", SIM |
| H1 | ช็อตเปิดเกม: ทุกคนซด 1 ครั้งก่อนเริ่ม (+3) | `actions/drink.ts`, `setup.ts` (phase opening_shot) | ST กลุ่ม "opening shot" |
| H2 | โหมดดวล: ห้องที่มี 2 คน เริ่มด้วย Uptime 6 (`DUEL_HP`) กติกาอื่นเหมือนเดิม การ์ดข้ามเทิร์นทำให้คนเล่นได้เล่นต่ออีกเทิร์น | `protocol` (DUEL_PLAYERS, DUEL_HP), `server/rooms/room.ts` (startGame) | server "starts a 2-player room as a duel", SIM 2 คน |
| H3 | การ์ดพิเศษ (เปิดเป็นค่าเริ่มต้น ปิดได้ด้วย `config.houseCards`): **Coffee Break** ×2 พักเกม 10 นาที (`interludeSec`) คนเล่นการ์ดหรือเจ้าของห้องจบก่อนได้; **Hackathon** ×4 สุ่มมินิเกมจาก `cards/mini-games.ts` เล่นกันจริงในวง คนแพ้กด "ฉันแพ้" ได้คนละครั้ง ดื่มจริง และเสีย Shot Stack 3 (`miniGamePenalty`, คืนเข้ากองกลาง) | `actions/interlude.ts` (pending `interlude`), `server/game/game-session.ts` (endInterlude) | `interlude.test.ts`, server "holds a coffee break…", SIM |

นอกจากนี้: **SIM** สุ่มเล่นเต็มเกม 20 เกม (2–6 คน) ตรวจทุก action ว่าจำนวนการ์ดรวมคงที่, Mana ไม่ติดลบ, bank + Mana ผู้เล่นรวมคงที่, ผู้ตกรอบไม่มีการ์ด, และ projection ไม่รั่วมือคนอื่น
