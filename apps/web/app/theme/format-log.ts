import type { CardDef, LogEntry } from '@sdd/engine'
import { theme } from './theme'

interface LogContext {
  nameOf: (playerId?: string) => string
  cards: Record<string, CardDef>
}

/** Turns a structured engine log entry into one readable line (icon + Thai text). */
export function formatLog(entry: LogEntry, { nameOf, cards }: LogContext): { icon: string; text: string } {
  const actor = nameOf(entry.actor)
  const target = nameOf(entry.target)
  const card = entry.card ? (cards[entry.card]?.name ?? entry.card) : ''
  const n = entry.amount ?? 0

  switch (entry.kind) {
    case 'game_start':
      return { icon: 'drink', text: `เริ่มเกม! ${actor} เริ่มก่อน` }
    case 'turn':
      return { icon: 'turn', text: `เทิร์นของ ${actor}` }
    case 'end_turn':
      return { icon: 'endturn', text: `${actor} จบเทิร์น` }
    case 'turn_skipped':
      return { icon: 'three-hour-meeting', text: `${target} ติดประชุม ข้ามเทิร์น` }
    case 'drink':
      return { icon: theme.mana.icon, text: `${actor} ${theme.drink.button} +${n}` }
    case 'play':
      return { icon: 'cards', text: entry.target ? `${actor} เล่น ${card} ใส่ ${target}` : `${actor} เล่น ${card}` }
    case 'damage':
      return { icon: 'attack', text: `${target} เสีย ${n} ${theme.hp.name}${card ? ` จาก ${card}` : ''}` }
    case 'heal':
      return { icon: 'support', text: `${target} ฟื้น ${n} ${theme.hp.name}` }
    case 'shortfall_hp':
      return { icon: 'hp', text: `${target} ${theme.mana.name} ไม่พอ เสีย ${n} ${theme.hp.name}` }
    case 'mana':
      return { icon: theme.mana.icon, text: `${target} ${n >= 0 ? '+' : ''}${n} ${theme.mana.name}` }
    case 'draw':
      return { icon: 'cards', text: `${target} จั่วการ์ด` }
    case 'discard':
      return { icon: 'trash', text: `${target} ทิ้งการ์ด ${n} ใบ` }
    case 'exchange':
      return { icon: 'rebase', text: `${actor} ${theme.rebase.name} (จ่าย ${n})` }
    case 'event':
      return { icon: 'incident', text: `INCIDENT: ${card}` }
    case 'event_expired':
      return { icon: 'sparkles', text: `${card} สิ้นสุดแล้ว` }
    case 'counter':
      return { icon: 'defend', text: `${actor} ป้องกันด้วย ${card}` }
    case 'fizzle':
      return { icon: 'sparkles', text: `${card} ของ ${actor} ไม่มีผล` }
    case 'status':
      return { icon: 'curse', text: `${target} ติดสถานะจาก ${card}` }
    case 'status_expired':
      return { icon: 'sparkles', text: `${target} หายจากสถานะ` }
    case 'swap_hands':
      return { icon: 'context-switch', text: `${actor} สลับมือกับ ${target}` }
    case 'artifact_destroyed':
      return { icon: 'artifact', text: `${card} ของ ${target} ถูกทำลาย` }
    case 'eliminated':
      return { icon: 'skull', text: `${target} ${entry.extra === 'ko' ? theme.overflow : theme.crashed}${n ? ` ดื่ม ${n} ช็อต` : ''}` }
    case 'reshuffle':
      return { icon: 'rebase', text: 'สับกอง /dev/null กลับมาเป็น Backlog' }
    case 'winner':
      return { icon: 'trophy', text: `${actor} คือ ${theme.winner}` }
    case 'pause_start':
      return { icon: 'coffee-break', text: `${actor} ขอพักเกม` }
    case 'pause_end':
      return { icon: 'play', text: 'เลิกพัก เล่นต่อ' }
    case 'minigame_start':
      return { icon: 'hackathon', text: `${actor} เปิดมินิเกม` }
    case 'minigame_end':
      return { icon: 'play', text: 'จบมินิเกม เล่นต่อ' }
    case 'penalty_drink':
      return { icon: 'drink', text: `${target} ดื่ม 1 ช็อต${n ? ` เสีย ${n} ${theme.mana.name}` : ''}` }
    case 'drinkcall_start':
      return { icon: 'last-call', text: 'Last Call! สุ่มคำสั่งดื่ม' }
    case 'drinkcall_end':
      return { icon: 'play', text: 'เล่นต่อ' }
    default:
      return { icon: 'sparkles', text: entry.kind }
  }
}
