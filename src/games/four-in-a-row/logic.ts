/**
 * Lógica pura del 4 en raya: tablero de 7 columnas × 6 filas.
 * La fila 0 es la de arriba; las fichas "caen" hasta la fila libre más baja.
 * Incluye la CPU (minimax con poda alfa-beta).
 */

export type Player = 1 | 2
export type Cell = 0 | Player
export type Level = 'easy' | 'normal' | 'hard'
export type Rng = () => number

export interface FourState {
  board: Cell[]
  turn: Player
  winner: Player | null
  draw: boolean
  /** Las 4 (o más) casillas ganadoras */
  winLine: number[] | null
  lastMove: { row: number; col: number } | null
  moves: number
}

export const COLS = 7
export const ROWS = 6
const WIN = 4

export const idx = (row: number, col: number) => row * COLS + col
export const other = (p: Player): Player => (p === 1 ? 2 : 1)

export function createGame(starter: Player = 1): FourState {
  return {
    board: Array<Cell>(COLS * ROWS).fill(0),
    turn: starter,
    winner: null,
    draw: false,
    winLine: null,
    lastMove: null,
    moves: 0,
  }
}

export const isOver = (s: FourState) => s.winner !== null || s.draw

/** Fila donde caería una ficha en esa columna, o -1 si está llena. */
export function dropRow(board: readonly Cell[], col: number): number {
  if (col < 0 || col >= COLS) return -1
  for (let row = ROWS - 1; row >= 0; row--) if (board[idx(row, col)] === 0) return row
  return -1
}

export const validColumns = (board: readonly Cell[]) => [...Array(COLS).keys()].filter((c) => dropRow(board, c) !== -1)

const DIRECTIONS = [
  [0, 1], // horizontal
  [1, 0], // vertical
  [1, 1], // diagonal ↘
  [1, -1], // diagonal ↙
] as const

/** Casillas en línea con (row, col) para el jugador, si son 4 o más. */
function lineThrough(board: readonly Cell[], row: number, col: number, p: Player): number[] | null {
  for (const [dr, dc] of DIRECTIONS) {
    const line = [idx(row, col)]
    for (const sign of [1, -1]) {
      let r = row + dr * sign
      let c = col + dc * sign
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[idx(r, c)] === p) {
        line.push(idx(r, c))
        r += dr * sign
        c += dc * sign
      }
    }
    if (line.length >= WIN) return line.sort((a, b) => a - b)
  }
  return null
}

/** Suelta una ficha del jugador en turno. Devuelve null si no se puede. */
export function drop(s: FourState, col: number): FourState | null {
  if (isOver(s)) return null
  const row = dropRow(s.board, col)
  if (row === -1) return null
  const board = [...s.board]
  board[idx(row, col)] = s.turn
  const winLine = lineThrough(board, row, col, s.turn)
  const moves = s.moves + 1
  return {
    board,
    turn: winLine ? s.turn : other(s.turn),
    winner: winLine ? s.turn : null,
    draw: !winLine && moves === COLS * ROWS,
    winLine,
    lastMove: { row, col },
    moves,
  }
}

// ─── CPU ─────────────────────────────────────────────────────────────────────

/** Profundidad de búsqueda y probabilidad de jugada al azar por nivel. */
export const CPU: Record<Level, { depth: number; randomness: number }> = {
  easy: { depth: 2, randomness: 0.35 },
  normal: { depth: 4, randomness: 0.08 },
  hard: { depth: 7, randomness: 0 },
}

/** Orden de exploración: del centro hacia fuera (mejora mucho la poda). */
const ORDER = [3, 2, 4, 1, 5, 0, 6]

/** Todas las ventanas de 4 casillas del tablero (se calculan una vez). */
const WINDOWS: number[][] = (() => {
  const w: number[][] = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dr, dc] of DIRECTIONS) {
        const cells: number[] = []
        for (let k = 0; k < WIN; k++) {
          const rr = r + dr * k
          const cc = c + dc * k
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) break
          cells.push(idx(rr, cc))
        }
        if (cells.length === WIN) w.push(cells)
      }
    }
  }
  return w
})()

/** Valoración de una posición para `me` (positiva = buena). */
export function evaluate(board: readonly Cell[], me: Player): number {
  const opp = other(me)
  let score = 0
  for (let r = 0; r < ROWS; r++) {
    const center = board[idx(r, 3)]
    if (center === me) score += 3
    else if (center === opp) score -= 3
  }
  for (const w of WINDOWS) {
    let mine = 0
    let theirs = 0
    for (const i of w) {
      if (board[i] === me) mine++
      else if (board[i] === opp) theirs++
    }
    if (theirs === 0) score += mine === 3 ? 6 : mine === 2 ? 2 : 0
    else if (mine === 0) score -= theirs === 3 ? 8 : theirs === 2 ? 2 : 0
  }
  return score
}

const WIN_SCORE = 1_000_000

function minimax(s: FourState, depth: number, alpha: number, beta: number, me: Player): number {
  if (s.winner !== null) return s.winner === me ? WIN_SCORE + depth : -WIN_SCORE - depth // ganar antes vale más
  if (s.draw) return 0
  if (depth === 0) return evaluate(s.board, me)

  const maximizing = s.turn === me
  let best = maximizing ? -Infinity : Infinity
  for (const col of ORDER) {
    const next = drop(s, col)
    if (!next) continue
    const v = minimax(next, depth - 1, alpha, beta, me)
    if (maximizing) {
      best = Math.max(best, v)
      alpha = Math.max(alpha, v)
    } else {
      best = Math.min(best, v)
      beta = Math.min(beta, v)
    }
    if (alpha >= beta) break
  }
  return best
}

/** Columna que elige la CPU (juega con el turno actual). */
export function cpuMove(s: FourState, level: Level, rng: Rng = Math.random): number {
  const cols = validColumns(s.board)
  if (cols.length === 0) return -1
  const me = s.turn

  // Siempre: ganar si puede y bloquear si el rival gana en la siguiente
  for (const c of cols) if (drop(s, c)?.winner === me) return c
  const asRival: FourState = { ...s, turn: other(me) }
  for (const c of cols) if (drop(asRival, c)?.winner === other(me)) return c

  const { depth, randomness } = CPU[level]
  if (rng() < randomness) return cols[Math.floor(rng() * cols.length)]!

  let bestCol = cols[0]!
  let bestScore = -Infinity
  for (const col of ORDER) {
    const next = drop(s, col)
    if (!next) continue
    const v = minimax(next, depth - 1, -Infinity, Infinity, me)
    if (v > bestScore) {
      bestScore = v
      bestCol = col
    }
  }
  return bestCol
}
