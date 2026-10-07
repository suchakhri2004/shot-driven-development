// How many cards should a table of N players use, per mode? Writes packages/cards/src/deck-plan.ts.
//   npx tsx scripts/analyze-deck.ts [gamesPerCell]
// Every (mode, players) cell runs in its own process, several at a time (one per CPU core, minus one).
//
// Method: random bots play many games per (mode, players). We count the cards a game actually uses
// (starting hands + every draw, Incidents included) and size the deck to the median of that, so a
// typical game goes through the deck about once: every card gets its chance and drink calls show up
// at the rate the mode intends. Never below 60 cards (enough for one copy of every card type).
// A second run with the resized deck measures what the lobby shows (turns, shots, drink calls).
// Bots are not people: treat the numbers as estimates.
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { cpus } from 'node:os'
import { fileURLToPath } from 'node:url'
import { createGame, dispatch } from '../packages/engine/src'
import type { CardDef, GameConfig } from '../packages/engine/src'
import { nextRandomMove } from '../packages/engine/test/random-player'
import { MODES, modeDeck, resizeDeck, tableConfig } from '../packages/cards/src/modes'
import type { GameMode } from '../packages/cards/src/modes'

// a child process gets: --cell <mode> <players> <games>
const GAMES = Number((process.argv[2] === '--cell' ? process.argv[5] : process.argv[2]) ?? 150)
/** Big tables play long games; half as many is plenty for a median. */
const gamesFor = (players: number) => (players >= 7 ? Math.ceil(GAMES / 2) : GAMES)
const MIN_DECK = 60
const NAMES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']

interface Result {
  cardsUsed: number
  turns: number
  shots: number
  drinkCalls: number
}

function play(cards: CardDef[], config: Partial<GameConfig>, players: number, seed: number): Result | null {
  let s = createGame({
    players: NAMES.slice(0, players).map((id) => ({
      id,
      name: id,
      avatar: 'a'
    })),
    cards,
    config,
    seed: `plan-${seed}`
  })
  const rng = { rng: seed * 7919 + 13 }
  let cardsUsed = players * s.config.startHand
  let drinkCalls = 0
  let actionsThisTurn = 0
  let lastTurn = s.turnNumber
  for (let i = 0; i < 8000 && !s.finished; i++) {
    if (s.turnNumber !== lastTurn) ((lastTurn = s.turnNumber), (actionsThisTurn = 0))
    const move = nextRandomMove(s, rng, actionsThisTurn)
    let r = dispatch(s, move.playerId, move.action)
    actionsThisTurn++
    if (!r.ok) {
      r = dispatch(s, s.activeId, { type: 'finish_turn' })
      if (!r.ok && s.pending?.kind === 'response') r = dispatch(s, s.pending.eligible[0], { type: 'pass_response' })
      if (!r.ok) continue
    }
    for (const fx of r.fx) {
      if (fx.kind === 'draw' || fx.kind === 'event') cardsUsed++
      if (fx.kind === 'interlude' && fx.mode === 'drinkcall') drinkCalls++
    }
    s = r.state
  }
  if (!s.finished) return null
  const shots = s.players.reduce((n, p) => n + p.potionsDrunk, 0) / players
  return { cardsUsed, turns: s.turnNumber, shots, drinkCalls }
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const round1 = (x: number) => Math.round(x * 10) / 10

function run(cards: CardDef[], config: Partial<GameConfig>, players: number): Result[] {
  return Array.from({ length: gamesFor(players) }, (_, i) => play(cards, config, players, i + 1)).filter(
    (r): r is Result => !!r
  )
}

/** One cell: play the games, size the deck, measure again with that deck. Printed as JSON for the parent. */
function analyzeCell(mode: GameMode, players: number) {
  const full = modeDeck(mode)
  const config = tableConfig(mode, players)
  const first = run(full, config, players)
  const deckSize = Math.max(MIN_DECK, Math.round(median(first.map((r) => r.cardsUsed)) / 4) * 4)
  const second = run(resizeDeck(full, deckSize), config, players)
  return {
    deckSize,
    turns: median(second.map((r) => r.turns)),
    shotsPerPlayer: round1(mean(second.map((r) => r.shots))),
    drinkCalls: round1(mean(second.map((r) => r.drinkCalls)))
  }
}

if (process.argv[2] === '--cell') {
  console.log(JSON.stringify(analyzeCell(process.argv[3] as GameMode, Number(process.argv[4]))))
  process.exit(0)
}

/** Run one cell in a child process (same tsx loader) and read its JSON line. */
function runCell(mode: GameMode, players: number): Promise<object> {
  return new Promise((resolve, reject) => {
    const args = [...process.execArgv, fileURLToPath(import.meta.url), '--cell', mode, String(players), String(GAMES)]
    const child = spawn(process.execPath, args, {
      stdio: ['ignore', 'pipe', 'inherit']
    })
    let out = ''
    child.stdout.on('data', (d) => (out += d))
    child.on('exit', (code) => {
      if (code !== 0) return reject(new Error(`${mode} ${players}p failed (exit ${code})`))
      resolve(JSON.parse(out.trim().split('\n').at(-1)!))
    })
  })
}

async function main() {
  const cells = MODES.flatMap((m) => Array.from({ length: 9 }, (_, i) => ({ mode: m.id, players: i + 2 })))
  const plan: Record<string, Record<number, object>> = Object.fromEntries(MODES.map((m) => [m.id, {}]))
  const workers = Math.max(1, cpus().length - 1)
  let next = 0
  await Promise.all(
    Array.from({ length: workers }, async () => {
      while (next < cells.length) {
        const { mode, players } = cells[next++]
        const row = await runCell(mode, players)
        plan[mode][players] = row
        console.log(`${mode.padEnd(8)} ${players}p ->`, JSON.stringify(row))
      }
    })
  )
  for (const mode of Object.keys(plan))
    plan[mode] = Object.fromEntries(Object.entries(plan[mode]).sort((a, b) => Number(a[0]) - Number(b[0])))

  const body = JSON.stringify(plan, null, 2)
    .replace(/"(\w+)":/g, '$1:')
    .replace(/"/g, "'")
  writeFileSync(
    new URL('../packages/cards/src/deck-plan.ts', import.meta.url),
    `// Generated by scripts/analyze-deck.ts (${GAMES} bot games per cell). Do not edit by hand: change the deck or
// the modes and rerun it. Numbers come from random bots, so read them as estimates.
import type { GameMode } from './modes'

export interface DeckPlanRow {
  /** Cards in the deck for this table size. */
  deckSize: number
  /** Median number of turns in a game. */
  turns: number
  /** Average shots per player (drinks + penalty drinks; opening shot included). */
  shotsPerPlayer: number
  /** Average number of Last Call drink calls per game. */
  drinkCalls: number
}

export const DECK_PLAN: Partial<Record<GameMode, Record<number, DeckPlanRow>>> = ${body}
`
  )
  console.log('wrote packages/cards/src/deck-plan.ts')
}

void main()
