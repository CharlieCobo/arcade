/**
 * Lógica pura del buscaminas. Sin React.
 * Las minas se colocan en el primer toque, evitando esa casilla y sus vecinas:
 * el primer toque siempre es seguro y abre una zona.
 */

export type Difficulty = 'easy' | 'normal' | 'hard'
export type Status = 'ready' | 'playing' | 'won' | 'lost'
export type Rng = () => number

export interface MineCell {
  mine: boolean
  revealed: boolean
  flagged: boolean
  /** Minas en las 8 casillas vecinas */
  adjacent: number
  /** En qué jugada se descubrió (para animar solo las recién abiertas) */
  revealedStep: number
}

export interface MinesState {
  rows: number
  cols: number
  mines: number
  cells: MineCell[]
  status: Status
  flags: number
  revealed: number
  /** Casilla de la mina pisada */
  exploded: number | null
  /** Contador de jugadas y casilla desde la que se abrió la última (para la cascada) */
  step: number
  origin: number | null
}

/** Tableros en vertical, pensados para el móvil. */
export const CONFIGS: Record<Difficulty, { cols: number; rows: number; mines: number }> = {
  easy: { cols: 9, rows: 9, mines: 10 },
  normal: { cols: 10, rows: 14, mines: 25 },
  hard: { cols: 12, rows: 18, mines: 45 },
}

const emptyCell = (): MineCell => ({ mine: false, revealed: false, flagged: false, adjacent: 0, revealedStep: 0 })

export function createGame(difficulty: Difficulty = 'easy'): MinesState {
  return createCustom(CONFIGS[difficulty])
}

export function createCustom({ cols, rows, mines }: { cols: number; rows: number; mines: number }): MinesState {
  return {
    rows,
    cols,
    mines: Math.min(mines, rows * cols - 1),
    cells: Array.from({ length: rows * cols }, emptyCell),
    status: 'ready',
    flags: 0,
    revealed: 0,
    exploded: null,
    step: 0,
    origin: null,
  }
}

export const toRC = (s: Pick<MinesState, 'cols'>, i: number) => ({ r: Math.floor(i / s.cols), c: i % s.cols })

export function neighbors(s: Pick<MinesState, 'rows' | 'cols'>, i: number): number[] {
  const r = Math.floor(i / s.cols)
  const c = i % s.cols
  const out: number[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const rr = r + dr
      const cc = c + dc
      if (rr >= 0 && rr < s.rows && cc >= 0 && cc < s.cols) out.push(rr * s.cols + cc)
    }
  }
  return out
}

/** Coloca las minas evitando la casilla del primer toque y, si cabe, sus vecinas. */
export function placeMines(s: MinesState, safe: number, rng: Rng): MineCell[] {
  const total = s.rows * s.cols
  const zone = new Set([safe, ...neighbors(s, safe)])
  let candidates = [...Array(total).keys()].filter((i) => !zone.has(i))
  if (candidates.length < s.mines) candidates = [...Array(total).keys()].filter((i) => i !== safe)
  // Fisher-Yates parcial
  for (let i = 0; i < s.mines; i++) {
    const j = i + Math.floor(rng() * (candidates.length - i))
    ;[candidates[i], candidates[j]] = [candidates[j]!, candidates[i]!]
  }
  const mineSet = new Set(candidates.slice(0, s.mines))
  const cells = s.cells.map((cell, i) => ({ ...cell, mine: mineSet.has(i) }))
  return cells.map((cell, i) => ({ ...cell, adjacent: neighbors(s, i).filter((n) => cells[n]!.mine).length }))
}

const safeCells = (s: MinesState) => s.rows * s.cols - s.mines

/** Abre una casilla (y en cascada las vecinas si no tiene minas alrededor). */
export function reveal(state: MinesState, i: number, rng: Rng = Math.random): MinesState {
  if (state.status === 'won' || state.status === 'lost') return state
  const target = state.cells[i]
  if (!target || target.revealed || target.flagged) return state

  let s = state
  if (s.status === 'ready') s = { ...s, cells: placeMines(s, i, rng), status: 'playing' }

  const step = s.step + 1
  const cells = s.cells.map((c) => ({ ...c }))

  if (cells[i]!.mine) {
    // Boom: se descubren todas las minas
    cells.forEach((c) => {
      if (c.mine && !c.flagged) {
        c.revealed = true
        c.revealedStep = step
      }
    })
    return { ...s, cells, status: 'lost', exploded: i, step, origin: i }
  }

  let revealed = s.revealed
  const queue = [i]
  while (queue.length) {
    const k = queue.shift()!
    const cell = cells[k]!
    if (cell.revealed || cell.flagged) continue
    cell.revealed = true
    cell.revealedStep = step
    revealed++
    if (cell.adjacent === 0) for (const n of neighbors(s, k)) if (!cells[n]!.revealed && !cells[n]!.mine) queue.push(n)
  }

  const next: MinesState = { ...s, cells, revealed, step, origin: i }
  return revealed === safeCells(s) ? win(next) : next
}

/** Al ganar, todas las minas quedan marcadas con bandera. */
function win(s: MinesState): MinesState {
  const cells = s.cells.map((c) => (c.mine ? { ...c, flagged: true } : c))
  return { ...s, cells, status: 'won', flags: s.mines }
}

/** Pone o quita una bandera en una casilla tapada. */
export function toggleFlag(s: MinesState, i: number): MinesState {
  if (s.status === 'won' || s.status === 'lost') return s
  const cell = s.cells[i]
  if (!cell || cell.revealed) return s
  const cells = [...s.cells]
  cells[i] = { ...cell, flagged: !cell.flagged }
  return { ...s, cells, flags: s.flags + (cell.flagged ? -1 : 1) }
}

/**
 * Tocar un número ya descubierto con tantas banderas alrededor como su número
 * abre el resto de vecinas (si alguna bandera está mal, ¡boom!).
 */
export function chord(s: MinesState, i: number, rng: Rng = Math.random): MinesState {
  const cell = s.cells[i]
  if (s.status !== 'playing' || !cell?.revealed || cell.adjacent === 0) return s
  const around = neighbors(s, i)
  const flagged = around.filter((n) => s.cells[n]!.flagged).length
  if (flagged !== cell.adjacent) return s
  let next = s
  for (const n of around) {
    next = reveal(next, n, rng)
    if (next.status === 'lost') break
  }
  // Toda la apertura cuenta como una jugada que sale de la casilla tocada
  return next === s ? s : { ...next, origin: i }
}

/** Minas que quedan según las banderas puestas (puede ser negativo si sobran). */
export const minesLeft = (s: MinesState) => s.mines - s.flags

/** Distancia (en casillas) desde el origen de la última apertura, para animar en cascada. */
export function distanceFromOrigin(s: MinesState, i: number): number {
  if (s.origin === null) return 0
  const a = toRC(s, s.origin)
  const b = toRC(s, i)
  return Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c))
}

/** 1:05 */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
