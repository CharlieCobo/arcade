/**
 * Lógica pura de Sigue la luz. Sin React ni audio.
 * Cada ronda la secuencia crece un paso; el jugador la repite (o al revés).
 */

export type Pad = 0 | 1 | 2 | 3
export type Mode = 'classic' | 'reverse'
export type Difficulty = 'relaxed' | 'strict'
/** showing: el juego enseña la secuencia · input: turno del jugador */
export type Status = 'showing' | 'input' | 'over'
export type Rng = () => number

export interface LightState {
  sequence: Pad[]
  /** Cuántos pasos de la ronda actual ha acertado ya el jugador */
  input: number
  mode: Mode
  difficulty: Difficulty
  lives: number
  status: Status
}

export type PressResult = 'ignored' | 'correct' | 'roundComplete' | 'wrong' | 'gameOver'

/** Verde, rojo, amarillo, azul (en el orden de las agujas del reloj desde arriba a la izquierda). */
export const PADS: Pad[] = [0, 1, 2, 3]
export const LIVES: Record<Difficulty, number> = { relaxed: 3, strict: 1 }

const randomPad = (rng: Rng): Pad => Math.min(3, Math.floor(rng() * 4)) as Pad

export function createGame(opts: { mode?: Mode; difficulty?: Difficulty } = {}, rng: Rng = Math.random): LightState {
  const difficulty = opts.difficulty ?? 'strict'
  return {
    sequence: [randomPad(rng)],
    input: 0,
    mode: opts.mode ?? 'classic',
    difficulty,
    lives: LIVES[difficulty],
    status: 'showing',
  }
}

/** El juego ha terminado de enseñar la secuencia: le toca al jugador. */
export const finishShowing = (s: LightState): LightState => (s.status === 'showing' ? { ...s, status: 'input', input: 0 } : s)

/** El botón que toca pulsar ahora. */
export function expected(s: LightState): Pad {
  const i = s.mode === 'classic' ? s.input : s.sequence.length - 1 - s.input
  return s.sequence[i]!
}

export function press(s: LightState, pad: Pad, rng: Rng = Math.random): { state: LightState; result: PressResult } {
  if (s.status !== 'input') return { state: s, result: 'ignored' }

  if (pad !== expected(s)) {
    const lives = s.lives - 1
    if (lives <= 0) return { state: { ...s, lives: 0, status: 'over' }, result: 'gameOver' }
    // Relajado: se repite la misma secuencia
    return { state: { ...s, lives, input: 0, status: 'showing' }, result: 'wrong' }
  }

  const input = s.input + 1
  if (input < s.sequence.length) return { state: { ...s, input }, result: 'correct' }

  // Ronda completada: un paso más
  return {
    state: { ...s, input: 0, sequence: [...s.sequence, randomPad(rng)], status: 'showing' },
    result: 'roundComplete',
  }
}

/** Rondas completadas (la puntuación). */
export const roundsCompleted = (s: LightState) => s.sequence.length - 1

/** Ronda actual, empezando en 1. */
export const currentRound = (s: LightState) => s.sequence.length

/**
 * Cuánto se ilumina cada paso al enseñar la secuencia (ms).
 * Como el original: se acelera a partir de los pasos 6, 10 y 14.
 */
export function stepDuration(length: number): number {
  if (length <= 5) return 560
  if (length <= 9) return 450
  if (length <= 13) return 360
  return 290
}

/** Pausa entre pasos (ms). */
export const stepGap = (length: number) => Math.round(stepDuration(length) * 0.35)
