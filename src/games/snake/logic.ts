/**
 * Lógica pura del Snake. Sin React ni canvas: todo se puede testear.
 * La aleatoriedad (`rng`) se inyecta para que los tests sean deterministas.
 */

export type Direction = 'up' | 'down' | 'left' | 'right'
export type Mode = 'classic' | 'no-walls'
export type Status = 'playing' | 'over' | 'won'
export type Rng = () => number

export interface Point {
  readonly x: number
  readonly y: number
}

export interface SnakeConfig {
  readonly cols: number
  readonly rows: number
  readonly mode: Mode
  /** Nivel 1–9 (solo afecta al modo clásico) */
  readonly level: number
}

export interface SnakeState {
  readonly config: SnakeConfig
  /** Cabeza en la posición 0 */
  readonly snake: readonly Point[]
  readonly direction: Direction
  /** Giros pendientes: permite encadenar dos giros rápidos sin perder ninguno */
  readonly queue: readonly Direction[]
  readonly food: Point | null
  readonly score: number
  readonly eaten: number
  readonly status: Status
}

export const GRID_SIZE = 17
export const MIN_LEVEL = 1
export const MAX_LEVEL = 9
export const DEFAULT_LEVEL = 5
export const INITIAL_LENGTH = 3
export const MAX_QUEUED_TURNS = 2

/** Modo sin paredes: cada 5 comidas sube la velocidad. */
export const FOODS_PER_SPEED_UP = 5
const NO_WALLS_START_MS = 170
const NO_WALLS_STEP_MS = 12
const NO_WALLS_MIN_MS = 70

/** Modo clásico: velocidad fija según el nivel (1 = lento, 9 = muy rápido). */
const CLASSIC_SLOWEST_MS = 260
const CLASSIC_FASTEST_MS = 65

const VECTORS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

export const samePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y

export const clampLevel = (level: number) =>
  Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.round(level)))

/** Casillas libres del tablero, en orden de lectura. */
export function freeCells(snake: readonly Point[], cols: number, rows: number): Point[] {
  const occupied = new Set(snake.map((p) => p.y * cols + p.x))
  const cells: Point[] = []
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!occupied.has(y * cols + x)) cells.push({ x, y })
    }
  }
  return cells
}

/** Coloca la comida en una casilla libre al azar, o null si el tablero está lleno. */
export function spawnFood(snake: readonly Point[], cols: number, rows: number, rng: Rng): Point | null {
  const cells = freeCells(snake, cols, rows)
  if (cells.length === 0) return null
  return cells[Math.min(cells.length - 1, Math.floor(rng() * cells.length))] ?? null
}

export function createGame(config: Partial<SnakeConfig> = {}, rng: Rng = Math.random): SnakeState {
  const full: SnakeConfig = {
    cols: config.cols ?? GRID_SIZE,
    rows: config.rows ?? GRID_SIZE,
    mode: config.mode ?? 'classic',
    level: clampLevel(config.level ?? DEFAULT_LEVEL),
  }
  // Empieza en el centro, mirando a la derecha
  const cy = Math.floor(full.rows / 2)
  const cx = Math.floor(full.cols / 2)
  const snake = Array.from({ length: INITIAL_LENGTH }, (_, i) => ({ x: cx - i, y: cy }))

  return {
    config: full,
    snake,
    direction: 'right',
    queue: [],
    food: spawnFood(snake, full.cols, full.rows, rng),
    score: 0,
    eaten: 0,
    status: 'playing',
  }
}

/**
 * Encola un giro. Se ignora si es la misma dirección o la contraria
 * a la última dirección prevista (no se puede girar 180°).
 */
export function turn(state: SnakeState, dir: Direction): SnakeState {
  if (state.status !== 'playing') return state
  const last = state.queue[state.queue.length - 1] ?? state.direction
  if (dir === last || dir === OPPOSITE[last]) return state
  if (state.queue.length >= MAX_QUEUED_TURNS) return state
  return { ...state, queue: [...state.queue, dir] }
}

/** Puntos por comida: el nivel en clásico; el tramo de velocidad en sin paredes. */
export function pointsPerFood(state: Pick<SnakeState, 'config' | 'eaten'>): number {
  return state.config.mode === 'classic'
    ? state.config.level
    : 1 + Math.floor(state.eaten / FOODS_PER_SPEED_UP)
}

/** Milisegundos entre pasos. */
export function tickMs(state: Pick<SnakeState, 'config' | 'eaten'>): number {
  if (state.config.mode === 'classic') {
    const t = (state.config.level - MIN_LEVEL) / (MAX_LEVEL - MIN_LEVEL)
    return Math.round(CLASSIC_SLOWEST_MS - t * (CLASSIC_SLOWEST_MS - CLASSIC_FASTEST_MS))
  }
  const speedUps = Math.floor(state.eaten / FOODS_PER_SPEED_UP)
  return Math.max(NO_WALLS_MIN_MS, NO_WALLS_START_MS - speedUps * NO_WALLS_STEP_MS)
}

/** Avanza un paso. */
export function step(state: SnakeState, rng: Rng = Math.random): SnakeState {
  if (state.status !== 'playing') return state

  const { cols, rows, mode } = state.config
  const [nextDir = state.direction, ...queue] = state.queue
  const head = state.snake[0]!
  const v = VECTORS[nextDir]
  let next: Point = { x: head.x + v.x, y: head.y + v.y }

  const outside = next.x < 0 || next.y < 0 || next.x >= cols || next.y >= rows
  if (outside) {
    if (mode === 'classic') return { ...state, direction: nextDir, queue, status: 'over' }
    next = { x: (next.x + cols) % cols, y: (next.y + rows) % rows }
  }

  const eats = state.food !== null && samePoint(next, state.food)
  // Si no come, la cola se mueve en este mismo paso: su casilla queda libre.
  const body = eats ? state.snake : state.snake.slice(0, -1)
  if (body.some((p) => samePoint(p, next))) {
    return { ...state, direction: nextDir, queue, status: 'over' }
  }

  const snake = [next, ...body]
  if (!eats) return { ...state, snake, direction: nextDir, queue }

  const food = spawnFood(snake, cols, rows, rng)
  return {
    ...state,
    snake,
    direction: nextDir,
    queue,
    food,
    score: state.score + pointsPerFood(state),
    eaten: state.eaten + 1,
    status: food === null ? 'won' : 'playing',
  }
}
