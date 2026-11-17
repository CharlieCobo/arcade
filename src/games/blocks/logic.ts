/**
 * Lógica pura del juego de bloques (estilo "guideline" moderno):
 * tablero 10×20, rotación SRS con wall kicks, generador 7-bag,
 * lock delay, puntuación por líneas × nivel y subida de nivel cada 10 líneas.
 *
 * Sin React ni canvas. La aleatoriedad (`rng`) se inyecta para testear.
 */

export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'
export type Cell = PieceType | null
export type Rotation = 0 | 1 | 2 | 3
export type Rng = () => number
export type Status = 'playing' | 'over'

export interface Point {
  readonly x: number
  readonly y: number
}

export interface Active {
  readonly type: PieceType
  readonly rotation: Rotation
  /** Esquina superior izquierda de la caja de la pieza */
  readonly x: number
  readonly y: number
}

export interface BlocksState {
  /** Celdas fila a fila, incluidas las HIDDEN_ROWS ocultas de arriba */
  readonly board: readonly Cell[]
  readonly active: Active | null
  /** Próximas piezas (siempre al menos PREVIEW_COUNT) */
  readonly queue: readonly PieceType[]
  readonly score: number
  readonly lines: number
  readonly level: number
  readonly startLevel: number
  readonly status: Status
  /** ms acumulados hacia la siguiente caída por gravedad */
  readonly gravityMs: number
  /** ms que la pieza lleva apoyada (null si está en el aire) */
  readonly lockMs: number | null
  readonly lockResets: number
  /** Líneas de la última pieza fijada (para efectos en la interfaz) */
  readonly lastClear: number
  /** Se incrementa con cada pieza fijada (para detectar cambios desde la interfaz) */
  readonly pieces: number
}

export const COLS = 10
export const ROWS = 20
export const HIDDEN_ROWS = 2
export const TOTAL_ROWS = ROWS + HIDDEN_ROWS
export const PREVIEW_COUNT = 3
export const MIN_START_LEVEL = 1
export const MAX_START_LEVEL = 15
export const LINES_PER_LEVEL = 10
export const LOCK_DELAY_MS = 500
export const MAX_LOCK_RESETS = 15

export const PIECES: readonly PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

/** Colores clásicos de cada pieza, ajustados para el fondo oscuro de la app. */
export const PIECE_COLORS: Record<PieceType, string> = {
  I: '#3fd9f5', // cian
  O: '#f7d038', // amarillo
  T: '#a35cf0', // morado
  S: '#5ad65a', // verde
  Z: '#f0505a', // rojo
  J: '#3b6ff0', // azul
  L: '#f59a3a', // naranja
}

/** Estado 0 (aparición) de cada pieza dentro de su caja: n = tamaño de la caja. */
const SPAWN_SHAPES: Record<PieceType, { n: number; cells: Point[] }> = {
  I: { n: 4, cells: [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }] },
  O: { n: 2, cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }] },
  T: { n: 3, cells: [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }] },
  S: { n: 3, cells: [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }] },
  Z: { n: 3, cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }] },
  J: { n: 3, cells: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }] },
  L: { n: 3, cells: [{ x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }] },
}

/**
 * Las 4 rotaciones salen de girar el estado 0 sobre el centro de su caja.
 * Con cajas de 3×3 (JLSTZ), 4×4 (I) y 2×2 (O) esto reproduce exactamente SRS.
 */
const rotateCw = (cells: Point[], n: number): Point[] => cells.map(({ x, y }) => ({ x: n - 1 - y, y: x }))

export const SHAPES: Record<PieceType, readonly (readonly Point[])[]> = Object.fromEntries(
  PIECES.map((type) => {
    const { n, cells } = SPAWN_SHAPES[type]
    const states = [cells]
    for (let r = 1; r < 4; r++) states.push(rotateCw(states[r - 1]!, n))
    return [type, states]
  }),
) as Record<PieceType, Point[][]>

/** Columna de aparición (centrada, como en el estándar). */
const SPAWN_X: Record<PieceType, number> = { I: 3, O: 4, T: 3, S: 3, Z: 3, J: 3, L: 3 }

/**
 * Wall kicks SRS. Tablas en coordenadas con y hacia ABAJO
 * (las de referencia usan y hacia arriba: aquí ya está invertida).
 */
type Kicks = Record<string, readonly [number, number][]>
const KICKS_JLSTZ: Kicks = {
  '0>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '1>0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '1>2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '2>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '2>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '3>2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '3>0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '0>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
}
const KICKS_I: Kicks = {
  '0>1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '1>0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '1>2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  '2>1': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '2>3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '3>2': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '3>0': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '0>3': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
}

/** Puntos por líneas a la vez (× nivel). */
export const LINE_SCORES = [0, 100, 300, 500, 800] as const

export const clampStartLevel = (level: number) =>
  Math.min(MAX_START_LEVEL, Math.max(MIN_START_LEVEL, Math.round(level)))

/** Nivel según líneas: sube solo, cada 10 líneas, desde el nivel elegido. */
export const levelFor = (startLevel: number, lines: number) =>
  startLevel + Math.floor(lines / LINES_PER_LEVEL)

/** ms por fila según el nivel (curva estándar: nivel 1 = 1 s, nivel 15 ≈ 7 ms). */
export function gravityMs(level: number): number {
  const seconds = Math.pow(0.8 - (level - 1) * 0.007, level - 1)
  return Math.max(1, seconds * 1000)
}

export const cellsOf = (p: Active): Point[] =>
  SHAPES[p.type][p.rotation]!.map(({ x, y }) => ({ x: p.x + x, y: p.y + y }))

const idx = (x: number, y: number) => y * COLS + x

export function collides(board: readonly Cell[], piece: Active): boolean {
  return cellsOf(piece).some(
    ({ x, y }) => x < 0 || x >= COLS || y < 0 || y >= TOTAL_ROWS || board[idx(x, y)] !== null,
  )
}

/** Bolsa de 7: cada tanda de 7 piezas contiene una de cada, en orden aleatorio. */
export function newBag(rng: Rng): PieceType[] {
  const bag = [...PIECES]
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[bag[i], bag[j]] = [bag[j]!, bag[i]!]
  }
  return bag
}

const refill = (queue: readonly PieceType[], rng: Rng): PieceType[] =>
  queue.length > PREVIEW_COUNT ? [...queue] : [...queue, ...newBag(rng)]

export const emptyBoard = (): Cell[] => Array<Cell>(COLS * TOTAL_ROWS).fill(null)

/** Saca la siguiente pieza de la cola. Si no cabe, la partida termina. */
function spawn(state: BlocksState, rng: Rng): BlocksState {
  const [type, ...rest] = refill(state.queue, rng)
  let piece: Active = { type: type!, rotation: 0, x: SPAWN_X[type!], y: 0 }
  if (collides(state.board, piece)) {
    return { ...state, active: null, queue: refill(rest, rng), status: 'over' }
  }
  // Aparece en las filas ocultas y baja una enseguida para que se vea
  const down = { ...piece, y: piece.y + 1 }
  if (!collides(state.board, down)) piece = down

  return { ...state, active: piece, queue: refill(rest, rng), gravityMs: 0, lockMs: null, lockResets: 0 }
}

export function createGame(startLevel = MIN_START_LEVEL, rng: Rng = Math.random): BlocksState {
  const level = clampStartLevel(startLevel)
  const base: BlocksState = {
    board: emptyBoard(),
    active: null,
    queue: newBag(rng),
    score: 0,
    lines: 0,
    level,
    startLevel: level,
    status: 'playing',
    gravityMs: 0,
    lockMs: null,
    lockResets: 0,
    lastClear: 0,
    pieces: 0,
  }
  return spawn(base, rng)
}

const isGrounded = (state: BlocksState, p: Active) => collides(state.board, { ...p, y: p.y + 1 })

/**
 * Tras mover o girar con éxito: si la pieza está apoyada, el lock delay
 * se reinicia (hasta MAX_LOCK_RESETS veces, para que no se pueda alargar sin fin).
 */
function afterMove(state: BlocksState, piece: Active): BlocksState {
  if (!isGrounded(state, piece)) return { ...state, active: piece, lockMs: null }
  if (state.lockMs === null) return { ...state, active: piece, lockMs: 0 }
  if (state.lockResets >= MAX_LOCK_RESETS) return { ...state, active: piece }
  return { ...state, active: piece, lockMs: 0, lockResets: state.lockResets + 1 }
}

export function move(state: BlocksState, dx: -1 | 1): BlocksState {
  const p = state.active
  if (state.status !== 'playing' || !p) return state
  const next = { ...p, x: p.x + dx }
  return collides(state.board, next) ? state : afterMove(state, next)
}

export function rotate(state: BlocksState, dir: 1 | -1): BlocksState {
  const p = state.active
  if (state.status !== 'playing' || !p || p.type === 'O') return state
  const to = ((p.rotation + dir + 4) % 4) as Rotation
  const kicks = (p.type === 'I' ? KICKS_I : KICKS_JLSTZ)[`${p.rotation}>${to}`]!
  for (const [kx, ky] of kicks) {
    const next: Active = { ...p, rotation: to, x: p.x + kx, y: p.y + ky }
    if (!collides(state.board, next)) return afterMove(state, next)
  }
  return state
}

/** Fija la pieza, limpia líneas, suma puntos, sube nivel y saca la siguiente. */
function lock(state: BlocksState, rng: Rng): BlocksState {
  const p = state.active
  if (!p) return state
  const cells = cellsOf(p)
  const board = [...state.board]
  for (const { x, y } of cells) board[idx(x, y)] = p.type

  // Si la pieza queda entera en las filas ocultas, se acabó ("lock out")
  if (cells.every(({ y }) => y < HIDDEN_ROWS)) {
    return { ...state, board, active: null, status: 'over', pieces: state.pieces + 1 }
  }

  const rows: Cell[][] = []
  for (let y = 0; y < TOTAL_ROWS; y++) rows.push(board.slice(y * COLS, (y + 1) * COLS))
  const kept = rows.filter((row) => row.some((c) => c === null))
  const cleared = TOTAL_ROWS - kept.length
  const newRows = Array.from({ length: cleared }, () => Array<Cell>(COLS).fill(null))
  const nextBoard = [...newRows, ...kept].flat()

  const lines = state.lines + cleared
  const next: BlocksState = {
    ...state,
    board: nextBoard,
    active: null,
    score: state.score + LINE_SCORES[cleared as 0 | 1 | 2 | 3 | 4] * state.level,
    lines,
    level: Math.max(state.level, levelFor(state.startLevel, lines)),
    lastClear: cleared,
    pieces: state.pieces + 1,
  }
  return spawn(next, rng)
}

/** Bajada suave: una fila, +1 punto. */
export function softDrop(state: BlocksState): BlocksState {
  const p = state.active
  if (state.status !== 'playing' || !p) return state
  const next = { ...p, y: p.y + 1 }
  if (collides(state.board, next)) return state
  return { ...afterMove(state, next), score: state.score + 1, gravityMs: 0 }
}

/** Fila donde caería la pieza (para la sombra y la bajada rápida). */
export function ghostOf(state: BlocksState): Active | null {
  const p = state.active
  if (!p) return null
  let y = p.y
  while (!collides(state.board, { ...p, y: y + 1 })) y++
  return { ...p, y }
}

/** Bajada rápida: cae del todo y se fija. +2 puntos por fila. */
export function hardDrop(state: BlocksState, rng: Rng = Math.random): BlocksState {
  const ghost = ghostOf(state)
  if (state.status !== 'playing' || !ghost || !state.active) return state
  const distance = ghost.y - state.active.y
  return lock({ ...state, active: ghost, score: state.score + distance * 2 }, rng)
}

/** Avanza el tiempo: gravedad y lock delay. */
export function update(state: BlocksState, dt: number, rng: Rng = Math.random): BlocksState {
  if (state.status !== 'playing' || !state.active) return state
  let s = state
  let p = state.active

  if (isGrounded(s, p)) {
    const lockMs = (s.lockMs ?? 0) + dt
    return lockMs >= LOCK_DELAY_MS ? lock(s, rng) : { ...s, lockMs, gravityMs: 0 }
  }

  let acc = s.gravityMs + dt
  const g = gravityMs(s.level)
  while (acc >= g) {
    const next = { ...p, y: p.y + 1 }
    if (collides(s.board, next)) break
    p = next
    acc -= g
  }
  s = { ...s, active: p, gravityMs: isGrounded(s, p) ? 0 : acc }
  return isGrounded(s, p) ? { ...s, lockMs: s.lockMs ?? 0 } : { ...s, lockMs: null }
}

/** Celdas visibles (sin las filas ocultas), para dibujar. */
export const visibleRow = (y: number) => y - HIDDEN_ROWS
