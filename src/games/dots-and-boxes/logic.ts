/**
 * Lógica pura del Timbiriche (puntos y cajas). Sin React.
 *
 * Un tablero de `cols × rows` cajas tiene:
 *   - líneas horizontales: (rows + 1) filas × cols   → índices [0, H)
 *   - líneas verticales:   rows filas × (cols + 1)   → índices [H, H + V)
 * Cerrar una caja (su 4.ª línea) la gana y da otro turno.
 */

export type Player = 1 | 2
export type Level = 'easy' | 'normal' | 'hard'
export type Size = 'small' | 'medium' | 'large'
export type Rng = () => number

export interface DotsState {
  cols: number
  rows: number
  /** Quién trazó cada línea (0 = libre) */
  lines: (0 | Player)[]
  /** Dueño de cada caja (0 = sin cerrar) */
  boxes: (0 | Player)[]
  turn: Player
  score: Record<Player, number>
  lastLine: number | null
  /** Cajas cerradas con la última línea (para animarlas) */
  lastBoxes: number[]
  over: boolean
  winner: Player | null
}

export const SIZES: Record<Size, { cols: number; rows: number }> = {
  small: { cols: 4, rows: 4 },
  medium: { cols: 5, rows: 6 },
  large: { cols: 6, rows: 8 },
}

export const other = (p: Player): Player => (p === 1 ? 2 : 1)
export const hCount = (s: Pick<DotsState, 'cols' | 'rows'>) => (s.rows + 1) * s.cols
export const vCount = (s: Pick<DotsState, 'cols' | 'rows'>) => s.rows * (s.cols + 1)

/** Índice de la línea horizontal sobre la fila de puntos `r`, entre las columnas c y c+1. */
export const hLine = (s: Pick<DotsState, 'cols'>, r: number, c: number) => r * s.cols + c
/** Índice de la línea vertical en la columna de puntos `c`, entre las filas r y r+1. */
export const vLine = (s: Pick<DotsState, 'cols' | 'rows'>, r: number, c: number) => hCount(s) + r * (s.cols + 1) + c

/** Las 4 líneas de la caja (r, c): arriba, abajo, izquierda, derecha. */
export function boxLines(s: Pick<DotsState, 'cols' | 'rows'>, box: number): number[] {
  const r = Math.floor(box / s.cols)
  const c = box % s.cols
  return [hLine(s, r, c), hLine(s, r + 1, c), vLine(s, r, c), vLine(s, r, c + 1)]
}

/** Cajas que comparten una línea (1 si está en el borde, 2 si es interior). */
export function boxesOfLine(s: Pick<DotsState, 'cols' | 'rows'>, line: number): number[] {
  const H = hCount(s)
  const out: number[] = []
  if (line < H) {
    const r = Math.floor(line / s.cols)
    const c = line % s.cols
    if (r > 0) out.push((r - 1) * s.cols + c)
    if (r < s.rows) out.push(r * s.cols + c)
  } else {
    const k = line - H
    const r = Math.floor(k / (s.cols + 1))
    const c = k % (s.cols + 1)
    if (c > 0) out.push(r * s.cols + c - 1)
    if (c < s.cols) out.push(r * s.cols + c)
  }
  return out
}

export function createGame(size: { cols: number; rows: number } = SIZES.small, starter: Player = 1): DotsState {
  const base = { cols: size.cols, rows: size.rows }
  return {
    ...base,
    lines: Array(hCount(base) + vCount(base)).fill(0),
    boxes: Array(base.cols * base.rows).fill(0),
    turn: starter,
    score: { 1: 0, 2: 0 },
    lastLine: null,
    lastBoxes: [],
    over: false,
    winner: null,
  }
}

/** Líneas trazadas alrededor de una caja. */
export const sidesOf = (s: DotsState, box: number) => boxLines(s, box).filter((l) => s.lines[l] !== 0).length

export const freeLines = (s: DotsState) => s.lines.flatMap((v, i) => (v === 0 ? [i] : []))

/** Traza una línea. Si cierra cajas, el jugador repite turno. Devuelve null si no se puede. */
export function play(s: DotsState, line: number): DotsState | null {
  if (s.over || line < 0 || line >= s.lines.length || s.lines[line] !== 0) return null
  const lines = [...s.lines]
  lines[line] = s.turn
  const next = { ...s, lines }
  const closed = boxesOfLine(s, line).filter((b) => sidesOf(next, b) === 4)
  const boxes = [...s.boxes]
  for (const b of closed) boxes[b] = s.turn
  const score = { ...s.score, [s.turn]: s.score[s.turn] + closed.length }
  const over = boxes.every((b) => b !== 0)
  return {
    ...next,
    boxes,
    score,
    turn: closed.length > 0 ? s.turn : other(s.turn),
    lastLine: line,
    lastBoxes: closed,
    over,
    winner: over ? (score[1] === score[2] ? null : score[1] > score[2] ? 1 : 2) : null,
  }
}

// ─── CPU ─────────────────────────────────────────────────────────────────────

const pick = <T>(arr: T[], rng: Rng): T => arr[Math.floor(rng() * arr.length)]!

/** ¿Esta línea cierra alguna caja? */
const completes = (s: DotsState, line: number) => boxesOfLine(s, line).some((b) => sidesOf(s, b) === 3)

/** ¿Esta línea deja alguna caja con 3 lados (se la regala al rival)? */
const gives = (s: DotsState, line: number) => boxesOfLine(s, line).some((b) => sidesOf(s, b) === 2)

/**
 * Cuántas cajas se lleva el rival si trazo `line` y él cierra todo lo que pueda
 * (en cadena) mientras tenga cajas de 3 lados.
 */
export function sacrifice(s: DotsState, line: number): number {
  let state = play(s, line)
  if (!state) return Infinity
  const rival = state.turn
  if (rival === s.turn) return 0 // la línea cerró caja: sigo yo
  let taken = 0
  for (;;) {
    const current: DotsState = state
    const closing: number | undefined = freeLines(current).find((l) => completes(current, l))
    if (closing === undefined || current.over) break
    const next = play(current, closing)!
    taken += next.score[rival] - current.score[rival]
    state = next
  }
  return taken
}

/** Línea que elige la CPU para el jugador en turno. */
export function cpuMove(s: DotsState, level: Level, rng: Rng = Math.random): number {
  const free = freeLines(s)
  if (free.length === 0) return -1

  if (level === 'easy') {
    // Cierra cajas a veces y, si no, juega al azar
    const closing = free.filter((l) => completes(s, l))
    if (closing.length && rng() < 0.6) return pick(closing, rng)
    return pick(free, rng)
  }

  // Normal y difícil: siempre cierra lo que pueda
  const closing = free.filter((l) => completes(s, l))
  if (closing.length) return pick(closing, rng)

  // No regalar cajas mientras haya jugadas seguras
  const safe = free.filter((l) => !gives(s, l))
  if (safe.length) return pick(safe, rng)

  if (level === 'normal') return pick(free, rng)

  // Difícil: obligado a regalar, regala lo mínimo
  let best = Infinity
  let options: number[] = []
  for (const l of free) {
    const cost = sacrifice(s, l)
    if (cost < best) {
      best = cost
      options = [l]
    } else if (cost === best) options.push(l)
  }
  return pick(options, rng)
}
