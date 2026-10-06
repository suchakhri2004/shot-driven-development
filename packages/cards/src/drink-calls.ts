/**
 * Drink calls for the Last Call incident (house rule H3). One is drawn at random and shown to the
 * whole table; everyone it applies to takes a real shot and presses "I drank" (no Shot Stack gained).
 * The engine stores a random `roll`; the client shows DRINK_CALLS[roll % DRINK_CALLS.length].
 * Some calls use what everyone can see on screen, the rest are about real life around the table.
 */
export interface DrinkCall {
  id: string
  /** Who drinks. Short enough to read from across the table. */
  text: string
}

export const DRINK_CALLS: DrinkCall[] = [
  // the whole table
  { id: 'cheers', text: 'Release สำเร็จ! ทุกคนชนแก้ว ดื่มพร้อมกัน' },
  { id: 'outage', text: 'Production ล่มทั้งระบบ ทุกคนดื่ม' },
  { id: 'friday', text: 'วันนี้ใครทำงานวันศุกร์มา ดื่ม (ถ้าวันนี้ไม่ใช่ศุกร์ ทุกคนดื่ม)' },

  // what the screen shows
  { id: 'lowest-uptime', text: 'คนที่ Uptime น้อยที่สุด ดื่ม (เสมอกันดื่มหมด)' },
  { id: 'highest-uptime', text: 'คนที่ Uptime มากที่สุด ดื่ม อย่าเพิ่งมั่นใจ' },
  { id: 'richest', text: 'คนที่ Shot Stack มากที่สุด ดื่ม' },
  { id: 'broke', text: 'คนที่ Shot Stack เป็น 0 ดื่ม' },
  { id: 'big-hand', text: 'คนที่ถือการ์ดมากที่สุด ดื่ม' },
  { id: 'most-shots', text: 'คนที่ซดมาเยอะที่สุดจนถึงตอนนี้ ดื่มอีก' },
  { id: 'fewest-shots', text: 'คนที่ซดมาน้อยที่สุด ดื่ม ตามเพื่อนให้ทัน' },
  { id: 'active', text: 'คนที่เป็นเทิร์นอยู่ ดื่ม' },
  { id: 'neighbours', text: 'คนที่นั่งซ้ายและขวาของคนที่เป็นเทิร์น ดื่ม' },
  { id: 'artifact', text: 'คนที่มี Artifact วางอยู่ ดื่ม' },
  { id: 'cursed', text: 'คนที่ติดสถานะอยู่ ดื่ม' },

  // dev life
  { id: 'black-shirt', text: 'คนใส่เสื้อสีดำ ทำ deploy แตก ดื่ม' },
  { id: 'glasses', text: 'คนที่ใส่แว่น จ้องจอเยอะ ดื่ม' },
  { id: 'last-commit', text: 'คนที่ commit ล่าสุด (เปิดดูได้) ดื่ม' },
  { id: 'light-mode', text: 'คนที่ใช้ light mode ดื่ม' },
  { id: 'tabs', text: 'คนที่ใช้ tab แทน space ดื่ม' },
  { id: 'console-log', text: 'คนที่ debug ด้วย console.log ดื่ม' },
  { id: 'meeting', text: 'คนที่วันนี้เข้าประชุมเกิน 2 ชั่วโมง ดื่ม' },
  { id: 'coffee', text: 'คนที่กินกาแฟวันนี้เกิน 2 แก้ว ดื่ม' },
  { id: 'late', text: 'คนที่มาถึงวงคนสุดท้าย ดื่ม' },
  { id: 'oncall', text: 'คนที่ต้อง on-call สัปดาห์นี้ ดื่มเผื่อไว้' },
  { id: 'stackoverflow', text: 'คนที่วันนี้เปิด Stack Overflow หรือถาม AI ดื่ม' },
  { id: 'mac', text: 'คนที่ใช้ Mac ดื่ม' },
  { id: 'windows', text: 'คนที่ใช้ Windows ดื่ม' },
  { id: 'vim', text: 'คนที่ออกจาก vim ไม่เป็น ดื่ม' },
  { id: 'friday-deploy', text: 'คนที่เคย deploy วันศุกร์ ดื่ม' },
  { id: 'force-push', text: 'คนที่เคย force push ทับงานเพื่อน ดื่ม' },
  { id: 'todo', text: 'คนที่มี TODO ค้างในโค้ดเกิน 1 เดือน ดื่ม' },
  { id: 'unread', text: 'คนที่มีแจ้งเตือนในแชทงานค้างอ่าน ดื่ม' },
  { id: 'phone', text: 'คนที่หยิบมือถือดูอย่างอื่นนอกจากเกมล่าสุด ดื่ม' },

  // around the table
  { id: 'youngest', text: 'คนที่อายุน้อยที่สุดในวง ดื่ม' },
  { id: 'oldest', text: 'คนที่อายุมากที่สุดในวง ดื่ม ประสบการณ์ต้องแลกมา' },
  { id: 'empty-glass', text: 'คนที่แก้วหมดก่อน ดื่ม (เติมแล้วดื่ม)' },
  { id: 'laugh', text: 'คนที่หัวเราะคนแรกหลังอ่านข้อความนี้ ดื่ม' },
  { id: 'point', text: 'นับ 3 แล้วทุกคนชี้คนที่เมาที่สุด คนที่โดนชี้มากที่สุด ดื่ม' },
  { id: 'pick-buddy', text: 'คนที่เป็นเทิร์นเลือกเพื่อน 1 คน ดื่มด้วยกัน' },
  { id: 'same-colour', text: 'คนที่ใส่เสื้อสีเดียวกับคนที่เป็นเทิร์น ดื่ม' }
]
