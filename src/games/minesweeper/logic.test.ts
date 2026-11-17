import { describe, expect, it } from 'vitest'
import {
  CONFIGS,
  chord,
  createCustom,
  createGame,
  distanceFromOrigin,
  formatTime,
  minesLeft,
  neighbors,
  reveal,
  toggleFlag,
  type MinesState,
} from './logic'

/** Tablero con las minas exactamente donde queramos (ya en juego). */
function withMines(cols: number, rows: number, mineIdx: number[]): MinesState {
  const s = createCustom({ cols, rows, mines: mineIdx.length })
  const set = new Set(mineIdx)
  const cells = s.cells.map((c, i) => ({ ...c, mine: set.has(i) }))
  return {
    ...s,
    status: 'playing',
    cells: cells.map((c, i) => ({ ...c, adjacent: neighbors(s, i).filter((n) => cells[n]!.mine).length })),
  }
}

describe('primer toque', () => {
  it('nunca es mina y abre una zona (sin minas alrededor)', () => {
    for (let seed = 0; seed < 30; seed++) {
      let x = seed + 1
      const rng = () => ((x = (x * 16807) % 2147483647) / 2147483647)
      const s = reveal(createGame('hard'), 100, rng)
      expect(s.status).not.toBe('lost')
      expect(s.cells[100]!.mine).toBe(false)
      expect(s.cells[100]!.adjacent).toBe(0)
      expect(s.revealed).toBeGreaterThan(1)
      expect(s.cells.filter((c) => c.mine)).toHaveLength(CONFIGS.hard.mines)
    }
  })
})

describe('descubrir', () => {
  it('una casilla con número solo se descubre a sí misma', () => {
    const s = reveal(withMines(3, 3, [0]), 1)
    expect(s.cells[1]!.revealed).toBe(true)
    expect(s.cells[1]!.adjacent).toBe(1)
    expect(s.revealed).toBe(1)
  })

  it('una casilla sin minas alrededor abre en cascada', () => {
    // 4×4 con una mina en la esquina: tocar la esquina opuesta abre todo menos la mina
    const s = reveal(withMines(4, 4, [0]), 15)
    expect(s.revealed).toBe(15)
    expect(s.status).toBe('won')
  })

  it('pisar una mina pierde y descubre todas las minas', () => {
    const s = reveal(withMines(3, 3, [0, 8]), 0)
    expect(s.status).toBe('lost')
    expect(s.exploded).toBe(0)
    expect(s.cells[8]!.revealed).toBe(true)
  })

  it('al ganar, todas las minas quedan con bandera', () => {
    let s = withMines(3, 1, [0])
    s = reveal(s, 1)
    s = reveal(s, 2)
    expect(s.status).toBe('won')
    expect(s.cells[0]!.flagged).toBe(true)
    expect(minesLeft(s)).toBe(0)
  })

  it('no se puede descubrir una casilla con bandera', () => {
    const s = toggleFlag(withMines(3, 3, [0]), 4)
    expect(reveal(s, 4)).toBe(s)
  })

  it('anima en cascada desde la casilla tocada', () => {
    const s = reveal(withMines(4, 4, [0]), 15)
    expect(distanceFromOrigin(s, 15)).toBe(0)
    expect(distanceFromOrigin(s, 5)).toBe(2)
  })
})

describe('banderas', () => {
  it('poner y quitar actualiza el contador de minas', () => {
    let s = withMines(3, 3, [0])
    s = toggleFlag(s, 0)
    expect(minesLeft(s)).toBe(0)
    s = toggleFlag(s, 0)
    expect(minesLeft(s)).toBe(1)
  })

  it('no se puede poner en una casilla descubierta', () => {
    const s = reveal(withMines(3, 3, [0]), 1)
    expect(toggleFlag(s, 1)).toBe(s)
  })
})

describe('abrir alrededor de un número', () => {
  it('con las banderas correctas, abre el resto de vecinas', () => {
    // Mina en 0; el 1 (adyacente 1) con bandera en 0 abre 2, 3, 4, 5
    let s = reveal(withMines(3, 3, [0]), 1)
    s = toggleFlag(s, 0)
    s = chord(s, 1)
    expect([2, 3, 4, 5].every((i) => s.cells[i]!.revealed)).toBe(true)
  })

  it('sin suficientes banderas no hace nada', () => {
    const s = reveal(withMines(3, 3, [0]), 1)
    expect(chord(s, 1)).toBe(s)
  })

  it('con una bandera mal puesta, explota', () => {
    let s = reveal(withMines(3, 3, [0]), 1)
    s = toggleFlag(s, 2) // la mina está en 0, no en 2
    expect(chord(s, 1).status).toBe('lost')
  })
})

describe('utilidades', () => {
  it('formatea el tiempo', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(65)).toBe('1:05')
    expect(formatTime(600.9)).toBe('10:00')
  })

  it('los tableros tienen densidades crecientes', () => {
    const density = (d: keyof typeof CONFIGS) => CONFIGS[d].mines / (CONFIGS[d].cols * CONFIGS[d].rows)
    expect(density('easy')).toBeLessThan(density('normal'))
    expect(density('normal')).toBeLessThan(density('hard'))
  })
})
