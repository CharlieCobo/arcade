/**
 * Lógica pura de Brick Bash. Sin React ni canvas.
 * Coordenadas lógicas fijas (FIELD_W × FIELD_H); la interfaz las escala.
 * La física avanza en pasos fijos (STEP_MS) para ser estable y testeable,
 * y la aleatoriedad (`rng`) se inyecta.
 */
import { LEVELS, METAL_COLOR, ROW_COLORS } from './levels'

export type Difficulty = 'easy' | 'normal' | 'hard'
export type PowerType = 'expand' | 'laser' | 'catch' | 'slow' | 'multi' | 'life'
export type PaddleMode = 'none' | 'expand' | 'laser' | 'catch'
export type Status = 'playing' | 'cleared' | 'over'
export type Rng = () => number

export interface Ball {
  x: number
  y: number
  /** Dirección unitaria */
  dx: number
  dy: number
  speed: number
  /** Si está pegada a la pala: desplazamiento respecto a su centro */
  stuck: number | null
  stuckMs: number
}

export interface Brick {
  id: number
  x: number
  y: number
  w: number
  h: number
  /** Golpes restantes; -1 = metal (irrompible) */
  hp: number
  maxHp: number
  color: string
}

export interface Capsule {
  x: number
  y: number
  type: PowerType
}

export interface Bullet {
  x: number
  y: number
}

export type GameEvent =
  | { type: 'brick'; x: number; y: number; color: string; destroyed: boolean; points: number; combo: number }
  | { type: 'metal'; x: number; y: number }
  | { type: 'paddle' }
  | { type: 'wall' }
  | { type: 'power'; power: PowerType; x: number; y: number }
  | { type: 'lost' }
  | { type: 'cleared'; bonus: number }
  | { type: 'laser' }

export interface BrickBashState {
  difficulty: Difficulty
  /** Nivel jugado (1, 2, 3...). Tras el último diseño, se repiten más rápido. */
  level: number
  lives: number
  score: number
  /** Ladrillos seguidos sin tocar la pala */
  combo: number
  status: Status
  paddle: { x: number; y: number; baseW: number }
  mode: PaddleMode
  slowMs: number
  balls: Ball[]
  bricks: Brick[]
  capsules: Capsule[]
  bullets: Bullet[]
  laserCooldown: number
  input: { target: number | null; dir: -1 | 0 | 1 }
  /** Eventos del último update (para sonidos, partículas, vibración) */
  events: GameEvent[]
  /** ms pendientes de simular */
  acc: number
}

// ─── Constantes ──────────────────────────────────────────────────────────────

export const FIELD_W = 320
export const FIELD_H = 480
export const COLS = 10
export const STEP_MS = 4
const WALL_MARGIN = 8
const BRICK_TOP = 44
export const BRICK_H = 14
const BRICK_GAP = 2
export const BALL_R = 5
export const PADDLE_Y = 444
export const PADDLE_H = 10
const PADDLE_SPEED = 360
const PADDLE_FOLLOW_SPEED = 1400
export const CAPSULE_W = 26
export const CAPSULE_H = 12
const CAPSULE_SPEED = 95
const BULLET_SPEED = 460
const LASER_COOLDOWN_MS = 280
const CATCH_RELEASE_MS = 3000
export const SLOW_MS = 10000
const SLOW_FACTOR = 0.65
const MAX_BOUNCE_ANGLE = (60 * Math.PI) / 180
const MIN_VERTICAL = 0.28
const SPEED_UP_PER_HIT = 1.015
export const EXPAND_FACTOR = 1.5
export const MAX_LIVES = 9
export const MAX_BALLS = 6
export const MAX_COMBO_MULTIPLIER = 4
const COMBO_STEP = 5
const LOOP_SPEED_BONUS = 0.1
const LEVEL_SPEED_BONUS = 0.03
const CAPSULE_POINTS = 100

export interface DifficultyConfig {
  lives: number
  paddleW: number
  speed: number
  maxSpeed: number
  dropChance: number
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: { lives: 5, paddleW: 70, speed: 210, maxSpeed: 330, dropChance: 0.24 },
  normal: { lives: 3, paddleW: 58, speed: 250, maxSpeed: 400, dropChance: 0.17 },
  hard: { lives: 2, paddleW: 48, speed: 295, maxSpeed: 480, dropChance: 0.11 },
}

export const POWER_WEIGHTS: Record<PowerType, number> = {
  expand: 22,
  laser: 16,
  catch: 15,
  slow: 18,
  multi: 19,
  life: 10,
}

export const POWER_COLORS: Record<PowerType, string> = {
  expand: '#4cc9f0',
  laser: '#ff5d8f',
  catch: '#5ad65a',
  slow: '#f59a3a',
  multi: '#a35cf0',
  life: '#f0505a',
}

export const POWER_LETTERS: Record<PowerType, string> = {
  expand: 'E',
  laser: 'L',
  catch: 'C',
  slow: 'S',
  multi: 'M',
  life: '+',
}

const BRICK_POINTS = [0, 50, 100, 150]

// ─── Utilidades ──────────────────────────────────────────────────────────────

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export const paddleWidth = (s: Pick<BrickBashState, 'paddle' | 'mode'>) =>
  s.mode === 'expand' ? s.paddle.baseW * EXPAND_FACTOR : s.paddle.baseW

/** Velocidad inicial de la bola en un nivel (sube un poco cada nivel y en cada vuelta). */
export function levelSpeed(difficulty: Difficulty, level: number): number {
  const cfg = DIFFICULTIES[difficulty]
  const loop = Math.floor((level - 1) / LEVELS.length)
  const inLoop = (level - 1) % LEVELS.length
  return Math.min(cfg.maxSpeed, cfg.speed * (1 + loop * LOOP_SPEED_BONUS + inLoop * LEVEL_SPEED_BONUS))
}

export const comboMultiplier = (combo: number) => Math.min(MAX_COMBO_MULTIPLIER, 1 + Math.floor(combo / COMBO_STEP))

export function levelDef(level: number) {
  return LEVELS[(level - 1) % LEVELS.length]!
}

/** Construye los ladrillos de un nivel. */
export function buildBricks(level: number): Brick[] {
  const def = levelDef(level)
  const w = (FIELD_W - WALL_MARGIN * 2) / COLS
  const bricks: Brick[] = []
  let id = 0
  def.rows.forEach((row, r) => {
    ;[...row].forEach((ch, c) => {
      if (ch === '.') return
      const hp = ch === '#' ? -1 : Number(ch)
      bricks.push({
        id: id++,
        x: WALL_MARGIN + c * w + BRICK_GAP / 2,
        y: BRICK_TOP + r * (BRICK_H + BRICK_GAP),
        w: w - BRICK_GAP,
        h: BRICK_H,
        hp,
        maxHp: hp,
        color: hp === -1 ? METAL_COLOR : ROW_COLORS[r % ROW_COLORS.length]!,
      })
    })
  })
  return bricks
}

const serveBall = (s: Pick<BrickBashState, 'paddle' | 'difficulty' | 'level'>): Ball => ({
  x: s.paddle.x,
  y: s.paddle.y - BALL_R - 1,
  dx: 0,
  dy: -1,
  speed: levelSpeed(s.difficulty, s.level),
  stuck: 8, // un poco a la derecha: el saque sale ligeramente en diagonal
  stuckMs: 0,
})

export function createGame(difficulty: Difficulty = 'normal', level = 1): BrickBashState {
  const cfg = DIFFICULTIES[difficulty]
  const base = {
    difficulty,
    level,
    paddle: { x: FIELD_W / 2, y: PADDLE_Y, baseW: cfg.paddleW },
  }
  return {
    ...base,
    lives: cfg.lives,
    score: 0,
    combo: 0,
    status: 'playing',
    mode: 'none',
    slowMs: 0,
    balls: [serveBall(base)],
    bricks: buildBricks(level),
    capsules: [],
    bullets: [],
    laserCooldown: 0,
    input: { target: null, dir: 0 },
    events: [],
    acc: 0,
  }
}

/** Pasa al siguiente nivel conservando puntos y vidas. */
export function nextLevel(s: BrickBashState): BrickBashState {
  const level = s.level + 1
  const paddle = { ...s.paddle, x: FIELD_W / 2 }
  return {
    ...s,
    level,
    status: 'playing',
    combo: 0,
    mode: 'none',
    slowMs: 0,
    paddle,
    balls: [serveBall({ paddle, difficulty: s.difficulty, level })],
    bricks: buildBricks(level),
    capsules: [],
    bullets: [],
    events: [],
    acc: 0,
  }
}

// ─── Entrada ─────────────────────────────────────────────────────────────────

/** Posición objetivo de la pala (control táctil). null = sin objetivo. */
export const setTarget = (s: BrickBashState, x: number | null): BrickBashState => ({
  ...s,
  input: { ...s.input, target: x === null ? null : clamp(x, 0, FIELD_W) },
})

/** Dirección de la pala (teclado). */
export const setDir = (s: BrickBashState, dir: -1 | 0 | 1): BrickBashState => ({
  ...s,
  input: { target: dir === 0 ? s.input.target : null, dir },
})

/** Botón de acción: lanza las bolas pegadas o dispara el láser. */
export function action(s: BrickBashState): BrickBashState {
  if (s.status !== 'playing') return s
  if (s.balls.some((b) => b.stuck !== null)) {
    return { ...s, balls: s.balls.map((b) => (b.stuck !== null ? launch(b, s) : b)) }
  }
  if (s.mode === 'laser' && s.laserCooldown <= 0) {
    const half = paddleWidth(s) / 2 - 4
    return {
      ...s,
      bullets: [...s.bullets, { x: s.paddle.x - half, y: s.paddle.y }, { x: s.paddle.x + half, y: s.paddle.y }],
      laserCooldown: LASER_COOLDOWN_MS,
      events: [...s.events, { type: 'laser' }],
    }
  }
  return s
}

/** Dirección de salida según el punto de la pala: centro = recto, bordes = 60°. */
export function bounceDirection(offset: number, halfWidth: number) {
  const t = clamp(offset / halfWidth, -1, 1)
  const angle = t * MAX_BOUNCE_ANGLE
  return { dx: Math.sin(angle), dy: -Math.cos(angle) }
}

function launch(b: Ball, s: Pick<BrickBashState, 'paddle' | 'mode'>): Ball {
  const dir = bounceDirection(b.stuck ?? 0, paddleWidth(s) / 2)
  return { ...b, ...dir, stuck: null, stuckMs: 0 }
}

// ─── Power-ups ───────────────────────────────────────────────────────────────

export function pickPower(rng: Rng): PowerType {
  const entries = Object.entries(POWER_WEIGHTS) as [PowerType, number][]
  const total = entries.reduce((a, [, w]) => a + w, 0)
  let r = rng() * total
  for (const [type, w] of entries) {
    if ((r -= w) < 0) return type
  }
  return entries[0]![0]
}

function rotate(b: Ball, angle: number): Ball {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  let dx = b.dx * cos - b.dy * sin
  let dy = b.dx * sin + b.dy * cos
  if (dy > -MIN_VERTICAL) dy = -Math.max(MIN_VERTICAL, Math.abs(dy)) // que no salga hacia abajo
  const len = Math.hypot(dx, dy)
  dx /= len
  dy /= len
  return { ...b, dx, dy }
}

export function applyPower(s: BrickBashState, type: PowerType): BrickBashState {
  switch (type) {
    case 'expand':
    case 'laser':
    case 'catch': {
      // Si se deja de usar el imán, se sueltan las bolas pegadas
      const balls = s.mode === 'catch' && type !== 'catch' ? s.balls.map((b) => (b.stuck !== null ? launch(b, s) : b)) : s.balls
      return { ...s, mode: type, balls }
    }
    case 'slow':
      return { ...s, slowMs: SLOW_MS }
    case 'life':
      return { ...s, lives: Math.min(MAX_LIVES, s.lives + 1) }
    case 'multi': {
      const source = s.balls[0]
      if (!source) return s
      const free = source.stuck !== null ? launch(source, s) : source
      const extra = [rotate(free, 0.45), rotate(free, -0.45)].map((b) => ({ ...b, stuck: null }))
      return { ...s, balls: [free, ...s.balls.slice(1), ...extra].slice(0, MAX_BALLS) }
    }
  }
}

// ─── Simulación ──────────────────────────────────────────────────────────────

function hitBrick(s: BrickBashState, brick: Brick, rng: Rng): void {
  if (brick.hp === -1) {
    s.events.push({ type: 'metal', x: brick.x + brick.w / 2, y: brick.y + brick.h / 2 })
    return
  }
  brick.hp -= 1
  s.combo += 1
  const destroyed = brick.hp <= 0
  const points = destroyed ? BRICK_POINTS[brick.maxHp]! * comboMultiplier(s.combo) : 10
  s.score += points
  s.events.push({
    type: 'brick',
    x: brick.x + brick.w / 2,
    y: brick.y + brick.h / 2,
    color: brick.color,
    destroyed,
    points,
    combo: s.combo,
  })
  if (destroyed && rng() < DIFFICULTIES[s.difficulty].dropChance) {
    s.capsules.push({ x: brick.x + brick.w / 2, y: brick.y + brick.h / 2, type: pickPower(rng) })
  }
}

/** Evita trayectorias casi horizontales que se quedan rebotando eternamente. */
function keepVertical(b: Ball) {
  if (Math.abs(b.dy) < MIN_VERTICAL) {
    b.dy = MIN_VERTICAL * Math.sign(b.dy || -1)
    b.dx = Math.sign(b.dx || 1) * Math.sqrt(1 - b.dy * b.dy)
  }
}

function stepBall(s: BrickBashState, b: Ball, ms: number, rng: Rng): boolean {
  const pw = paddleWidth(s)
  if (b.stuck !== null) {
    b.x = clamp(s.paddle.x + b.stuck, BALL_R, FIELD_W - BALL_R)
    b.y = s.paddle.y - BALL_R - 1
    if (s.mode === 'catch') {
      b.stuckMs += ms
      if (b.stuckMs >= CATCH_RELEASE_MS) Object.assign(b, launch(b, s))
    }
    return true
  }

  const speed = b.speed * (s.slowMs > 0 ? SLOW_FACTOR : 1)
  b.x += b.dx * speed * (ms / 1000)
  b.y += b.dy * speed * (ms / 1000)

  // Paredes
  if (b.x < BALL_R) {
    b.x = BALL_R
    b.dx = Math.abs(b.dx)
    s.events.push({ type: 'wall' })
  } else if (b.x > FIELD_W - BALL_R) {
    b.x = FIELD_W - BALL_R
    b.dx = -Math.abs(b.dx)
    s.events.push({ type: 'wall' })
  }
  if (b.y < BALL_R) {
    b.y = BALL_R
    b.dy = Math.abs(b.dy)
    s.events.push({ type: 'wall' })
  }

  // Pala
  const top = s.paddle.y - PADDLE_H / 2
  if (
    b.dy > 0 &&
    b.y + BALL_R >= top &&
    b.y - BALL_R <= s.paddle.y + PADDLE_H / 2 &&
    Math.abs(b.x - s.paddle.x) <= pw / 2 + BALL_R
  ) {
    const offset = b.x - s.paddle.x
    b.y = top - BALL_R
    s.combo = 0
    s.events.push({ type: 'paddle' })
    if (s.mode === 'catch') {
      b.stuck = clamp(offset, -pw / 2, pw / 2)
      b.stuckMs = 0
    } else {
      Object.assign(b, bounceDirection(offset, pw / 2))
      b.speed = Math.min(DIFFICULTIES[s.difficulty].maxSpeed, b.speed * SPEED_UP_PER_HIT)
    }
    return true
  }

  // Ladrillos: como mucho uno por paso
  for (const brick of s.bricks) {
    if (brick.hp === 0) continue
    const cx = brick.x + brick.w / 2
    const cy = brick.y + brick.h / 2
    const ox = brick.w / 2 + BALL_R - Math.abs(b.x - cx)
    const oy = brick.h / 2 + BALL_R - Math.abs(b.y - cy)
    if (ox <= 0 || oy <= 0) continue

    if (ox < oy) {
      b.x += Math.sign(b.x - cx || 1) * ox
      b.dx = Math.sign(b.x - cx || 1) * Math.abs(b.dx)
    } else {
      b.y += Math.sign(b.y - cy || 1) * oy
      b.dy = Math.sign(b.y - cy || 1) * Math.abs(b.dy)
    }
    keepVertical(b)
    hitBrick(s, brick, rng)
    break
  }

  // Se pierde por abajo
  return b.y - BALL_R <= FIELD_H
}

function step(s: BrickBashState, ms: number, rng: Rng): void {
  // Pala
  const pw = paddleWidth(s)
  if (s.input.target !== null) {
    const diff = s.input.target - s.paddle.x
    const max = PADDLE_FOLLOW_SPEED * (ms / 1000)
    s.paddle.x += clamp(diff, -max, max)
  } else if (s.input.dir !== 0) {
    s.paddle.x += s.input.dir * PADDLE_SPEED * (ms / 1000)
  }
  s.paddle.x = clamp(s.paddle.x, pw / 2, FIELD_W - pw / 2)

  s.slowMs = Math.max(0, s.slowMs - ms)
  s.laserCooldown = Math.max(0, s.laserCooldown - ms)

  // Bolas
  s.balls = s.balls.filter((b) => stepBall(s, b, ms, rng))

  // Disparos de láser
  s.bullets = s.bullets.filter((bullet) => {
    bullet.y -= BULLET_SPEED * (ms / 1000)
    if (bullet.y < 0) return false
    const hit = s.bricks.find(
      (k) => k.hp !== 0 && bullet.x >= k.x && bullet.x <= k.x + k.w && bullet.y >= k.y && bullet.y <= k.y + k.h,
    )
    if (hit) {
      hitBrick(s, hit, rng)
      return false
    }
    return true
  })

  // Cápsulas que caen
  s.capsules = s.capsules.filter((c) => {
    c.y += CAPSULE_SPEED * (ms / 1000)
    const caught =
      Math.abs(c.x - s.paddle.x) <= paddleWidth(s) / 2 + CAPSULE_W / 2 &&
      Math.abs(c.y - s.paddle.y) <= PADDLE_H / 2 + CAPSULE_H / 2
    if (caught) {
      Object.assign(s, applyPower(s, c.type))
      s.score += CAPSULE_POINTS
      s.events.push({ type: 'power', power: c.type, x: c.x, y: c.y })
      return false
    }
    return c.y - CAPSULE_H / 2 <= FIELD_H
  })

  s.bricks = s.bricks.filter((k) => k.hp !== 0)

  // ¿Nivel superado? (el metal no cuenta)
  if (!s.bricks.some((k) => k.hp > 0)) {
    const bonus = 500 * s.level
    s.score += bonus
    s.status = 'cleared'
    s.events.push({ type: 'cleared', bonus })
    return
  }

  // ¿Bola perdida?
  if (s.balls.length === 0) {
    s.lives -= 1
    s.combo = 0
    s.events.push({ type: 'lost' })
    s.mode = 'none'
    s.slowMs = 0
    s.capsules = []
    s.bullets = []
    if (s.lives <= 0) {
      s.status = 'over'
      return
    }
    s.paddle.x = clamp(s.paddle.x, s.paddle.baseW / 2, FIELD_W - s.paddle.baseW / 2)
    s.balls = [serveBall(s)]
  }
}

/** Copia profunda solo de lo que la simulación modifica. */
function clone(s: BrickBashState): BrickBashState {
  return {
    ...s,
    paddle: { ...s.paddle },
    input: { ...s.input },
    balls: s.balls.map((b) => ({ ...b })),
    bricks: s.bricks.map((k) => ({ ...k })),
    capsules: s.capsules.map((c) => ({ ...c })),
    bullets: s.bullets.map((b) => ({ ...b })),
    events: [],
  }
}

/** Avanza el tiempo. Devuelve un estado nuevo (el anterior no se modifica). */
export function update(state: BrickBashState, dtMs: number, rng: Rng = Math.random): BrickBashState {
  if (state.status !== 'playing') return state
  const s = clone(state)
  s.acc += dtMs
  while (s.acc >= STEP_MS && s.status === 'playing') {
    step(s, STEP_MS, rng)
    s.acc -= STEP_MS
  }
  return s
}

export const destructibleLeft = (s: BrickBashState) => s.bricks.filter((k) => k.hp > 0).length
