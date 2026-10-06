import type { CardDef } from '@sdd/engine'

/**
 * The playable deck (90 cards, plus 6 house-rule cards that a room can switch off), designed for this project.
 *
 * It follows the structure of the original game (Fire/Ice/Electric attacks, defensive spells that
 * answer attacks, supporting spells, curses, artifacts, events, "discard a <element> card" costs)
 * but the cards themselves are original: they are NOT a copy of the printed Not Enough Mana cards.
 * Replace this file if you ever get the real card list; nothing else needs to change.
 *
 * Balance notes: HP is 10 and a drink gives +3 mana, so a 2-mana / 3-damage attack kills in four hits
 * and one drink pays for about one and a half spells. Costs that also discard a card of the same
 * element are cheaper and hit harder. About 1 card in 10 is an Incident.
 */
const original = { source: 'house-original' } as const

export const DECK: CardDef[] = [
  /* ═════════ HOTFIX (fire) ═════════ */
  {
    ...original,
    id: 'quick-patch',
    name: 'Quick Patch',
    description: 'ตี 1',
    type: 'offensive',
    element: 'hotfix',
    cost: { mana: 1 },
    target: 'one-opponent',
    effects: [{ kind: 'damage', amount: 1, to: 'targets' }],
    incantation: 'hotfix: แก้นิดเดียว ไม่ต้อง review',
    copies: 4
  },
  {
    ...original,
    id: 'merge-conflict',
    name: 'Merge Conflict',
    description: 'ตี 3',
    type: 'offensive',
    element: 'hotfix',
    cost: { mana: 1, discard: [{ count: 1, element: 'hotfix' }] },
    target: 'one-opponent',
    effects: [{ kind: 'damage', amount: 3, to: 'targets' }],
    incantation: 'fix: แก้ conflict ด้วยการลบของเพื่อน',
    copies: 3
  },
  {
    ...original,
    id: 'null-pointer',
    name: 'Null Pointer',
    description: 'ตี 3',
    type: 'offensive',
    element: 'hotfix',
    cost: { mana: 2 },
    target: 'one-opponent',
    effects: [{ kind: 'damage', amount: 3, to: 'targets' }],
    incantation: 'Cannot read properties of undefined!',
    copies: 3
  },
  {
    ...original,
    id: 'segfault',
    name: 'Segfault',
    description: 'ตี 4',
    type: 'offensive',
    element: 'hotfix',
    cost: { mana: 3 },
    target: 'one-opponent',
    effects: [{ kind: 'damage', amount: 4, to: 'targets' }],
    incantation: 'Segmentation fault (core dumped)',
    copies: 2
  },
  {
    ...original,
    id: 'prod-fire',
    name: 'Prod On Fire',
    description: 'ตีทุกคน 2',
    type: 'offensive',
    element: 'hotfix',
    cost: { mana: 4 },
    target: 'all-opponents',
    effects: [{ kind: 'damage', amount: 2, to: 'all-opponents' }],
    incantation: 'chore: ไฟไหม้ production ทุกคนช่วยกันดับ',
    copies: 2
  },
  {
    ...original,
    id: 'sudo-rm-rf',
    name: 'sudo rm -rf /',
    description: 'ตี 5',
    type: 'offensive',
    element: 'hotfix',
    cost: { mana: 3, discard: [{ count: 1, element: 'hotfix' }] },
    target: 'one-opponent',
    effects: [{ kind: 'damage', amount: 5, to: 'targets' }],
    incantation: 'sudo rm -rf /* (กดจริง)',
    copies: 1
  },

  /* ═════════ CODE FREEZE (ice) ═════════ */
  {
    ...original,
    id: 'code-freeze',
    name: 'Code Freeze',
    description: 'ตี 2 และทิ้งการ์ด 1 ใบ',
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
    ...original,
    id: 'dependency-lock',
    name: 'Dependency Lock',
    description: 'ตี 1 และถือการ์ด -1 ใบ (2 เทิร์น)',
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
    ...original,
    id: 'cold-start',
    name: 'Cold Start',
    description: 'ตี 3',
    type: 'offensive',
    element: 'freeze',
    cost: { mana: 1, discard: [{ count: 1, element: 'freeze' }] },
    target: 'one-opponent',
    effects: [{ kind: 'damage', amount: 3, to: 'targets' }],
    incantation: 'lambda: เริ่มใหม่ตั้งแต่ศูนย์ 9 วินาที',
    copies: 2
  },
  {
    ...original,
    id: 'rate-limit',
    name: 'Rate Limit',
    description: 'ตี 1 และ -2 Shot Stack',
    type: 'offensive',
    element: 'freeze',
    cost: { mana: 2 },
    target: 'one-opponent',
    effects: [
      { kind: 'damage', amount: 1, to: 'targets' },
      { kind: 'loseMana', amount: 2, to: 'targets' }
    ],
    incantation: 'HTTP 429 Too Many Requests',
    copies: 2
  },
  {
    ...original,
    id: 'deadlock',
    name: 'Deadlock',
    description: 'ตี 1 และข้ามเทิร์นถัดไป',
    type: 'offensive',
    element: 'freeze',
    cost: { mana: 3 },
    target: 'one-opponent',
    effects: [
      { kind: 'damage', amount: 1, to: 'targets' },
      { kind: 'status', to: 'targets', status: { id: 'deadlock', name: 'Deadlock', modifiers: [], turns: 1, skipTurn: true } }
    ],
    incantation: 'รอกันและกัน รอไปเรื่อยๆ…',
    copies: 1
  },

  /* ═════════ DEPLOY (lightning) ═════════ */
  {
    ...original,
    id: 'friday-deploy',
    name: 'Friday Deploy',
    description: 'ตี 4',
    type: 'offensive',
    element: 'deploy',
    cost: { mana: 3 },
    target: 'one-opponent',
    effects: [{ kind: 'damage', amount: 4, to: 'targets' }],
    incantation: 'deploy: ขึ้นวันศุกร์ตอนห้าโมงเย็น',
    copies: 2
  },
  {
    ...original,
    id: 'pipeline-surge',
    name: 'Pipeline Surge',
    description: 'ตี 3',
    type: 'offensive',
    element: 'deploy',
    cost: { mana: 1, discard: [{ count: 1, element: 'deploy' }] },
    target: 'one-opponent',
    effects: [{ kind: 'damage', amount: 3, to: 'targets' }],
    incantation: 'ci: pipeline เขียวทุกอัน (ไม่จริง)',
    copies: 2
  },
  {
    ...original,
    id: 'hot-reload',
    name: 'Hot Reload',
    description: 'ตี 2 แล้วจั่ว 1',
    type: 'offensive',
    element: 'deploy',
    cost: { mana: 2 },
    target: 'one-opponent',
    effects: [
      { kind: 'damage', amount: 2, to: 'targets' },
      { kind: 'draw', count: 1, to: 'self' }
    ],
    incantation: 'เซฟแล้วเห็นผลทันที ไม่ต้อง restart',
    copies: 2
  },
  {
    ...original,
    id: 'load-test',
    name: 'Load Test',
    description: 'ตีทุกคน 1 และทิ้งการ์ดคนละ 1 ใบ',
    type: 'offensive',
    element: 'deploy',
    cost: { mana: 4 },
    target: 'all-opponents',
    effects: [
      { kind: 'damage', amount: 1, to: 'all-opponents' },
      { kind: 'discard', count: 1, to: 'all-opponents' }
    ],
    incantation: 'ยิงสิบล้าน request พร้อมกัน!',
    copies: 1
  },

  /* ═════════ DEFENSIVE (play out of turn, in response) ═════════ */
  {
    ...original,
    id: 'try-catch',
    name: 'try / catch',
    description: 'กันโจมตีหรือ curse',
    type: 'defensive',
    cost: { mana: 1 },
    target: 'none',
    respondsTo: ['offensive', 'curse'],
    effects: [{ kind: 'counter' }],
    incantation: 'catch (e) { /* ไม่เป็นไร */ }',
    copies: 4
  },
  {
    ...original,
    id: 'rollback',
    name: 'Rollback',
    description: 'กันการ์ดที่ใส่คุณ แล้วฟื้น 1',
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
    ...original,
    id: 'firewall',
    name: 'Firewall',
    description: 'กันโจมตี',
    type: 'defensive',
    cost: { mana: 1 },
    target: 'none',
    respondsTo: ['offensive'],
    effects: [{ kind: 'counter' }],
    incantation: 'DROP ทุก packet!',
    copies: 3
  },
  {
    ...original,
    id: 'code-review',
    name: 'Code Review',
    description: 'กัน curse แล้วจั่ว 1',
    type: 'defensive',
    cost: { mana: 1 },
    target: 'none',
    respondsTo: ['curse'],
    effects: [
      { kind: 'counter' },
      { kind: 'draw', count: 1, to: 'self' }
    ],
    incantation: 'Request changes: ไม่ผ่านนะครับ',
    copies: 2
  },
  {
    ...original,
    id: 'feature-flag',
    name: 'Feature Flag',
    description: 'กันโจมตีหรือ curse แล้ว +2 Shot Stack',
    type: 'defensive',
    cost: { mana: 2 },
    target: 'none',
    respondsTo: ['offensive', 'curse'],
    effects: [
      { kind: 'counter' },
      { kind: 'gainMana', amount: 2, to: 'self' }
    ],
    incantation: 'if (flag.off) return; // ปิดไว้ก่อน',
    copies: 1
  },
  {
    ...original,
    id: 'force-push',
    name: 'Force Push',
    description: 'ยกเลิกการ์ดป้องกันที่กันคุณ',
    type: 'defensive',
    cost: { mana: 2 },
    target: 'none',
    respondsTo: ['defensive'],
    effects: [{ kind: 'counter' }],
    incantation: 'git push --force (ไม่ถามใคร)',
    copies: 2
  },

  /* ═════════ SUPPORT ═════════ */
  {
    ...original,
    id: 'copilot',
    name: 'Copilot',
    description: 'จั่ว 2',
    type: 'support',
    cost: { mana: 1 },
    target: 'self',
    effects: [{ kind: 'draw', count: 2, to: 'self' }],
    incantation: 'Tab Tab Tab Tab',
    copies: 3
  },
  {
    ...original,
    id: 'rubber-duck',
    name: 'Rubber Duck',
    description: 'ฟื้น 3',
    type: 'support',
    cost: { mana: 1 },
    target: 'self',
    effects: [{ kind: 'heal', amount: 3, to: 'self' }],
    incantation: 'อ๋อ… เข้าใจแล้ว (เป็ดไม่ได้พูดอะไร)',
    copies: 3
  },
  {
    ...original,
    id: 'pair-programming',
    name: 'Pair Programming',
    description: 'ฟื้น 2 แล้วจั่ว 1',
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
    ...original,
    id: 'context-switch',
    name: 'Context Switch',
    description: 'สลับการ์ดในมือกับ 1 คน',
    type: 'support',
    cost: { mana: 2 },
    target: 'one-opponent',
    effects: [{ kind: 'swapHands' }],
    incantation: 'เดี๋ยวๆ ลูกค้าโทรมา สลับงานก่อน',
    copies: 2
  },
  {
    ...original,
    id: 'happy-hour',
    name: 'Happy Hour',
    description: 'ซดได้ Shot Stack +1 เพิ่ม (3 เทิร์น)',
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
  {
    ...original,
    id: 'google-it',
    name: 'Google It',
    description: 'ทิ้ง 1 แล้วจั่ว 3',
    type: 'support',
    cost: { mana: 1, discard: [{ count: 1 }] },
    target: 'self',
    effects: [{ kind: 'draw', count: 3, to: 'self' }],
    incantation: 'มีคนเคยถามแล้วแน่ๆ ใน Stack Overflow',
    copies: 2
  },
  {
    ...original,
    id: 'refactor',
    name: 'Refactor',
    description: 'ฟื้น 4',
    type: 'support',
    cost: { mana: 2 },
    target: 'self',
    effects: [{ kind: 'heal', amount: 4, to: 'self' }],
    incantation: 'refactor: โค้ดเดิมแต่สะอาดขึ้น (ทำงานเหมือนเดิม)',
    copies: 1
  },
  {
    ...original,
    id: 'standup-meeting',
    name: 'Standup Meeting',
    description: 'ทุกคนจั่ว 1',
    type: 'support',
    cost: { mana: 1 },
    target: 'all-players',
    effects: [{ kind: 'draw', count: 1, to: 'all-players' }],
    incantation: 'เมื่อวานทำอะไร วันนี้ทำอะไร มีปัญหาอะไร',
    copies: 1
  },

  /* ═════════ CURSES ═════════ */
  {
    ...original,
    id: 'memory-leak',
    name: 'Memory Leak',
    description: 'เป้าหมาย -3 Shot Stack',
    type: 'curse',
    cost: { mana: 2 },
    target: 'one-opponent',
    effects: [{ kind: 'loseMana', amount: 3, to: 'targets' }],
    incantation: 'heap out of memory!',
    copies: 3
  },
  {
    ...original,
    id: 'technical-debt',
    name: 'Technical Debt',
    description: 'เป้าหมายโดนตีแรงขึ้น 1 (3 เทิร์น)',
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
    ...original,
    id: 'scope-creep',
    name: 'Scope Creep',
    description: 'เป้าหมายทิ้งการ์ด 2 ใบ',
    type: 'curse',
    cost: { mana: 2 },
    target: 'one-opponent',
    effects: [{ kind: 'discard', count: 2, to: 'targets' }],
    incantation: 'อีกนิดเดียวเอง ขอเพิ่มอีกฟีเจอร์',
    copies: 2
  },
  {
    ...original,
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
    incantation: 'ขอแค่ 5 นาที… (3 ชั่วโมงต่อมา)',
    copies: 1
  },
  {
    ...original,
    id: 'legacy-code',
    name: 'Legacy Code',
    description: '-1 Shot Stack และถือการ์ด -1 ใบ (3 เทิร์น)',
    type: 'curse',
    cost: { mana: 2 },
    target: 'one-opponent',
    effects: [
      { kind: 'loseMana', amount: 1, to: 'targets' },
      {
        kind: 'status',
        to: 'targets',
        status: { id: 'legacy', name: 'Legacy Code', modifiers: [{ stat: 'handLimit', delta: -1 }], turns: 3 }
      }
    ],
    incantation: 'ห้ามแตะ ไม่มีใครรู้ว่ามันทำงานยังไง',
    copies: 2
  },
  {
    ...original,
    id: 'imposter-syndrome',
    name: 'Imposter Syndrome',
    description: 'เป้าหมายตีเบาลง 1 (3 เทิร์น)',
    type: 'curse',
    cost: { mana: 2 },
    target: 'one-opponent',
    effects: [
      {
        kind: 'status',
        to: 'targets',
        status: { id: 'imposter', name: 'Imposter Syndrome', modifiers: [{ stat: 'damageDealt', delta: -1 }], turns: 3 }
      }
    ],
    incantation: 'เราเก่งพอจริงๆ เหรอ…',
    copies: 1
  },
  {
    ...original,
    id: 'spilled-coffee',
    name: 'Spilled Coffee',
    description: 'ทำลาย Artifact 1 ชิ้น',
    type: 'curse',
    cost: { mana: 2 },
    target: 'artifact',
    effects: [{ kind: 'destroyArtifact' }],
    incantation: 'อุ๊ย! กาแฟหกใส่คีย์บอร์ด',
    copies: 2
  },

  /* ═════════ ARTIFACTS (stay on the table) ═════════ */
  {
    ...original,
    id: 'mechanical-keyboard',
    name: 'Mechanical Keyboard',
    description: 'ซดได้ Shot Stack +1 เพิ่ม',
    type: 'artifact',
    cost: { mana: 2 },
    target: 'none',
    effects: [],
    modifiers: [{ stat: 'potionYield', delta: 1 }],
    incantation: 'clack clack clack',
    copies: 2
  },
  {
    ...original,
    id: 'ultrawide-monitor',
    name: 'Ultrawide Monitor',
    description: 'ถือการ์ดได้ +1 ใบ',
    type: 'artifact',
    cost: { mana: 2 },
    target: 'none',
    effects: [],
    modifiers: [{ stat: 'handLimit', delta: 1 }],
    incantation: 'เห็น code ทีเดียว 3 ไฟล์',
    copies: 2
  },
  {
    ...original,
    id: 'gaming-chair',
    name: 'Gaming Chair',
    description: 'โดนตีเบาลง 1 ทุกครั้ง',
    type: 'artifact',
    cost: { mana: 3 },
    target: 'none',
    effects: [],
    modifiers: [{ stat: 'damageTaken', delta: -1 }],
    incantation: 'ปรับเอนหลัง 135 องศา',
    copies: 1
  },
  {
    ...original,
    id: 'senior-badge',
    name: "Senior's Badge",
    description: 'ตีแรงขึ้น 1 ทุกครั้ง',
    type: 'artifact',
    cost: { mana: 3 },
    target: 'none',
    effects: [],
    modifiers: [{ stat: 'damageDealt', delta: 1 }],
    incantation: 'ผมทำระบบนี้มา 10 ปีแล้วครับ',
    copies: 1
  },

  /* ═════════ INCIDENTS (resolve the moment they are drawn) ═════════ */
  {
    ...original,
    id: 'prod-down',
    name: 'Prod Down!',
    description: 'ทุกคน -1 Uptime',
    type: 'event',
    cost: { mana: 0 },
    target: 'all-players',
    effects: [{ kind: 'damage', amount: 1, to: 'all-players' }],
    copies: 2
  },
  {
    ...original,
    id: 'critical-incident',
    name: 'Critical Incident',
    description: 'ทุกคน -2 Uptime',
    type: 'event',
    cost: { mana: 0 },
    target: 'all-players',
    effects: [{ kind: 'damage', amount: 2, to: 'all-players' }],
    copies: 1
  },
  {
    ...original,
    id: 'free-pizza',
    name: 'Free Pizza',
    description: 'ทุกคนฟื้น 2',
    type: 'event',
    cost: { mana: 0 },
    target: 'all-players',
    effects: [{ kind: 'heal', amount: 2, to: 'all-players' }],
    copies: 1
  },
  {
    ...original,
    id: 'requirement-change',
    name: 'Requirement Change',
    description: 'ทุกคนทิ้งการ์ด 1 ใบ',
    type: 'event',
    cost: { mana: 0 },
    target: 'all-players',
    effects: [{ kind: 'discard', count: 1, to: 'all-players' }],
    copies: 1
  },
  {
    ...original,
    id: 'team-building',
    name: 'Team Building',
    description: 'ทุกคน +2 Shot Stack',
    type: 'event',
    cost: { mana: 0 },
    target: 'all-players',
    effects: [{ kind: 'gainMana', amount: 2, to: 'all-players' }],
    copies: 1
  },
  {
    ...original,
    id: 'freeze-week',
    name: 'Freeze Week',
    description: 'ทุกคนถือการ์ด -1 ใบ (4 เทิร์น)',
    type: 'event',
    cost: { mana: 0 },
    target: 'all-players',
    effects: [],
    modifiers: [{ stat: 'handLimit', delta: -1 }],
    duration: { turns: 4 },
    copies: 1
  },
  {
    ...original,
    id: 'server-migration',
    name: 'Server Migration',
    description: 'ทุกคน -1 Shot Stack',
    type: 'event',
    cost: { mana: 0 },
    target: 'all-players',
    effects: [{ kind: 'loseMana', amount: 1, to: 'all-players' }],
    copies: 1
  },
  {
    ...original,
    id: 'bug-bash',
    name: 'Bug Bash',
    description: 'ทุกคน -1 Uptime แล้วจั่ว 1',
    type: 'event',
    cost: { mana: 0 },
    target: 'all-players',
    effects: [
      { kind: 'damage', amount: 1, to: 'all-players' },
      { kind: 'draw', count: 1, to: 'all-players' }
    ],
    copies: 1
  },

  /* ── house-rule cards (H3): not in the original game, removed when the room turns "houseCards" off ── */
  {
    ...original,
    house: true,
    id: 'coffee-break',
    name: 'Coffee Break',
    description: 'พักเกม 10 นาที กดเลิกพักก่อนได้',
    type: 'support',
    cost: { mana: 0 },
    target: 'none',
    effects: [{ kind: 'interlude', mode: 'pause' }],
    incantation: 'brb ไปชงกาแฟแป๊บ',
    copies: 2
  },
  {
    ...original,
    house: true,
    id: 'hackathon',
    name: 'Hackathon',
    description: 'มินิเกมทั้งวง คนแพ้ดื่ม 1 ช็อต -3 Shot Stack',
    type: 'support',
    cost: { mana: 1 },
    target: 'none',
    effects: [{ kind: 'interlude', mode: 'minigame' }],
    incantation: 'ทุกคนวางเมาส์ แล้วมาเล่นเกมกัน!',
    copies: 4
  },
  {
    ...original,
    house: true,
    id: 'git-blame',
    name: 'git blame',
    description: 'เป้าหมายดื่ม 1 ช็อต และ -3 Shot Stack',
    type: 'curse',
    cost: { mana: 1 },
    target: 'one-opponent',
    effects: [{ kind: 'penaltyDrink', manaLoss: 3, to: 'targets' }],
    incantation: 'บรรทัดนี้ใครเขียน? ดื่มซะ!',
    copies: 4
  },
  {
    ...original,
    house: true,
    id: 'last-call',
    name: 'Last Call',
    description: 'สุ่มคำสั่งดื่ม ใครโดนดื่ม 1 ช็อต',
    type: 'event',
    cost: { mana: 0 },
    target: 'all-players',
    effects: [{ kind: 'interlude', mode: 'drinkcall' }],
    copies: 8
  }
]
