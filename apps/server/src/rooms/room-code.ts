import { randomInt } from 'node:crypto'
import { ROOM_CODE_LENGTH } from '@sdd/protocol'

/** No 0/O or 1/I/L: codes get read aloud and typed on phones. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateRoomCode(isTaken: (code: string) => boolean): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = ''
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += ALPHABET[randomInt(ALPHABET.length)]
    if (!isTaken(code)) return code
  }
  throw new Error('could not generate a free room code')
}
