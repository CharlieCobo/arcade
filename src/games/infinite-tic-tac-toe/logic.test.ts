import { describe, expect, it } from 'vitest'
import {
  applyMove,
  cpuMove,
  findWin,
  initialState,
  nextToVanish,
  type GameState,
} from './logic'

/** Aplica una secuencia de jugadas alternas desde el estado inicial. */
function play(moves: number[], starter: 'X' | 'O' = 'X'): GameState {
  return moves.reduce<GameState>((state, idx) => {
    const next = applyMove(state, idx)
    if (!next) throw new Error(`Jugada inválida en ${idx}`)
    return next
  }, initialState(starter))
}

describe('applyMove', () => {
  it('coloca la ficha y pasa el turno', () => {
    const s = play([4])
    expect(s.board[4]).toBe('X')
    expect(s.turn).toBe('O')
    expect(s.queues.X).toEqual([4])
  })

  it('rechaza casillas ocupadas o fuera de rango', () => {
    const s = play([4])
    expect(applyMove(s, 4)).toBeNull()
    expect(applyMove(s, -1)).toBeNull()
    expect(applyMove(s, 9)).toBeNull()
  })

  it('al colocar la 4ª ficha elimina la más antigua (FIFO)', () => {
    // X: 0, 2, 7  |  O: 1, 3, 5
    const s = play([0, 1, 2, 3, 7, 5])
    expect(s.queues.X).toEqual([0, 2, 7])

    const next = applyMove(s, 8)!
    expect(next.board[0]).toBeNull()
    expect(next.board[8]).toBe('X')
    expect(next.queues.X).toEqual([2, 7, 8])
    expect(next.board.filter((c) => c === 'X')).toHaveLength(3)
  })

  it('no permite colocar en la ficha que va a desaparecer', () => {
    const s = play([0, 1, 2, 3, 7, 5])
    expect(nextToVanish(s)).toBe(0)
    expect(applyMove(s, 0)).toBeNull()
  })

  it('detecta victoria tras eliminar la ficha más antigua', () => {
    // X: 7, 2, 4 | O: 0, 1, 3 → X juega 6: elimina 7 y forma la diagonal 2-4-6.
    const s = play([7, 0, 2, 1, 4, 3])
    const next = applyMove(s, 6)!
    expect(next.board[7]).toBeNull()
    expect(next.winner).toBe('X')
    expect(next.winLine).toEqual([2, 4, 6])
  })

  it('no admite jugadas después de una victoria', () => {
    const s = play([0, 3, 1, 4, 2])
    expect(s.winner).toBe('X')
    expect(s.turn).toBe('X')
    expect(applyMove(s, 8)).toBeNull()
  })

  it('nunca hay más de 3 fichas por jugador', () => {
    const s = play([0, 1, 2, 3, 7, 5, 8, 6, 4])
    expect(s.board.filter((c) => c === 'X').length).toBeLessThanOrEqual(3)
    expect(s.board.filter((c) => c === 'O').length).toBeLessThanOrEqual(3)
  })
})

describe('findWin', () => {
  it('devuelve null sin línea', () => {
    expect(findWin(initialState().board)).toBeNull()
  })
})

describe('nextToVanish', () => {
  it('es null hasta que el jugador en turno tiene 3 fichas', () => {
    expect(nextToVanish(play([0, 1]))).toBeNull()
    expect(nextToVanish(play([0, 1, 2, 3, 7, 5]))).toBe(0)
  })
})

describe('cpuMove', () => {
  it('gana si puede', () => {
    const s = play([0, 3, 8, 4, 6]) // X: 0, 8, 6 | O: 3, 4 | turno O → gana en 5
    expect(s.turn).toBe('O')
    expect(cpuMove(s)).toBe(5)
  })

  it('bloquea si el rival va a ganar', () => {
    const s = play([0, 4, 1]) // X amenaza 2 | turno O
    expect(cpuMove(s)).toBe(2)
  })

  it('elige el centro si está libre y no hay amenazas', () => {
    expect(cpuMove(play([0]))).toBe(4)
  })

  it('es determinista con random inyectado', () => {
    const s = play([4]) // centro ocupado
    expect(cpuMove(s, () => 0)).toBe(0)
  })
})
