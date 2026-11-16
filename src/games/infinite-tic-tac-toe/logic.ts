/**
 * Lógica pura del Tres en raya infinito.
 * Sin dependencias de React: se puede reutilizar en React Native o en un servidor.
 */

export type Player = 'X' | 'O'
export type Cell = Player | null
export type Board = readonly Cell[]
export type WinLine = readonly [number, number, number]

export interface GameState {
  readonly board: Board
  /** Cola FIFO por jugador: el índice 0 es la ficha más antigua. */
  readonly queues: Readonly<Record<Player, readonly number[]>>
  readonly turn: Player
  readonly winner: Player | null
  readonly winLine: WinLine | null
  readonly moves: number
}

export const MAX_PIECES = 3
export const BOARD_SIZE = 9

export const LINES: readonly WinLine[] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]

export const other = (p: Player): Player => (p === 'X' ? 'O' : 'X')

export function initialState(starter: Player = 'X'): GameState {
  return {
    board: Array<Cell>(BOARD_SIZE).fill(null),
    queues: { X: [], O: [] },
    turn: starter,
    winner: null,
    winLine: null,
    moves: 0,
  }
}

export function findWin(board: Board): WinLine | null {
  for (const line of LINES) {
    const [a, b, c] = line
    const v = board[a]
    if (v && v === board[b] && v === board[c]) return line
  }
  return null
}

export function emptyCells(board: Board): number[] {
  const cells: number[] = []
  board.forEach((v, i) => {
    if (!v) cells.push(i)
  })
  return cells
}

/**
 * Aplica una jugada del jugador en turno.
 * Si ya tiene MAX_PIECES fichas, primero se elimina la más antigua.
 * Devuelve null si la jugada no es válida.
 */
export function applyMove(state: GameState, idx: number, maxPieces = MAX_PIECES): GameState | null {
  if (state.winner) return null
  if (idx < 0 || idx >= BOARD_SIZE || state.board[idx]) return null

  const player = state.turn
  const board = [...state.board]
  const queue = [...state.queues[player]]

  if (queue.length >= maxPieces) {
    const oldest = queue.shift()
    if (oldest !== undefined) board[oldest] = null
  }
  board[idx] = player
  queue.push(idx)

  const winLine = findWin(board)
  return {
    board,
    queues: { ...state.queues, [player]: queue },
    turn: winLine ? player : other(player),
    winner: winLine ? player : null,
    winLine,
    moves: state.moves + 1,
  }
}

/** Ficha que desaparecerá en la próxima jugada del jugador en turno, o null. */
export function nextToVanish(state: GameState, maxPieces = MAX_PIECES): number | null {
  if (state.winner) return null
  const queue = state.queues[state.turn]
  return queue.length >= maxPieces ? (queue[0] ?? null) : null
}

/**
 * CPU sencilla: gana si puede → bloquea si debe → centro → aleatorio.
 * `random` se inyecta para poder testearla de forma determinista.
 */
export function cpuMove(state: GameState, random: () => number = Math.random): number | null {
  const empty = emptyCells(state.board)
  if (empty.length === 0 || state.winner) return null

  for (const i of empty) {
    if (applyMove(state, i)?.winner) return i
  }

  const asRival: GameState = { ...state, turn: other(state.turn) }
  for (const i of empty) {
    if (applyMove(asRival, i)?.winner) return i
  }

  if (empty.includes(4)) return 4
  return empty[Math.floor(random() * empty.length)] ?? null
}
