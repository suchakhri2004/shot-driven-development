import { DECK } from './deck'
import { TEST_DECK } from './test-deck'

/** The deck used for real games. */
export { DECK }
/** Small deck used only by automated tests (stable ids, easy to reason about). */
export { TEST_DECK }
/** Real-life mini-games shown by the Hackathon card. */
export { MINI_GAMES } from './mini-games'
export type { MiniGame } from './mini-games'
/** Drink calls shown by the Last Call incident. */
export { DRINK_CALLS } from './drink-calls'
export type { DrinkCall } from './drink-calls'
/** Table modes and the deck each table size gets. */
export { buildDeck, DEFAULT_MODE, DUEL_HP, DUEL_PLAYERS, getMode, modeDeck, MODES, resizeDeck, tableConfig } from './modes'
export type { GameMode, ModeDef } from './modes'
export { DECK_PLAN } from './deck-plan'
export type { DeckPlanRow } from './deck-plan'
