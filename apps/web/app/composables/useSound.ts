/**
 * All audio is synthesized with WebAudio at runtime, so the game ships no sound files (nothing to
 * download, no licensing questions). Two parts:
 *   1. one-shot sound effects (`play`)
 *   2. an optional procedural lo-fi background loop (`toggleMusic`)
 * Browsers only allow audio after a user gesture; `unlock()` is called from the first tap.
 */

type Out = { ctx: AudioContext; bus: AudioNode; noise: AudioBuffer }

/* ───────────────────────── tiny synth toolkit ───────────────────────── */

interface ToneOptions {
  type?: OscillatorType
  gain?: number
  slideTo?: number
  attack?: number
  lowpass?: number
}

function tone({ ctx, bus }: Out, freq: number, at: number, dur: number, o: ToneOptions = {}): void {
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()
  osc.type = o.type ?? 'sine'
  osc.frequency.setValueAtTime(freq, at)
  if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, at + dur)
  const peak = o.gain ?? 0.2
  amp.gain.setValueAtTime(0.0001, at)
  amp.gain.exponentialRampToValueAtTime(peak, at + (o.attack ?? 0.008))
  amp.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  let node: AudioNode = osc
  if (o.lowpass) {
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = o.lowpass
    osc.connect(filter)
    node = filter
  }
  node.connect(amp).connect(bus)
  osc.start(at)
  osc.stop(at + dur + 0.05)
}

interface NoiseOptions {
  filter?: BiquadFilterType
  freq?: number
  sweepTo?: number
  q?: number
  gain?: number
  attack?: number
}

function noise({ ctx, bus, noise: buffer }: Out, at: number, dur: number, o: NoiseOptions = {}): void {
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.loop = true
  const filter = ctx.createBiquadFilter()
  filter.type = o.filter ?? 'bandpass'
  filter.frequency.setValueAtTime(o.freq ?? 1000, at)
  if (o.sweepTo) filter.frequency.exponentialRampToValueAtTime(o.sweepTo, at + dur)
  filter.Q.value = o.q ?? 1
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(0.0001, at)
  amp.gain.exponentialRampToValueAtTime(o.gain ?? 0.2, at + (o.attack ?? 0.01))
  amp.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  src.connect(filter).connect(amp).connect(bus)
  src.start(at)
  src.stop(at + dur + 0.05)
}

/** A glass "clink": a few inharmonic high partials that die away quickly. */
function clink(out: Out, at: number, pitch = 1, gain = 0.16): void {
  for (const [ratio, level, dur] of [
    [1, 1, 0.35],
    [1.51, 0.7, 0.28],
    [2.32, 0.5, 0.2],
    [3.1, 0.3, 0.14]
  ] as const) {
    tone(out, 2200 * pitch * ratio, at, dur, { gain: gain * level, attack: 0.002 })
  }
  noise(out, at, 0.03, { filter: 'highpass', freq: 5000, gain: gain * 0.6, attack: 0.001 })
}

/* ───────────────────────── sound effects ───────────────────────── */

const effects = {
  tap: (o: Out, t: number) => tone(o, 760, t, 0.04, { gain: 0.08 }),

  /** pour + glass touch + gulp */
  drink: (o: Out, t: number) => {
    noise(o, t, 0.4, { freq: 700, sweepTo: 2200, q: 2, gain: 0.07, attack: 0.08 })
    clink(o, t + 0.28, 1, 0.14)
    tone(o, 200, t + 0.5, 0.13, { type: 'sine', gain: 0.2, slideTo: 85 })
    tone(o, 170, t + 0.66, 0.11, { type: 'sine', gain: 0.16, slideTo: 80 })
  },

  cheers: (o: Out, t: number) => {
    clink(o, t, 1, 0.2)
    clink(o, t + 0.05, 1.18, 0.16)
    clink(o, t + 0.12, 0.88, 0.16)
    noise(o, t + 0.1, 0.5, { freq: 3500, q: 0.6, gain: 0.03, attack: 0.1 })
  },

  cast: (o: Out, t: number) => {
    noise(o, t, 0.4, { freq: 300, sweepTo: 3200, q: 1.5, gain: 0.12, attack: 0.15 })
    tone(o, 220, t, 0.4, { type: 'sawtooth', gain: 0.06, slideTo: 880, lowpass: 2400 })
  },

  damage: (o: Out, t: number) => {
    tone(o, 130, t, 0.28, { gain: 0.34, slideTo: 38, attack: 0.003 })
    noise(o, t, 0.16, { filter: 'lowpass', freq: 900, sweepTo: 120, gain: 0.3, attack: 0.002 })
    tone(o, 90, t, 0.18, { type: 'sawtooth', gain: 0.07, slideTo: 50, lowpass: 400 })
  },

  heal: (o: Out, t: number) => {
    ;[660, 880, 1320].forEach((f, i) => tone(o, f, t + i * 0.09, 0.32, { gain: 0.12, attack: 0.01 }))
  },

  counter: (o: Out, t: number) => {
    tone(o, 520, t, 0.22, { type: 'square', gain: 0.1, lowpass: 3000 })
    tone(o, 780, t + 0.07, 0.3, { type: 'square', gain: 0.1, lowpass: 3000 })
    noise(o, t, 0.05, { filter: 'highpass', freq: 4000, gain: 0.12 })
  },

  turn: (o: Out, t: number) => {
    tone(o, 880, t, 0.28, { gain: 0.16 })
    tone(o, 1174, t + 0.13, 0.4, { gain: 0.15 })
  },

  /** siren: two up/down sweeps */
  event: (o: Out, t: number) => {
    for (let i = 0; i < 2; i++) {
      tone(o, 600, t + i * 0.5, 0.25, { type: 'sawtooth', gain: 0.1, slideTo: 960, lowpass: 2600 })
      tone(o, 960, t + i * 0.5 + 0.25, 0.25, { type: 'sawtooth', gain: 0.1, slideTo: 600, lowpass: 2600 })
    }
  },

  /** crash: falling tone + crackle */
  out: (o: Out, t: number) => {
    tone(o, 420, t, 0.7, { type: 'sawtooth', gain: 0.2, slideTo: 40, lowpass: 1800 })
    noise(o, t, 0.6, { filter: 'highpass', freq: 2500, gain: 0.12, attack: 0.02 })
    noise(o, t + 0.1, 0.4, { filter: 'bandpass', freq: 160, q: 0.8, gain: 0.25 })
  },

  win: (o: Out, t: number) => {
    ;[523, 659, 784, 1046].forEach((f, i) => tone(o, f, t + i * 0.13, 0.5, { type: 'triangle', gain: 0.2 }))
    tone(o, 1046, t + 0.55, 0.9, { type: 'triangle', gain: 0.18 })
    clink(o, t + 0.55, 1.1, 0.14)
    clink(o, t + 0.75, 0.9, 0.12)
  }
}

export type SoundName = keyof typeof effects

/* ───────────────────────── background music ───────────────────────── */

/**
 * Procedural lo-fi loop (A minor, ~80 bpm): soft pad, bass, kick/snare/hat, and a sparse
 * pentatonic melody. Notes are scheduled slightly ahead of the audio clock from a 100ms timer.
 */
const BPM = 80
const STEP = 60 / BPM / 4 // one 16th note
const LOOKAHEAD = 0.4
const mtof = (midi: number) => 440 * 2 ** ((midi - 69) / 12)

const PROGRESSION = [
  { bass: 45, chord: [57, 60, 64, 67] }, // Am7
  { bass: 41, chord: [53, 57, 60, 64] }, // Fmaj7
  { bass: 48, chord: [55, 60, 64, 67] }, // Cmaj7
  { bass: 43, chord: [55, 59, 62, 65] } // G7
]
const PENTATONIC = [69, 72, 74, 76, 79, 81] // A minor pentatonic

let musicTimer: ReturnType<typeof setInterval> | null = null
let nextStep = 0
let stepIndex = 0

function scheduleStep(out: Out, t: number, index: number): void {
  const bar = Math.floor(index / 16) % PROGRESSION.length
  const step = index % 16
  const { bass, chord } = PROGRESSION[bar]

  if (step === 0) {
    for (const note of chord) tone(out, mtof(note), t, STEP * 15, { type: 'triangle', gain: 0.035, attack: 0.25, lowpass: 900 })
  }
  if (step === 0 || step === 10) tone(out, mtof(bass), t, STEP * 5, { type: 'sine', gain: 0.22, attack: 0.01, lowpass: 400 })
  if (step === 0 || step === 8) tone(out, 130, t, 0.18, { gain: 0.3, slideTo: 42, attack: 0.002 }) // kick
  if (step === 4 || step === 12) noise(out, t, 0.14, { filter: 'bandpass', freq: 1800, q: 0.7, gain: 0.07, attack: 0.002 }) // snare
  if (step % 2 === 0) noise(out, t + (step % 4 === 2 ? STEP * 0.25 : 0), 0.04, { filter: 'highpass', freq: 7000, gain: 0.025, attack: 0.001 }) // swung hat
  if ((step === 6 || step === 14 || step === 3) && Math.random() < 0.45) {
    tone(out, mtof(PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)]), t, STEP * 3, { type: 'sine', gain: 0.07, attack: 0.01 })
  }
}

/* ───────────────────────── composable ───────────────────────── */

const muted = ref(false)
const music = ref(false)
let context: AudioContext | null = null
let sfxBus: GainNode | null = null
let musicBus: GainNode | null = null
let noiseBuffer: AudioBuffer | null = null
let loaded = false

function load() {
  if (loaded || !import.meta.client) return
  loaded = true
  muted.value = localStorage.getItem('sdd.muted') === '1'
  music.value = localStorage.getItem('sdd.music') === '1'
}

function ensureContext(): boolean {
  if (!import.meta.client) return false
  if (!context) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    context = new Ctor()
    sfxBus = context.createGain()
    sfxBus.gain.value = 0.9
    sfxBus.connect(context.destination)

    // music is softer and rounded off, like a lo-fi tape
    musicBus = context.createGain()
    musicBus.gain.value = 0.55
    const tape = context.createBiquadFilter()
    tape.type = 'lowpass'
    tape.frequency.value = 3200
    musicBus.connect(tape).connect(context.destination)

    const length = context.sampleRate * 2
    noiseBuffer = context.createBuffer(1, length, context.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  }
  return true
}

function musicShouldPlay(): boolean {
  return music.value && !muted.value && !!context && context.state === 'running' && !document.hidden
}

function syncMusic() {
  const want = musicShouldPlay()
  if (want && !musicTimer && context && musicBus && noiseBuffer) {
    nextStep = context.currentTime + 0.1
    stepIndex = 0
    const out: Out = { ctx: context, bus: musicBus, noise: noiseBuffer }
    musicTimer = setInterval(() => {
      while (context && nextStep < context.currentTime + LOOKAHEAD) {
        scheduleStep(out, nextStep, stepIndex++)
        nextStep += STEP
      }
    }, 100)
  } else if (!want && musicTimer) {
    clearInterval(musicTimer)
    musicTimer = null
  }
}

if (import.meta.client) document.addEventListener('visibilitychange', syncMusic)

export function useSound() {
  load()

  function unlock() {
    if (!ensureContext() || !context) return
    if (context.state === 'suspended') void context.resume().then(syncMusic)
    else syncMusic()
  }

  function play(name: SoundName) {
    if (muted.value || !context || context.state !== 'running' || !sfxBus || !noiseBuffer) return
    effects[name]({ ctx: context, bus: sfxBus, noise: noiseBuffer }, context.currentTime + 0.01)
  }

  function toggleMute() {
    muted.value = !muted.value
    localStorage.setItem('sdd.muted', muted.value ? '1' : '0')
    syncMusic()
  }

  function toggleMusic() {
    music.value = !music.value
    localStorage.setItem('sdd.music', music.value ? '1' : '0')
    unlock()
    syncMusic()
  }

  function buzz(pattern: number | number[]) {
    if (!muted.value && 'vibrate' in navigator) navigator.vibrate(pattern)
  }

  return { muted, music, unlock, play, toggleMute, toggleMusic, buzz }
}
