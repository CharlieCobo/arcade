import { describe, expect, it } from 'vitest'
import {
  SIZES,
  boxLines,
  boxesOfLine,
  cpuMove,
  createGame,
  freeLines,
  hCount,
  hLine,
  play,
  sacrifice,
  sidesOf,
  vCount,
  vLine,
  type DotsState,
} from './logic'

const fixed = () => 0 // azar fijado

/** Traza varias líneas seguidas (sin importar de quién es el turno). */
function draw(s: DotsState, lines: number[]): DotsState {
  return lines.reduce((st, l) => {
    const next = play(st, l)
    if (!next) throw new Error(`Línea inválida ${l}`)
    return next
  }, s)
}

describe('geometría', () => {
  it('cuenta las líneas de un tablero', () => {
    const s = createGame({ cols: 4, rows: 4 })
    expect(hCount(s)).toBe(20)
    expect(vCount(s)).toBe(20)
    expect(s.lines).toHaveLength(40)
    expect(s.boxes).toHaveLength(16)
  })

  it('cada caja tiene sus 4 líneas y cada línea sus 1 o 2 cajas', () => {
    const s = createGame({ cols: 2, rows: 2 })
    expect(boxLines(s, 0)).toEqual([hLine(s, 0, 0), hLine(s, 1, 0), vLine(s, 0, 0), vLine(s, 0, 1)])
    expect(boxesOfLine(s, hLine(s, 0, 0))).toEqual([0]) // borde superior
    expect(boxesOfLine(s, hLine(s, 1, 0))).toEqual([0, 2]) // interior
    expect(boxesOfLine(s, vLine(s, 0, 1))).toEqual([0, 1])
  })

  it('los tableros son verticales y crecen', () => {
    expect(SIZES.small.cols * SIZES.small.rows).toBeLessThan(SIZES.medium.cols * SIZES.medium.rows)
    expect(SIZES.large.rows).toBeGreaterThan(SIZES.large.cols)
  })
})

describe('jugar', () => {
  it('trazar una línea pasa el turno', () => {
    const s = play(createGame(), 0)!
    expect(s.lines[0]).toBe(1)
    expect(s.turn).toBe(2)
  })

  it('no se puede repetir una línea', () => {
    const s = play(createGame(), 0)!
    expect(play(s, 0)).toBeNull()
  })

  it('cerrar una caja la gana y da otro turno', () => {
    const s0 = createGame({ cols: 2, rows: 2 })
    const [top, bottom, left, right] = boxLines(s0, 0)
    const s = draw(s0, [top!, bottom!, left!]) // turnos: 1, 2, 1 → ahora juega 2
    expect(s.turn).toBe(2)
    const closed = play(s, right!)!
    expect(closed.boxes[0]).toBe(2)
    expect(closed.score[2]).toBe(1)
    expect(closed.turn).toBe(2) // repite
    expect(closed.lastBoxes).toEqual([0])
  })

  it('una línea puede cerrar dos cajas a la vez', () => {
    const s0 = createGame({ cols: 2, rows: 1 })
    const middle = vLine(s0, 0, 1)
    const others = freeLines(s0).filter((l) => l !== middle)
    const s = play(draw(s0, others), middle)!
    expect(s.lastBoxes).toEqual([0, 1])
    expect(s.over).toBe(true)
  })

  it('al cerrar todas las cajas termina y gana quien tenga más', () => {
    let s = createGame({ cols: 1, rows: 1 })
    s = draw(s, [0, 1, 2]) // 1, 2, 1
    s = play(s, 3)! // lo cierra 2
    expect(s.over).toBe(true)
    expect(s.winner).toBe(2)
  })

  it('empate si igualan', () => {
    // 2 cajas: la 0 ya es del jugador 1; el 2 traza la última línea y cierra la 1
    const s0 = createGame({ cols: 2, rows: 1 })
    const last = vLine(s0, 0, 2)
    const s: DotsState = {
      ...s0,
      lines: s0.lines.map((_, i) => (i === last ? 0 : 1)),
      boxes: [1, 0],
      score: { 1: 1, 2: 0 },
      turn: 2,
    }
    const end = play(s, last)!
    expect(end.over).toBe(true)
    expect(end.score).toEqual({ 1: 1, 2: 1 })
    expect(end.winner).toBeNull()
  })
})

describe('CPU', () => {
  it('cierra una caja si puede', () => {
    const s0 = createGame({ cols: 3, rows: 3 })
    const [top, bottom, left, right] = boxLines(s0, 4)
    const s = { ...draw(s0, [top!, bottom!, left!]), turn: 2 as const }
    for (const level of ['easy', 'normal', 'hard'] as const) {
      // En fácil depende del azar: con 0 siempre cierra
      expect(cpuMove(s, level, fixed)).toBe(right)
    }
  })

  it('normal y difícil no regalan cajas si tienen jugadas seguras', () => {
    const s0 = createGame({ cols: 3, rows: 3 })
    const [top, bottom] = boxLines(s0, 4)
    const s = draw(s0, [top!, bottom!]) // caja central con 2 lados
    for (const level of ['normal', 'hard'] as const) {
      for (let i = 0; i < 20; i++) {
        const l = cpuMove(s, level, Math.random)
        expect(boxesOfLine(s, l).every((b) => sidesOf(s, b) < 2)).toBe(true)
      }
    }
  })

  it('el coste de regalar cuenta la cadena entera', () => {
    // Fila de 3 cajas con todos los bordes de arriba y abajo trazados:
    // trazar el lado izquierdo regala la cadena de 3
    const s0 = createGame({ cols: 3, rows: 1 })
    const tops = [0, 1, 2].map((c) => hLine(s0, 0, c))
    const bottoms = [0, 1, 2].map((c) => hLine(s0, 1, c))
    let s = draw(s0, [...tops, ...bottoms])
    if (s.turn !== 1) s = { ...s, turn: 1 }
    expect(sacrifice(s, vLine(s, 0, 0))).toBe(3)
  })

  it('difícil, obligado a regalar, elige la cadena más corta', () => {
    // Dos cadenas: una de 1 caja (columna 0 aislada) y otra de 2 (columnas 2-3)
    const s0 = createGame({ cols: 4, rows: 1 })
    const all = freeLines(s0)
    const keepFree = [vLine(s0, 0, 0), vLine(s0, 0, 2), vLine(s0, 0, 3), vLine(s0, 0, 4)]
    // Trazamos todo salvo esas verticales; la caja 1 queda cerrada al trazar sus lados
    let s = s0
    for (const l of all) if (!keepFree.includes(l)) s = play(s, l) ?? s
    s = { ...s, over: false, turn: 2 }
    const move = cpuMove(s, 'hard', fixed)
    expect(sacrifice(s, move)).toBeLessThanOrEqual(1)
  })

  it('una partida CPU contra CPU termina con todas las cajas', () => {
    let s = createGame(SIZES.medium)
    let guard = 0
    while (!s.over && guard++ < 500) {
      const level = s.turn === 1 ? 'hard' : 'normal'
      s = play(s, cpuMove(s, level))!
    }
    expect(s.over).toBe(true)
    expect(s.score[1] + s.score[2]).toBe(30)
  })
})
