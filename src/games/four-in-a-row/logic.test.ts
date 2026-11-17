import { describe, expect, it } from 'vitest'
import { COLS, ROWS, cpuMove, createGame, drop, dropRow, evaluate, idx, validColumns, type FourState } from './logic'

/** Juega una lista de columnas alternando turnos. */
function play(cols: number[], starter: 1 | 2 = 1): FourState {
  return cols.reduce<FourState>((s, c) => {
    const next = drop(s, c)
    if (!next) throw new Error(`Jugada inválida en la columna ${c}`)
    return next
  }, createGame(starter))
}

describe('soltar fichas', () => {
  it('la ficha cae a la fila libre más baja', () => {
    const s = play([3, 3])
    expect(s.board[idx(ROWS - 1, 3)]).toBe(1)
    expect(s.board[idx(ROWS - 2, 3)]).toBe(2)
    expect(s.lastMove).toEqual({ row: ROWS - 2, col: 3 })
    expect(s.turn).toBe(1)
  })

  it('no se puede soltar en una columna llena ni fuera del tablero', () => {
    const s = play([0, 0, 0, 0, 0, 0])
    expect(dropRow(s.board, 0)).toBe(-1)
    expect(drop(s, 0)).toBeNull()
    expect(drop(s, 7)).toBeNull()
    expect(validColumns(s.board)).not.toContain(0)
  })
})

describe('victoria', () => {
  it('horizontal', () => {
    const s = play([0, 0, 1, 1, 2, 2, 3])
    expect(s.winner).toBe(1)
    expect(s.winLine).toHaveLength(4)
  })

  it('vertical', () => {
    expect(play([4, 5, 4, 5, 4, 5, 4]).winner).toBe(1)
  })

  it('diagonal ↗', () => {
    // 1 en (5,0) (4,1) (3,2) (2,3)
    expect(play([0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3]).winner).toBe(1)
  })

  it('diagonal ↘', () => {
    expect(play([6, 5, 5, 4, 4, 3, 4, 3, 3, 0, 3]).winner).toBe(1)
  })

  it('cuenta líneas de más de 4 y no deja seguir jugando', () => {
    const s = play([0, 6, 1, 6, 3, 5, 4, 5, 2]) // 1 completa 0-1-2-3-4
    expect(s.winner).toBe(1)
    expect(s.winLine!.length).toBe(5)
    expect(drop(s, 6)).toBeNull()
  })

  it('empate con el tablero lleno sin 4 en raya', () => {
    // Patrón por columnas que no forma líneas de 4
    const order = [0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 2, 3, 2, 3, 2, 3, 3, 2, 3, 2, 3, 2, 4, 5, 4, 5, 4, 5, 5, 4, 5, 4, 5, 4, 6, 6, 6, 6, 6, 6]
    const s = play(order)
    expect(s.moves).toBe(COLS * ROWS)
    expect(s.winner).toBeNull()
    expect(s.draw).toBe(true)
  })
})

describe('CPU', () => {
  it('gana si puede', () => {
    const s = play([0, 6, 0, 6, 0, 5]) // turno de 1, gana en la columna 0
    expect(cpuMove(s, 'easy', () => 0.99)).toBe(0)
  })

  it('bloquea si el rival va a ganar', () => {
    const s = play([0, 6, 0, 6, 0]) // turno de 2: 1 amenaza en la columna 0
    expect(cpuMove(s, 'easy', () => 0.99)).toBe(0)
  })

  it('prefiere el centro al empezar', () => {
    expect(cpuMove(createGame(), 'hard')).toBe(3)
  })

  it('evita jugadas que dejan ganar al rival justo encima', () => {
    // Fila 4: el 1 tiene 0-1-2 y le falta (4,3). Si el 2 juega en la columna 3,
    // su ficha cae en (5,3) y el 1 gana justo encima. La CPU debe evitarlo.
    const board = createGame().board.slice()
    const put = (r: number, c: number, p: 1 | 2) => (board[idx(r, c)] = p)
    put(5, 0, 2); put(5, 1, 2); put(5, 2, 1); put(5, 6, 2); put(4, 6, 2)
    put(4, 0, 1); put(4, 1, 1); put(4, 2, 1)
    const s: FourState = { ...createGame(2), board, moves: 9 }
    expect(cpuMove(s, 'hard')).not.toBe(3)
    expect(cpuMove(s, 'normal')).not.toBe(3)
  })

  it('el nivel difícil responde rápido', () => {
    const s = play([3, 3, 2, 4])
    const t0 = performance.now()
    cpuMove(s, 'hard')
    expect(performance.now() - t0).toBeLessThan(1500)
  })

  it('la valoración favorece el centro', () => {
    const center = play([3])
    const edge = play([0])
    expect(evaluate(center.board, 1)).toBeGreaterThan(evaluate(edge.board, 1))
  })

  it('el difícil le gana casi siempre al fácil', () => {
    let hardWins = 0
    for (let g = 0; g < 6; g++) {
      let s = createGame(g % 2 === 0 ? 1 : 2)
      let seed = g + 1
      const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
      while (!s.winner && !s.draw) {
        const col = s.turn === 1 ? cpuMove(s, 'hard', rng) : cpuMove(s, 'easy', rng)
        s = drop(s, col)!
      }
      if (s.winner === 1) hardWins++
    }
    expect(hardWins).toBeGreaterThanOrEqual(5)
  })
})
