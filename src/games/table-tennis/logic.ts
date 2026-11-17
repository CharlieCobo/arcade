/**
 * Lógica pura de tenis de mesa en vertical: un jugador abajo y otro arriba.
 * Coordenadas lógicas fijas (FIELD_W × FIELD_H); la interfaz las escala.
 * La física avanza en pasos fijos y la aleatoriedad (`rng`) se inyecta.
 */

export type Side = 'bottom' | 'top'
export type Mode = 'pvp' | 'cpu'
export type CpuLevel = 'easy' | 'normal' | 'hard'
export type Status = 'playing' | 'over'
export type Rng = () => number

export interface Paddle {
  x: number
  /** Posición deseada (dedo o CPU) */
  target: number | null
  /** Dirección por teclado */
  dir: -1 | 0 | 1
}

export interface Ball {
  x: number
  y: number
  dx: number
  dy: number
  speed: number
}

export type GameEvent =
  | { type: 'hit'; side: Side; x: number; y: number; rally: number }
  | { type: 'wall'; x: number; y: number }
  | { type: 'point'; scorer: Side }
  | { type: 'serve'; to: Side }
  | { type: 'win'; winner: Side }

export interface PongState {
  mode: Mode
  cpuLevel: CpuLevel
  /** Puntos para ganar el partido */
  target: number
  score: Record<Side, number>
  paddles: Record<Side, Paddle>
  ball: Ball
  /** ms que faltan para sacar (la bola espera en el centro) */
  serveMs: number
  /** Hacia quién va el próximo saque */
  receiver: Side
  status: Status
  winner: Side | null
  /** Golpes seguidos en el punto actual */
  rally: number
  /** Rally más largo de la partida */
  bestRally: number
  /** Error de puntería de la CPU para la jugada actual */
  cpuError: number
  events: GameEvent[]
  acc: number
}

// ─── Constantes ──────────────────────────────────────────────────────────────

export const FIELD_W = 320
export const FIELD_H = 600
export const STEP_MS = 4
export const PADDLE_W = 66
export const PADDLE_H = 10
/** Centro vertical de cada pala */
export const PADDLE_Y: Record<Side, number> = { bottom: FIELD_H - 34, top: 34 }
export const BALL_R = 6
export const START_SPEED = 250
export const MAX_SPEED = 600
const SPEED_UP = 1.055
const MAX_ANGLE = (55 * Math.PI) / 180
const SERVE_ANGLE = (28 * Math.PI) / 180
export const SERVE_MS = 900
const TOUCH_SPEED = 1500
const KEY_SPEED = 380
export const TARGETS = [5, 7, 11] as const

/** Velocidad máxima de la CPU y error de puntería (px) por nivel. */
export const CPU: Record<CpuLevel, { speed: number; error: number; reaction: number }> = {
  easy: { speed: 190, error: 34, reaction: 0.45 },
  normal: { speed: 290, error: 18, reaction: 0.62 },
  hard: { speed: 430, error: 7, reaction: 0.85 },
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
export const other = (s: Side): Side => (s === 'bottom' ? 'top' : 'bottom')

const centeredBall = (): Ball => ({ x: FIELD_W / 2, y: FIELD_H / 2, dx: 0, dy: 0, speed: START_SPEED })

export function createGame(opts: { mode?: Mode; cpuLevel?: CpuLevel; target?: number } = {}, rng: Rng = Math.random): PongState {
  return {
    mode: opts.mode ?? 'cpu',
    cpuLevel: opts.cpuLevel ?? 'normal',
    target: opts.target ?? 7,
    score: { bottom: 0, top: 0 },
    paddles: {
      bottom: { x: FIELD_W / 2, target: null, dir: 0 },
      top: { x: FIELD_W / 2, target: null, dir: 0 },
    },
    ball: centeredBall(),
    serveMs: SERVE_MS,
    // El primer saque va hacia el jugador de abajo (tú)
    receiver: 'bottom',
    status: 'playing',
    winner: null,
    rally: 0,
    bestRally: 0,
    cpuError: (rng() * 2 - 1) * CPU[opts.cpuLevel ?? 'normal'].error,
    events: [],
    acc: 0,
  }
}

// ─── Entrada ─────────────────────────────────────────────────────────────────

/** Posición deseada de una pala (control táctil). */
export function setTarget(s: PongState, side: Side, x: number | null): PongState {
  return { ...s, paddles: { ...s.paddles, [side]: { ...s.paddles[side], target: x === null ? null : clamp(x, 0, FIELD_W), dir: 0 } } }
}

/** Dirección de una pala (teclado). */
export function setDir(s: PongState, side: Side, dir: -1 | 0 | 1): PongState {
  return { ...s, paddles: { ...s.paddles, [side]: { ...s.paddles[side], dir, target: dir === 0 ? s.paddles[side].target : null } } }
}

// ─── Física ──────────────────────────────────────────────────────────────────

/** Dirección de salida según el punto de la pala: centro = recto, bordes = 55°. */
export function bounceDirection(offset: number, side: Side) {
  const t = clamp(offset / (PADDLE_W / 2), -1, 1)
  const angle = t * MAX_ANGLE
  return { dx: Math.sin(angle), dy: side === 'bottom' ? -Math.cos(angle) : Math.cos(angle) }
}

/**
 * Dónde cruzará la bola la altura `y`, teniendo en cuenta los rebotes en las paredes.
 * Es lo que "piensa" la CPU.
 */
export function predictX(ball: Ball, y: number): number {
  if (ball.dy === 0) return ball.x
  const t = (y - ball.y) / ball.dy
  if (t < 0) return ball.x
  const raw = ball.x + ball.dx * t
  // Reflejar dentro de [r, W - r]
  const min = BALL_R
  const span = FIELD_W - 2 * BALL_R
  let p = (raw - min) % (2 * span)
  if (p < 0) p += 2 * span
  return min + (p > span ? 2 * span - p : p)
}

function moveTowards(p: Paddle, target: number, maxSpeed: number, ms: number) {
  const max = maxSpeed * (ms / 1000)
  p.x += clamp(target - p.x, -max, max)
}

function stepPaddles(s: PongState, ms: number) {
  for (const side of ['bottom', 'top'] as Side[]) {
    const p = s.paddles[side]
    const isCpu = s.mode === 'cpu' && side === 'top'
    if (isCpu) {
      const cfg = CPU[s.cpuLevel]
      const coming = s.ball.dy < 0 && s.serveMs <= 0
      // Reacciona cuando la bola ha cruzado parte del campo hacia ella
      const seen = s.ball.y < FIELD_H * cfg.reaction
      const goal = coming && seen ? predictX(s.ball, PADDLE_Y.top) + s.cpuError : FIELD_W / 2
      moveTowards(p, goal, coming ? cfg.speed : cfg.speed * 0.4, ms)
    } else if (p.target !== null) {
      moveTowards(p, p.target, TOUCH_SPEED, ms)
    } else if (p.dir !== 0) {
      p.x += p.dir * KEY_SPEED * (ms / 1000)
    }
    p.x = clamp(p.x, PADDLE_W / 2, FIELD_W - PADDLE_W / 2)
  }
}

function serve(s: PongState, rng: Rng) {
  const angle = (rng() * 2 - 1) * SERVE_ANGLE
  const toBottom = s.receiver === 'bottom'
  s.ball = {
    x: FIELD_W / 2,
    y: FIELD_H / 2,
    dx: Math.sin(angle),
    dy: toBottom ? Math.cos(angle) : -Math.cos(angle),
    speed: START_SPEED,
  }
  s.events.push({ type: 'serve', to: s.receiver })
}

function scorePoint(s: PongState, scorer: Side, rng: Rng) {
  s.score = { ...s.score, [scorer]: s.score[scorer] + 1 }
  s.events.push({ type: 'point', scorer })
  s.rally = 0
  if (s.score[scorer] >= s.target) {
    s.status = 'over'
    s.winner = scorer
    s.events.push({ type: 'win', winner: scorer })
    return
  }
  // Saca hacia quien ha perdido el punto
  s.receiver = other(scorer)
  s.ball = centeredBall()
  s.serveMs = SERVE_MS
  s.cpuError = (rng() * 2 - 1) * CPU[s.cpuLevel].error
}

function hitPaddle(s: PongState, side: Side, rng: Rng): boolean {
  const b = s.ball
  const p = s.paddles[side]
  const py = PADDLE_Y[side]
  const movingTowards = side === 'bottom' ? b.dy > 0 : b.dy < 0
  if (!movingTowards) return false
  const reach = side === 'bottom' ? b.y + BALL_R >= py - PADDLE_H / 2 && b.y - BALL_R <= py + PADDLE_H / 2 : b.y - BALL_R <= py + PADDLE_H / 2 && b.y + BALL_R >= py - PADDLE_H / 2
  if (!reach || Math.abs(b.x - p.x) > PADDLE_W / 2 + BALL_R) return false

  Object.assign(b, bounceDirection(b.x - p.x, side))
  b.y = side === 'bottom' ? py - PADDLE_H / 2 - BALL_R : py + PADDLE_H / 2 + BALL_R
  b.speed = Math.min(MAX_SPEED, b.speed * SPEED_UP)
  s.rally += 1
  s.bestRally = Math.max(s.bestRally, s.rally)
  s.events.push({ type: 'hit', side, x: b.x, y: b.y, rally: s.rally })
  // La CPU recalcula su error de puntería en cada golpe del jugador
  if (side === 'bottom') s.cpuError = (rng() * 2 - 1) * CPU[s.cpuLevel].error
  return true
}

function step(s: PongState, ms: number, rng: Rng) {
  stepPaddles(s, ms)

  if (s.serveMs > 0) {
    s.serveMs -= ms
    if (s.serveMs <= 0) serve(s, rng)
    return
  }

  const b = s.ball
  b.x += b.dx * b.speed * (ms / 1000)
  b.y += b.dy * b.speed * (ms / 1000)

  if (b.x < BALL_R) {
    b.x = BALL_R
    b.dx = Math.abs(b.dx)
    s.events.push({ type: 'wall', x: b.x, y: b.y })
  } else if (b.x > FIELD_W - BALL_R) {
    b.x = FIELD_W - BALL_R
    b.dx = -Math.abs(b.dx)
    s.events.push({ type: 'wall', x: b.x, y: b.y })
  }

  if (hitPaddle(s, 'bottom', rng) || hitPaddle(s, 'top', rng)) return

  if (b.y - BALL_R > FIELD_H) scorePoint(s, 'top', rng)
  else if (b.y + BALL_R < 0) scorePoint(s, 'bottom', rng)
}

function clone(s: PongState): PongState {
  return {
    ...s,
    score: { ...s.score },
    paddles: { bottom: { ...s.paddles.bottom }, top: { ...s.paddles.top } },
    ball: { ...s.ball },
    events: [],
  }
}

/** Avanza el tiempo. Devuelve un estado nuevo (el anterior no se modifica). */
export function update(state: PongState, dtMs: number, rng: Rng = Math.random): PongState {
  if (state.status !== 'playing') return state
  const s = clone(state)
  s.acc += dtMs
  while (s.acc >= STEP_MS && s.status === 'playing') {
    step(s, STEP_MS, rng)
    s.acc -= STEP_MS
  }
  return s
}
