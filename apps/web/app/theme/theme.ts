import type { CardDef, CardType, Element } from '@sdd/engine'
import { iconData } from './icon-data'

/**
 * Everything the player READS lives here: names, icons, colours, messages.
 * The engine only knows "mana", "hp" and "potion"; to re-theme the game, edit this file.
 */
export const theme = {
  gameName: 'SHOT-DRIVEN DEVELOPMENT',
  tagline: 'ซดก่อน ค่อย Debug',
  // `icon` values are names in icon-data.ts (see <GameIcon name="…">)
  hp: { name: 'Uptime', icon: 'hp' },
  mana: { name: 'Shot Stack', icon: 'shot' },
  drink: { button: 'sudo shot', verb: 'ซด' },
  rebase: { name: 'Rebase' },
  discardPile: '/dev/null',
  drawPile: 'Backlog',
  crashed: '503 CRASHED',
  overflow: 'STACK OVERFLOW',
  winner: 'LAST DEV STANDING',
  opening: { title: 'git init', subtitle: 'ชนแก้วก่อนเริ่ม! ทุกคนซดคนละ 1 ช็อต' }
}

export const avatars: Record<string, { icon: string; label: string; color: string }> = {
  frontend: { icon: 'av-frontend', label: 'Frontend', color: '#e3242b' },
  backend: { icon: 'av-backend', label: 'Backend', color: '#f3e7cc' },
  devops: { icon: 'av-devops', label: 'DevOps', color: '#ff6b6f' },
  qa: { icon: 'av-qa', label: 'QA', color: '#c9b8a8' },
  pm: { icon: 'av-pm', label: 'PM', color: '#b3161c' },
  designer: { icon: 'av-designer', label: 'Designer', color: '#ffb3b5' },
  junior: { icon: 'av-junior', label: 'Junior', color: '#e8d5c4' },
  senior: { icon: 'av-senior', label: 'Senior', color: '#d94a4f' }
}
export const avatarIds = Object.keys(avatars)
export const avatarIcon = (id: string) => avatars[id]?.icon ?? 'av-backend'
export const avatarColor = (id: string) => avatars[id]?.color ?? '#e3242b'

type Tone = 'fire' | 'ice' | 'bolt' | 'gold' | 'green' | 'violet' | 'red' | 'blue' | 'steel'

export const cardTypeStyle: Record<CardType, { label: string; color: string; icon: string; tone: Tone }> = {
  offensive: { label: 'Attack', color: '#ff5a3c', icon: 'attack', tone: 'red' },
  defensive: { label: 'Defend', color: '#38bdf8', icon: 'defend', tone: 'blue' },
  support: { label: 'Support', color: '#3fbfa3', icon: 'support', tone: 'green' },
  curse: { label: 'Curse', color: '#a855f7', icon: 'curse', tone: 'violet' },
  artifact: { label: 'Artifact', color: '#ffaa2b', icon: 'artifact', tone: 'gold' },
  event: { label: 'Incident', color: '#ff3b5c', icon: 'incident', tone: 'red' }
}

export const elementStyle: Record<Element, { label: string; color: string; icon: string; tone: Tone }> = {
  hotfix: { label: 'Hotfix', color: '#ff5a3c', icon: 'hotfix', tone: 'fire' },
  freeze: { label: 'Code Freeze', color: '#38bdf8', icon: 'freeze', tone: 'ice' },
  deploy: { label: 'Deploy', color: '#facc15', icon: 'deploy', tone: 'bolt' }
}

/** Name of the picture for a card: its own icon if it has one, otherwise the icon of its type. */
export function cardIcon(def?: CardDef): string {
  if (!def) return 'cards'
  return def.id in iconData ? def.id : cardTypeStyle[def.type].icon
}

/** Colour family of a card's picture: element first (fire/ice/lightning), then card type. */
export function cardTone(def: CardDef): Tone {
  return def.element ? elementStyle[def.element].tone : cardTypeStyle[def.type].tone
}

export function cardAccent(def: CardDef): string {
  return (def.element ? elementStyle[def.element].color : cardTypeStyle[def.type].color)
}

export function cardFileName(def: CardDef): string {
  return `${def.id}.ts`
}

/** Human description of a "discard X" part of a cost. */
export function describeCostDiscard(slot: { count: number; element?: Element; type?: CardType }): string {
  const what = slot.element ? elementStyle[slot.element].label : slot.type ? cardTypeStyle[slot.type].label : 'การ์ดใดก็ได้'
  return `ทิ้ง ${what} ×${slot.count}`
}

/** Thai messages for server/engine error codes. Unknown codes fall back to the raw code. */
const errors: Record<string, string> = {
  NOT_YOUR_TURN: 'ยังไม่ใช่เทิร์นของคุณ',
  WRONG_PHASE: 'ทำแบบนี้ไม่ได้ในช่วงนี้',
  DECISION_PENDING: 'ต้องตัดสินใจเรื่องที่ค้างอยู่ก่อน',
  NO_INTERLUDE: 'ตอนนี้ไม่ได้พักเกมอยู่',
  NOT_INTERLUDE_OWNER: 'คนเล่นการ์ดหรือเจ้าของห้องเท่านั้นที่กดจบได้',
  NO_DRINK_CALL: 'ตอนนี้ไม่มีคำสั่งดื่ม',
  ALREADY_TOOK_DRINK: 'คุณกดว่าดื่มไปแล้ว',
  INSUFFICIENT_MANA: 'Shot Stack ไม่พอ ลอง `sudo shot` ก่อน',
  CARD_NOT_IN_HAND: 'ไม่มีการ์ดใบนี้ในมือแล้ว',
  BAD_TARGET: 'เลือกเป้าหมายไม่ถูกต้อง',
  COST_CARDS_REQUIRED: 'ต้องเลือกการ์ดที่จะทิ้งเป็นค่าใช้จ่ายให้ครบ',
  COST_CARDS_MISMATCH: 'การ์ดที่เลือกทิ้งไม่ตรงเงื่อนไข',
  NOT_ELIGIBLE_TO_RESPOND: 'คุณตอบโต้ตอนนี้ไม่ได้',
  CANNOT_RESPOND_WITH_CARD: 'การ์ดใบนี้ใช้ตอบโต้ไม่ได้',
  DEFENSIVE_ONLY_IN_RESPONSE: 'การ์ดป้องกันใช้ได้ตอนถูกโจมตีเท่านั้น',
  EVENT_NOT_PLAYABLE: 'การ์ด Incident เล่นเองไม่ได้',
  ALREADY_DRANK: 'คุณซดช็อตเปิดเกมแล้ว รอคนอื่นก่อน',
  BANK_EMPTY: 'ไม่มี Shot เหลือในกองกลางแล้ว',
  ELIMINATED: 'คุณตกรอบแล้ว',
  GAME_FINISHED: 'เกมจบแล้ว',
  GAME_NOT_STARTED: 'เกมยังไม่เริ่ม',
  BAD_DISCARD_CHOICE: 'เลือกการ์ดที่จะทิ้งให้ครบตามจำนวน',
  ROOM_NOT_FOUND: 'ไม่พบห้องนี้ ตรวจรหัสอีกครั้ง',
  ROOM_FULL: 'ห้องเต็มแล้ว (สูงสุด 10 คน)',
  ROOM_IN_PROGRESS: 'ห้องนี้เริ่มเล่นไปแล้ว',
  INVALID_SESSION: 'เข้าห้องเดิมไม่ได้ (เซสชันหมดอายุ)',
  HOST_ONLY: 'เฉพาะเจ้าของห้องเท่านั้น',
  NOT_ENOUGH_PLAYERS: 'ต้องมีผู้เล่นอย่างน้อย 2 คน',
  PLAYERS_NOT_READY: 'ยังมีผู้เล่นที่ไม่พร้อม',
  PLAYER_DISCONNECTED: 'มีผู้เล่นหลุดการเชื่อมต่อ',
  RATE_LIMITED: 'กดถี่เกินไป รอสักครู่',
  BAD_REQUEST: 'ข้อมูลไม่ถูกต้อง',
  NOT_IN_ROOM: 'คุณไม่ได้อยู่ในห้อง',
  OFFLINE: 'ขาดการเชื่อมต่อกับเซิร์ฟเวอร์',
  TIMEOUT: 'เซิร์ฟเวอร์ตอบช้า ลองอีกครั้ง'
}
export const errorText = (code: string) => errors[code] ?? code
