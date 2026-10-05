import type { Fx, GameState, LogEntry } from './types'

const MAX_LOG = 400

export function addLog(s: GameState, kind: string, data: Omit<LogEntry, 'seq' | 'turn' | 'kind'> = {}): void {
  s.log.push({ seq: s.logSeq++, turn: s.turnNumber, kind, ...data })
  if (s.log.length > MAX_LOG) s.log.splice(0, s.log.length - MAX_LOG)
}

/** Animation cue. Returned from dispatch(), never stored long-term. */
export function emit(s: GameState, fx: Fx): void {
  s.fx.push(fx)
}
