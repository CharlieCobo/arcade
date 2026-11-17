import { describe, expect, it } from 'vitest'
import {
  COLS,
  HIDDEN_ROWS,
  LINE_SCORES,
  LOCK_DELAY_MS,
  MAX_LOCK_RESETS,
  PIECES,
  SHAPES,
  TOTAL_ROWS,
  cellsOf,
  collides,
  createGame,
  emptyBoard,
  ghostOf,
  gravityMs,
  hardDrop,
  levelFor,
  move,
  newBag,
  rotate,
  softDrop,
  update,
  type Active,
  type BlocksState,
  type Cell,
  type PieceType,
} from './logic'

const rng0 = () => 0

/** Estado controlado: tablero, pieza activa y cola. */
function makeState(active: Active, board: Cell[] = emptyBoard(), extra: Partial<BlocksState> = {}): BlocksState {
  return { ...createGame(1, rng0), board, active, queue: ['T', 'T', 'T', 'T'], ...extra }
}

/** Rellena una fila entera salvo las columnas indicadas. */
function fillRow(board: Cell[], y: number, except: number[] = []) {
  for (let x = 0; x < COLS; x++) if (!except.includes(x)) board[y * COLS + x] = 'Z'
}

const bottom = TOTAL_ROWS - 1

describe('formas y rotación SRS', () => {
  it('cada pieza tiene 4 celdas en sus 4 rotaciones', () => {
    for (const type of PIECES) {
      expect(SHAPES[type]).toHaveLength(4)
      for (const state of SHAPES[type]) expect(state).toHaveLength(4)
    }
  })

  it('la T gira como en SRS (estado R)', () => {
    const r = SHAPES.T[1]!.map(({ x, y }) => `${x},${y}`).sort()
    expect(r).toEqual(['1,0', '1,1', '1,2', '2,1'])
  })

  it('la I en vertical ocupa la tercera columna de su caja', () => {
    expect(new Set(SHAPES.I[1]!.map((p) => p.x))).toEqual(new Set([2]))
  })

  it('la O no gira', () => {
    const s = makeState({ type: 'O', rotation: 0, x: 4, y: 10 })
    expect(rotate(s, 1)).toBe(s)
  })

  it('wall kick: la I vertical pegada a la pared izquierda puede girar', () => {
    // I en vertical (rotación 3: columna 1 de su caja) pegada a la izquierda
    const s = makeState({ type: 'I', rotation: 3, x: -1, y: 10 })
    expect(collides(s.board, s.active!)).toBe(false)
    const r = rotate(s, 1)
    expect(r.active!.rotation).toBe(0)
    expect(cellsOf(r.active!).every((p) => p.x >= 0)).toBe(true)
  })

  it('no gira si ninguna posición de kick es válida', () => {
    const board = emptyBoard()
    // Encierra una T en un hueco justo de su forma
    for (let y = 8; y < 14; y++) for (let x = 0; x < COLS; x++) board[y * COLS + x] = 'Z'
    const t: Active = { type: 'T', rotation: 0, x: 3, y: 10 }
    for (const c of cellsOf(t)) board[c.y * COLS + c.x] = null
    const s = makeState(t, board)
    expect(rotate(s, 1).active).toEqual(t)
  })
})

describe('movimiento', () => {
  it('se mueve a los lados y se para en las paredes', () => {
    let s = makeState({ type: 'O', rotation: 0, x: 0, y: 10 })
    expect(move(s, -1)).toBe(s)
    s = move(s, 1)
    expect(s.active!.x).toBe(1)
  })

  it('la bajada suave baja una fila y suma 1 punto', () => {
    const s = softDrop(makeState({ type: 'T', rotation: 0, x: 3, y: 5 }))
    expect(s.active!.y).toBe(6)
    expect(s.score).toBe(1)
  })

  it('la sombra marca dónde caerá la pieza', () => {
    const ghost = ghostOf(makeState({ type: 'O', rotation: 0, x: 4, y: 5 }))!
    expect(Math.max(...cellsOf(ghost).map((p) => p.y))).toBe(bottom)
  })

  it('la bajada rápida fija la pieza y suma 2 puntos por fila', () => {
    const s = makeState({ type: 'O', rotation: 0, x: 4, y: 5 })
    const distance = ghostOf(s)!.y - 5
    const d = hardDrop(s, rng0)
    expect(d.score).toBe(distance * 2)
    expect(d.board[bottom * COLS + 4]).toBe('O')
    expect(d.pieces).toBe(s.pieces + 1)
    expect(d.active!.type).toBe('T') // sale la siguiente de la cola
  })
})

describe('líneas, puntos y niveles', () => {
  it('limpia una línea y puntúa según el nivel', () => {
    const board = emptyBoard()
    fillRow(board, bottom, [4, 5])
    const s = makeState({ type: 'O', rotation: 0, x: 4, y: 5 }, board, { level: 3, startLevel: 3 })
    const d = hardDrop(s, rng0)
    expect(d.lines).toBe(1)
    expect(d.lastClear).toBe(1)
    // Tras limpiar, solo queda la mitad superior de la O en la última fila
    expect(d.board.slice(bottom * COLS, (bottom + 1) * COLS).filter(Boolean)).toHaveLength(2)
    const dropScore = (d.score - LINE_SCORES[1] * 3)
    expect(dropScore).toBeGreaterThan(0)
  })

  it('cuatro líneas a la vez valen 800 × nivel', () => {
    const board = emptyBoard()
    for (let y = bottom - 3; y <= bottom; y++) fillRow(board, y, [0])
    const s = makeState({ type: 'I', rotation: 1, x: -2, y: bottom - 3 }, board, { level: 2, startLevel: 2 })
    const d = hardDrop(s, rng0)
    expect(d.lines).toBe(4)
    expect(d.score).toBe(800 * 2)
    expect(d.board.every((c) => c === null)).toBe(true)
  })

  it('sube de nivel cada 10 líneas desde el nivel elegido', () => {
    expect(levelFor(1, 9)).toBe(1)
    expect(levelFor(1, 10)).toBe(2)
    expect(levelFor(5, 25)).toBe(7)
  })

  it('el nivel sube solo al completar líneas', () => {
    const board = emptyBoard()
    fillRow(board, bottom, [4, 5])
    const s = makeState({ type: 'O', rotation: 0, x: 4, y: 5 }, board, { lines: 9, level: 1, startLevel: 1 })
    expect(hardDrop(s, rng0).level).toBe(2)
  })

  it('a más nivel, más rápido caen las piezas', () => {
    expect(gravityMs(1)).toBeCloseTo(1000)
    for (let l = 2; l <= 15; l++) expect(gravityMs(l)).toBeLessThan(gravityMs(l - 1))
    // Por encima, la curva llega al límite: cae casi instantáneo
    for (let l = 16; l <= 30; l++) expect(gravityMs(l)).toBeGreaterThanOrEqual(1)
  })
})

describe('gravedad y lock delay', () => {
  it('cae una fila cada intervalo de gravedad', () => {
    const s = makeState({ type: 'T', rotation: 0, x: 3, y: 5 })
    expect(update(s, gravityMs(1) - 1).active!.y).toBe(5)
    expect(update(s, gravityMs(1)).active!.y).toBe(6)
  })

  it('al apoyarse, espera el lock delay antes de fijarse', () => {
    const s = makeState({ type: 'O', rotation: 0, x: 4, y: bottom - 1 })
    const waiting = update(s, LOCK_DELAY_MS - 1)
    expect(waiting.pieces).toBe(s.pieces)
    expect(waiting.lockMs).toBe(LOCK_DELAY_MS - 1)
    expect(update(waiting, 1).pieces).toBe(s.pieces + 1)
  })

  it('mover la pieza apoyada reinicia el lock delay, con límite', () => {
    let s = update(makeState({ type: 'O', rotation: 0, x: 4, y: bottom - 1 }), 300)
    s = move(s, 1)
    expect(s.lockMs).toBe(0)
    for (let i = 0; i < MAX_LOCK_RESETS + 5; i++) s = move(update(s, 10), i % 2 ? 1 : -1)
    expect(s.lockResets).toBe(MAX_LOCK_RESETS)
    expect(s.lockMs).toBeGreaterThan(0)
  })
})

describe('generador y fin de partida', () => {
  it('cada bolsa contiene las 7 piezas', () => {
    for (const r of [0, 0.5, 0.99]) {
      expect([...newBag(() => r)].sort()).toEqual([...PIECES].sort())
    }
  })

  it('la cola siempre tiene piezas para la vista previa', () => {
    let s = createGame(1, Math.random)
    for (let i = 0; i < 30 && s.status === 'playing'; i++) {
      s = hardDrop(move(s, i % 2 ? 1 : -1))
      expect(s.queue.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('las piezas aparecen visibles en la parte de arriba', () => {
    for (const type of PIECES) {
      const s = { ...createGame(1, rng0), queue: [type as PieceType, 'T', 'T', 'T'] as PieceType[] }
      const spawned = hardDrop({ ...s, active: { type: 'O', rotation: 0, x: 0, y: 5 } }, rng0)
      const ys = cellsOf(spawned.active!).map((p) => p.y)
      expect(Math.max(...ys)).toBe(HIDDEN_ROWS) // la fila inferior de la pieza ya se ve
    }
  })

  it('termina si la nueva pieza no cabe', () => {
    const board = emptyBoard()
    // Todo lleno salvo las columnas 0 y 9 (así no se completa ninguna línea)
    for (let y = 0; y < TOTAL_ROWS; y++) fillRow(board, y, [0, 9])
    const s = makeState({ type: 'I', rotation: 1, x: -2, y: 0 }, board)
    expect(hardDrop(s, rng0).status).toBe('over')
  })

  it('no hace nada si la partida ha terminado', () => {
    const over = { ...createGame(), status: 'over' as const }
    expect(move(over, 1)).toBe(over)
    expect(update(over, 1000)).toBe(over)
  })
})
