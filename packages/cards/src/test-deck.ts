import type { CardDef } from '@sdd/engine'

/**
 * TEST FIXTURE: placeholder deck used to exercise every engine mechanic.
 * These are NOT the real Not Enough Mana cards. The real list (names, costs, effects, copy counts)
 * must come from the physical box (PLAN.md phase 6) and replace this file.
 */
const fixture = { source: 'test-fixture' } as const

export const TEST_DECK: CardDef[] = [
  // ───────── Offensive: hotfix / freeze / deploy ─────────
  {
    ...fixture,
    id: 'merge-conflict',
    name: 'Merge Conflict',
    description: 'ทำ 2 damage ใส่ 1 คน',
    type: 'offensive',
    element: 'hotfix',
    cost: { mana: 1, discard: [{ count: 1, element: 'hotfix' }] },
    target: 'one-opponent',
    effects: [{ kind: 'damage', amount: 2, to: 'targets' }],
    incantation: 'fix: แก้ conflict ด้วยการลบของเพื่อน',
    copies: 3
  },
  {
    ...fixture,
    id: 'null-pointer',
    name: 'Null Pointer',
    description: 'ทำ 3 damage ใส่ 1 คน',
    type: 'offensive',
    element: 'hotfix',
    cost: { mana: 2 },
    target: 'one-opponent',
    effects: [{ kind: 'damage', amount: 3, to: 'targets' }],
    incantation: 'Cannot read properties of undefined!',
    copies: 3
  },
  {
    ...fixture,
    id: 'prod-fire',
    name: 'Prod On Fire',
    description: 'ทำ 2 damage ใส่ทุกคนยกเว้นตัวเอง',
    type: 'offensive',
    element: 'hotfix',
    cost: { mana: 4 },
    target: 'all-opponents',
    effects: [{ kind: 'damage', amount: 2, to: 'all-opponents' }],
    incantation: 'chore: ไฟไหม้ production ทุกคนช่วยกันดับ',
    copies: 2
  },
  {
    ...fixture,
    id: 'code-freeze',
    name: 'Code Freeze',
    description: 'ทำ 2 damage และเป้าหมายต้องทิ้งการ์ด 1 ใบ',
    type: 'offensive',
    element: 'freeze',
    cost: { mana: 2 },
    target: 'one-opponent',
    effects: [
      { kind: 'damage', amount: 2, to: 'targets' },
      { kind: 'discard', count: 1, to: 'targets' }
    ],
    incantation: 'ห้าม merge จนกว่าจะประกาศ!',
    copies: 3
  },
  {
    ...fixture,
    id: 'dependency-lock',
    name: 'Dependency Lock',
    description: 'ทำ 1 damage และเป้าหมายถือการ์ดได้น้อยลง 1 ใบ เป็นเวลา 2 เทิร์น',
    type: 'offensive',
    element: 'freeze',
    cost: { mana: 1 },
    target: 'one-opponent',
    effects: [
      { kind: 'damage', amount: 1, to: 'targets' },
      {
        kind: 'status',
        to: 'targets',
        status: { id: 'locked', name: 'Dependency Lock', modifiers: [{ stat: 'handLimit', delta: -1 }], turns: 2 }
      }
    ],
    incantation: 'package-lock.json ชนะเสมอ',
    copies: 2
  },
  {
    ...fixture,
    id: 'friday-deploy',
    name: 'Friday Deploy',
    description: 'ทำ 4 damage ใส่ 1 คน',
    type: 'offensive',
    element: 'deploy',
    cost: { mana: 3 },
    target: 'one-opponent',
    effects: [{ kind: 'damage', amount: 4, to: 'targets' }],
    incantation: 'deploy: ขึ้นวันศุกร์ตอนห้าโมงเย็น',
    copies: 2
  },
  {
    ...fixture,
    id: 'pipeline-surge',
    name: 'Pipeline Surge',
    description: 'ทำ 3 damage ใส่ 1 คน',
    type: 'offensive',
    element: 'deploy',
    cost: { mana: 1, discard: [{ count: 1, element: 'deploy' }] },
    target: 'one-opponent',
    effects: [{ kind: 'damage', amount: 3, to: 'targets' }],
    incantation: 'ci: pipeline เขียวทุกอัน (ไม่จริง)',
    copies: 2
  },

  // ───────── Defensive (play out of turn in response) ─────────
  {
    ...fixture,
    id: 'try-catch',
    name: 'try / catch',
    description: 'ยกเลิก spell โจมตีหรือ curse ที่ใส่คุณ',
    type: 'defensive',
    cost: { mana: 1 },
    target: 'none',
    respondsTo: ['offensive', 'curse'],
    effects: [{ kind: 'counter' }],
    incantation: 'catch (e) { /* ไม่เป็นไร */ }',
    copies: 4
  },
  {
    ...fixture,
    id: 'rollback',
    name: 'Rollback',
    description: 'ยกเลิก spell ที่ใส่คุณ แล้วฟื้น 1 HP',
    type: 'defensive',
    cost: { mana: 2 },
    target: 'none',
    respondsTo: ['offensive', 'curse', 'support'],
    effects: [
      { kind: 'counter' },
      { kind: 'heal', amount: 1, to: 'self' }
    ],
    incantation: 'git revert HEAD',
    copies: 2
  },
  {
    ...fixture,
    id: 'firewall',
    name: 'Firewall',
    description: 'ยกเลิก spell โจมตีที่ใส่คุณ',
    type: 'defensive',
    cost: { mana: 1 },
    target: 'none',
    respondsTo: ['offensive'],
    effects: [{ kind: 'counter' }],
    incantation: 'DROP ทุก packet!',
    copies: 2
  },
  {
    ...fixture,
    id: 'force-push',
    name: 'Force Push',
    description: 'ยกเลิกการ์ดป้องกันที่ใช้ใส่การ์ดของคุณ',
    type: 'defensive',
    cost: { mana: 2 },
    target: 'none',
    respondsTo: ['defensive'],
    effects: [{ kind: 'counter' }],
    incantation: 'git push --force (ไม่ถามใคร)',
    copies: 2
  },

  // ───────── Support ─────────
  {
    ...fixture,
    id: 'copilot',
    name: 'Copilot',
    description: 'จั่วการ์ด 2 ใบ',
    type: 'support',
    cost: { mana: 1 },
    target: 'self',
    effects: [{ kind: 'draw', count: 2, to: 'self' }],
    incantation: 'Tab Tab Tab Tab',
    copies: 3
  },
  {
    ...fixture,
    id: 'rubber-duck',
    name: 'Rubber Duck',
    description: 'ฟื้น 3 HP',
    type: 'support',
    cost: { mana: 1 },
    target: 'self',
    effects: [{ kind: 'heal', amount: 3, to: 'self' }],
    incantation: 'อ๋อ... เข้าใจแล้ว (เป็ดไม่ได้พูดอะไร)',
    copies: 3
  },
  {
    ...fixture,
    id: 'pair-programming',
    name: 'Pair Programming',
    description: 'ฟื้น 2 HP และจั่วการ์ด 1 ใบ',
    type: 'support',
    cost: { mana: 2 },
    target: 'self',
    effects: [
      { kind: 'heal', amount: 2, to: 'self' },
      { kind: 'draw', count: 1, to: 'self' }
    ],
    incantation: 'ขอ driver เปลี่ยนมือหน่อย',
    copies: 2
  },
  {
    ...fixture,
    id: 'context-switch',
    name: 'Context Switch',
    description: 'สลับการ์ดบนมือกับ 1 คน',
    type: 'support',
    cost: { mana: 2 },
    target: 'one-opponent',
    effects: [{ kind: 'swapHands' }],
    incantation: 'เดี๋ยวๆ ลูกค้าโทรมา สลับงานก่อน',
    copies: 2
  },
  {
    ...fixture,
    id: 'happy-hour',
    name: 'Happy Hour',
    description: 'การซดแต่ละครั้งได้ Mana เพิ่ม 1 เป็นเวลา 3 เทิร์น',
    type: 'support',
    cost: { mana: 1 },
    target: 'self',
    effects: [
      {
        kind: 'status',
        to: 'self',
        status: { id: 'happy-hour', name: 'Happy Hour', modifiers: [{ stat: 'potionYield', delta: 1 }], turns: 3 }
      }
    ],
    incantation: 'ซื้อ 1 แถม 1 หลังเลิกงาน!',
    copies: 2
  },

  // ───────── Curses ─────────
  {
    ...fixture,
    id: 'memory-leak',
    name: 'Memory Leak',
    description: 'เป้าหมายเสีย Mana 3',
    type: 'curse',
    cost: { mana: 2 },
    target: 'one-opponent',
    effects: [{ kind: 'loseMana', amount: 3, to: 'targets' }],
    incantation: 'heap out of memory!',
    copies: 3
  },
  {
    ...fixture,
    id: 'technical-debt',
    name: 'Technical Debt',
    description: 'เป้าหมายรับ damage เพิ่ม 1 เป็นเวลา 3 เทิร์น',
    type: 'curse',
    cost: { mana: 1 },
    target: 'one-opponent',
    effects: [
      {
        kind: 'status',
        to: 'targets',
        status: { id: 'tech-debt', name: 'Technical Debt', modifiers: [{ stat: 'damageTaken', delta: 1 }], turns: 3 }
      }
    ],
    incantation: 'TODO: ค่อยแก้ทีหลัง (ปี 2019)',
    copies: 2
  },
  {
    ...fixture,
    id: 'scope-creep',
    name: 'Scope Creep',
    description: 'เป้าหมายต้องทิ้งการ์ด 2 ใบ',
    type: 'curse',
    cost: { mana: 2 },
    target: 'one-opponent',
    effects: [{ kind: 'discard', count: 2, to: 'targets' }],
    incantation: 'อีกนิดเดียวเอง ขอเพิ่มอีกฟีเจอร์',
    copies: 2
  },
  {
    ...fixture,
    id: 'three-hour-meeting',
    name: '3-Hour Meeting',
    description: 'เป้าหมายข้ามเทิร์นถัดไป',
    type: 'curse',
    cost: { mana: 3 },
    target: 'one-opponent',
    effects: [
      {
        kind: 'status',
        to: 'targets',
        status: { id: 'meeting', name: '3-Hour Meeting', modifiers: [], turns: 1, skipTurn: true }
      }
    ],
    incantation: 'ขอแค่ 5 นาที... (3 ชั่วโมงต่อมา)',
    copies: 1
  },
  {
    ...fixture,
    id: 'spilled-coffee',
    name: 'Spilled Coffee',
    description: 'ทำลาย Artifact 1 ชิ้นของใครก็ได้',
    type: 'curse',
    cost: { mana: 2 },
    target: 'artifact',
    effects: [{ kind: 'destroyArtifact' }],
    incantation: 'อุ๊ย! กาแฟหกใส่คีย์บอร์ด',
    copies: 2
  },

  // ───────── Artifacts ─────────
  {
    ...fixture,
    id: 'mechanical-keyboard',
    name: 'Mechanical Keyboard',
    description: 'การซดแต่ละครั้งได้ Mana เพิ่ม 1',
    type: 'artifact',
    cost: { mana: 2 },
    target: 'none',
    effects: [],
    modifiers: [{ stat: 'potionYield', delta: 1 }],
    incantation: 'clack clack clack',
    copies: 2
  },
  {
    ...fixture,
    id: 'ultrawide-monitor',
    name: 'Ultrawide Monitor',
    description: 'ถือการ์ดได้เพิ่ม 1 ใบ',
    type: 'artifact',
    cost: { mana: 2 },
    target: 'none',
    effects: [],
    modifiers: [{ stat: 'handLimit', delta: 1 }],
    incantation: 'เห็น code ทีเดียว 3 ไฟล์',
    copies: 2
  },
  {
    ...fixture,
    id: 'gaming-chair',
    name: 'Gaming Chair',
    description: 'damage ที่คุณได้รับลดลง 1',
    type: 'artifact',
    cost: { mana: 3 },
    target: 'none',
    effects: [],
    modifiers: [{ stat: 'damageTaken', delta: -1 }],
    incantation: 'ปรับเอนหลัง 135 องศา',
    copies: 1
  },

  // ───────── Events (resolve the moment they are drawn) ─────────
  {
    ...fixture,
    id: 'prod-down',
    name: 'Prod Down!',
    description: 'ทุกคนเสีย 1 HP',
    type: 'event',
    cost: { mana: 0 },
    target: 'all-players',
    effects: [{ kind: 'damage', amount: 1, to: 'all-players' }],
    copies: 2
  },
  {
    ...fixture,
    id: 'critical-incident',
    name: 'Critical Incident',
    description: 'ทุกคนเสีย 2 HP',
    type: 'event',
    cost: { mana: 0 },
    target: 'all-players',
    effects: [{ kind: 'damage', amount: 2, to: 'all-players' }],
    copies: 1
  },
  {
    ...fixture,
    id: 'free-pizza',
    name: 'Free Pizza',
    description: 'ทุกคนฟื้น 2 HP',
    type: 'event',
    cost: { mana: 0 },
    target: 'all-players',
    effects: [{ kind: 'heal', amount: 2, to: 'all-players' }],
    copies: 1
  },
  {
    ...fixture,
    id: 'requirement-change',
    name: 'Requirement Change',
    description: 'ทุกคนต้องทิ้งการ์ด 1 ใบ',
    type: 'event',
    cost: { mana: 0 },
    target: 'all-players',
    effects: [{ kind: 'discard', count: 1, to: 'all-players' }],
    copies: 1
  },
  {
    ...fixture,
    id: 'team-building',
    name: 'Team Building',
    description: 'ทุกคนได้ Mana 2',
    type: 'event',
    cost: { mana: 0 },
    target: 'all-players',
    effects: [{ kind: 'gainMana', amount: 2, to: 'all-players' }],
    copies: 1
  },
  {
    ...fixture,
    id: 'freeze-week',
    name: 'Freeze Week',
    description: 'ทุกคนถือการ์ดได้น้อยลง 1 ใบ เป็นเวลา 4 เทิร์น',
    type: 'event',
    cost: { mana: 0 },
    target: 'all-players',
    effects: [],
    modifiers: [{ stat: 'handLimit', delta: -1 }],
    duration: { turns: 4 },
    copies: 1
  }
]
