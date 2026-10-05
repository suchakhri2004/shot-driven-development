import type { GameState, PlayerState } from './types'

/** Mana crystals live in a shared bank. `null` means unlimited. */
export function canDrink(s: GameState): boolean {
  return s.manaBank === null || s.manaBank > 0
}

/** Move mana from the bank to a player; returns how much was actually given. */
export function giveMana(s: GameState, player: PlayerState, amount: number): number {
  const given = s.manaBank === null ? amount : Math.min(amount, s.manaBank)
  player.mana += given
  if (s.manaBank !== null) s.manaBank -= given
  return given
}

/** Spent mana returns to the bank. */
export function spendMana(s: GameState, player: PlayerState, amount: number): void {
  player.mana -= amount
  if (s.manaBank !== null) s.manaBank += amount
}
