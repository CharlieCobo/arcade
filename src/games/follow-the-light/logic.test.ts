import { describe, expect, it } from 'vitest'
import {
  LIVES,
  createGame,
  currentRound,
  expected,
  finishShowing,
  press,
  roundsCompleted,
  stepDuration,
  stepGap,
  type Pad,
  type LightState,
} from './logic'

/** Generador que devuelve los botones indicados en orden. */
const seq = (...pads: Pad[]) => {
  let i = 0
  return () => (pads[i++ % pads.length]! + 0.5) / 4
}

/** Repite correctamente toda la ronda actual. */
function playRound(s: LightState, rng: () => number): LightState {
  let state = finishShowing(s)
  const n = state.sequence.length
  for (let i = 0; i < n; i++) state = press(state, expected(state), rng).state
  return state
}

describe('secuencia', () => {
  it('empieza con un paso y enseñándolo', () => {
    const s = createGame({}, seq(2))
    expect(s.sequence).toEqual([2])
    expect(s.status).toBe('showing')
    expect(currentRound(s)).toBe(1)
  })

  it('no se puede pulsar mientras el juego enseña la secuencia', () => {
    const s = createGame({}, seq(2))
    expect(press(s, 2).result).toBe('ignored')
  })

  it('al completar la ronda, la secuencia crece un paso y vuelve a enseñarse', () => {
    const rng = seq(1, 3)
    const s = playRound(createGame({}, rng), rng)
    expect(s.sequence).toEqual([1, 3])
    expect(s.status).toBe('showing')
    expect(roundsCompleted(s)).toBe(1)
  })

  it('cada acierto intermedio avanza sin terminar la ronda', () => {
    const rng = seq(0, 1, 2)
    let s = playRound(createGame({}, rng), rng) // [0, 1]
    s = finishShowing(s)
    const r = press(s, 0, rng)
    expect(r.result).toBe('correct')
    expect(r.state.input).toBe(1)
    expect(press(r.state, 1, rng).result).toBe('roundComplete')
  })
})

describe('modo al revés', () => {
  it('hay que repetir la secuencia empezando por el final', () => {
    const rng = seq(0, 3)
    let s = playRound(createGame({ mode: 'reverse' }, rng), rng) // [0, 3]
    s = finishShowing(s)
    expect(expected(s)).toBe(3)
    expect(press(s, 0, rng).result).not.toBe('correct') // en orden normal sería correcto
    const ok = press(s, 3, rng)
    expect(ok.result).toBe('correct')
    expect(press(ok.state, 0, rng).result).toBe('roundComplete')
  })
})

describe('dificultad', () => {
  it('estricto: el primer fallo acaba la partida', () => {
    const s = finishShowing(createGame({ difficulty: 'strict' }, seq(0)))
    const r = press(s, 1)
    expect(r.result).toBe('gameOver')
    expect(r.state.status).toBe('over')
  })

  it('relajado: al fallar se pierde una vida y se repite la misma secuencia', () => {
    const s = finishShowing(createGame({ difficulty: 'relaxed' }, seq(0)))
    const r = press(s, 1)
    expect(r.result).toBe('wrong')
    expect(r.state.lives).toBe(LIVES.relaxed - 1)
    expect(r.state.status).toBe('showing')
    expect(r.state.sequence).toEqual(s.sequence)
    expect(r.state.input).toBe(0)
  })

  it('relajado: sin vidas, se acaba', () => {
    let s = finishShowing(createGame({ difficulty: 'relaxed' }, seq(0)))
    for (let i = 0; i < LIVES.relaxed - 1; i++) s = finishShowing(press(s, 1).state)
    expect(press(s, 1).result).toBe('gameOver')
  })
})

describe('velocidad', () => {
  it('se acelera según crece la secuencia', () => {
    expect(stepDuration(1)).toBeGreaterThan(stepDuration(6))
    expect(stepDuration(6)).toBeGreaterThan(stepDuration(10))
    expect(stepDuration(10)).toBeGreaterThan(stepDuration(14))
    expect(stepGap(14)).toBeLessThan(stepGap(1))
  })
})
