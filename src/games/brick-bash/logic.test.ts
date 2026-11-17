import { describe, expect, it } from 'vitest'
import { LEVELS } from './levels'
import {
  BALL_R,
  DIFFICULTIES,
  EXPAND_FACTOR,
  FIELD_H,
  FIELD_W,
  MAX_COMBO_MULTIPLIER,
  PADDLE_Y,
  SLOW_MS,
  action,
  applyPower,
  bounceDirection,
  buildBricks,
  comboMultiplier,
  createGame,
  destructibleLeft,
  levelSpeed,
  nextLevel,
  paddleWidth,
  pickPower,
  setDir,
  setTarget,
  update,
  type Ball,
  type BrickBashState,
  type Brick,
} from './logic'

const never = () => 0.999 // nunca suelta power-ups
const always = () => 0 // siempre suelta (y elige el primero: expand)

/** Bola libre en una posición y dirección concretas. */
const ball = (x: number, y: number, dx: number, dy: number, speed = 200): Ball => {
  const len = Math.hypot(dx, dy)
  return { x, y, dx: dx / len, dy: dy / len, speed, stuck: null, stuckMs: 0 }
}

const brick = (x: number, y: number, hp = 1, extra: Partial<Brick> = {}): Brick => ({
  id: x * 1000 + y,
  x,
  y,
  w: 30,
  h: 14,
  hp,
  maxHp: hp,
  color: '#fff',
  ...extra,
})

/** Partida controlada: sin ladrillos salvo los indicados (y uno lejano para no superar el nivel). */
function arena(balls: Ball[], bricks: Brick[] = [], extra: Partial<BrickBashState> = {}): BrickBashState {
  const far = brick(0, 0, -1) // metal: no cuenta
  const keep = brick(280, 20, 3) // ladrillo lejano para que el nivel no se dé por superado
  return { ...createGame('normal'), balls, bricks: [far, keep, ...bricks], ...extra }
}

describe('niveles', () => {
  it('todos los diseños tienen 10 columnas y algo que romper', () => {
    for (const def of LEVELS) {
      for (const row of def.rows) expect(row).toHaveLength(10)
      expect(def.rows.join('')).toMatch(/[123]/)
    }
  })

  it('crea los ladrillos con su vida y el metal irrompible', () => {
    const bricks = buildBricks(4) // fortaleza: tiene metal
    expect(bricks.some((b) => b.hp === -1)).toBe(true)
    expect(bricks.every((b) => b.x >= 0 && b.x + b.w <= FIELD_W)).toBe(true)
  })

  it('cada nivel es un poco más rápido, y más aún tras completar todos', () => {
    expect(levelSpeed('normal', 2)).toBeGreaterThan(levelSpeed('normal', 1))
    expect(levelSpeed('normal', LEVELS.length + 1)).toBeGreaterThan(levelSpeed('normal', 1))
    expect(levelSpeed('normal', 999)).toBeLessThanOrEqual(DIFFICULTIES.normal.maxSpeed)
  })
})

describe('dificultades', () => {
  it('más difícil = menos vidas, pala más estrecha, bola más rápida, menos power-ups', () => {
    const { easy, normal, hard } = DIFFICULTIES
    expect(easy.lives).toBeGreaterThan(normal.lives)
    expect(normal.lives).toBeGreaterThan(hard.lives)
    expect(easy.paddleW).toBeGreaterThan(hard.paddleW)
    expect(hard.speed).toBeGreaterThan(easy.speed)
    expect(hard.dropChance).toBeLessThan(easy.dropChance)
  })

  it('la partida empieza con las vidas de su dificultad y la bola en la pala', () => {
    const s = createGame('hard')
    expect(s.lives).toBe(DIFFICULTIES.hard.lives)
    expect(s.balls[0]!.stuck).not.toBeNull()
  })
})

describe('bola y pala', () => {
  it('el saque lanza la bola hacia arriba', () => {
    const s = update(action(createGame()), 50, never)
    const b = s.balls[0]!
    expect(b.stuck).toBeNull()
    expect(b.dy).toBeLessThan(0)
    expect(b.y).toBeLessThan(PADDLE_Y)
  })

  it('rebota en las paredes', () => {
    const s = update(arena([ball(BALL_R + 1, 200, -1, -1)]), 20, never)
    expect(s.balls[0]!.dx).toBeGreaterThan(0)
    expect(s.events.some((e) => e.type === 'wall')).toBe(true)
  })

  it('el ángulo depende del punto de la pala: centro recto, bordes inclinados', () => {
    expect(bounceDirection(0, 30).dx).toBeCloseTo(0)
    expect(bounceDirection(30, 30).dx).toBeGreaterThan(0.8)
    expect(bounceDirection(-30, 30).dx).toBeLessThan(-0.8)
    expect(bounceDirection(30, 30).dy).toBeLessThan(0)
  })

  it('al tocar la pala, la bola sube y el combo se reinicia', () => {
    const s0 = arena([ball(FIELD_W / 2 + 10, PADDLE_Y - 12, 0, 1)], [], { combo: 7 })
    const s = update(s0, 40, never)
    expect(s.balls[0]!.dy).toBeLessThan(0)
    expect(s.balls[0]!.dx).toBeGreaterThan(0)
    expect(s.combo).toBe(0)
  })

  it('la pala sigue al dedo y no se sale del campo', () => {
    let s = setTarget(createGame(), 0)
    s = update(s, 1000, never)
    expect(s.paddle.x).toBeCloseTo(paddleWidth(s) / 2)
    s = update(setDir(setTarget(s, null), 1), 3000, never)
    expect(s.paddle.x).toBeCloseTo(FIELD_W - paddleWidth(s) / 2)
  })
})

describe('ladrillos', () => {
  it('romper un ladrillo suma puntos y rebota la bola', () => {
    const s = update(arena([ball(115, 140, 0, -1)], [brick(100, 110)]), 60, never)
    expect(s.bricks.find((b) => b.x === 100)).toBeUndefined()
    expect(s.score).toBe(50)
    expect(s.balls[0]!.dy).toBeGreaterThan(0)
  })

  it('los ladrillos duros necesitan varios golpes', () => {
    const s = update(arena([ball(115, 140, 0, -1)], [brick(100, 110, 2)]), 60, never)
    expect(s.bricks.find((b) => b.x === 100)?.hp).toBe(1)
  })

  it('el metal no se rompe', () => {
    const s = update(arena([ball(115, 140, 0, -1)], [brick(100, 110, -1)]), 60, never)
    expect(s.bricks.find((b) => b.x === 100)?.hp).toBe(-1)
    expect(s.events.some((e) => e.type === 'metal')).toBe(true)
  })

  it('el combo multiplica los puntos, con un máximo', () => {
    expect(comboMultiplier(1)).toBe(1)
    expect(comboMultiplier(5)).toBe(2)
    expect(comboMultiplier(1000)).toBe(MAX_COMBO_MULTIPLIER)
  })

  it('se supera el nivel cuando solo queda metal', () => {
    const s0 = { ...createGame(), balls: [ball(115, 140, 0, -1)], bricks: [brick(100, 110), brick(0, 0, -1)] }
    const s = update(s0, 60, never)
    expect(s.status).toBe('cleared')
    expect(destructibleLeft(s)).toBe(0)
    const next = nextLevel(s)
    expect(next.level).toBe(2)
    expect(next.score).toBe(s.score)
    expect(next.lives).toBe(s.lives)
    expect(next.status).toBe('playing')
  })

  it('puede soltar un power-up según la dificultad', () => {
    const s = update(arena([ball(115, 140, 0, -1)], [brick(100, 110)]), 60, always)
    expect(s.capsules).toHaveLength(1)
  })
})

describe('vidas', () => {
  it('perder la bola quita una vida y vuelve a sacar', () => {
    const s0 = arena([ball(20, FIELD_H - 2, 0, 1)], [], { mode: 'laser', slowMs: 5000 })
    const s = update(s0, 100, never)
    expect(s.lives).toBe(s0.lives - 1)
    expect(s.balls).toHaveLength(1)
    expect(s.balls[0]!.stuck).not.toBeNull()
    expect(s.mode).toBe('none') // se pierden los power-ups
    expect(s.slowMs).toBe(0)
  })

  it('sin vidas, se acaba la partida', () => {
    const s = update(arena([ball(20, FIELD_H - 2, 0, 1)], [], { lives: 1 }), 100, never)
    expect(s.status).toBe('over')
  })

  it('con multibola, solo se pierde la vida al caer la última', () => {
    const s = update(arena([ball(20, FIELD_H - 2, 0, 1), ball(160, 200, 0, -1)]), 100, never)
    expect(s.lives).toBe(createGame().lives)
    expect(s.balls).toHaveLength(1)
  })
})

describe('power-ups', () => {
  const base = () => arena([ball(160, 300, 0.3, -1)])

  it('ensanchar hace la pala más ancha', () => {
    const s = applyPower(base(), 'expand')
    expect(paddleWidth(s)).toBeCloseTo(s.paddle.baseW * EXPAND_FACTOR)
  })

  it('multibola crea 3 bolas', () => {
    expect(applyPower(base(), 'multi').balls).toHaveLength(3)
  })

  it('vida extra suma una vida', () => {
    const s = base()
    expect(applyPower(s, 'life').lives).toBe(s.lives + 1)
  })

  it('lento reduce la velocidad durante un tiempo', () => {
    const s = applyPower(base(), 'slow')
    expect(s.slowMs).toBe(SLOW_MS)
    const normal = update(base(), 100, never).balls[0]!
    const slow = update(s, 100, never).balls[0]!
    expect(300 - slow.y).toBeLessThan(300 - normal.y)
  })

  it('imán: la bola se queda pegada a la pala y se suelta con la acción', () => {
    let s = applyPower(arena([ball(FIELD_W / 2, PADDLE_Y - 12, 0, 1)]), 'catch')
    s = update(s, 40, never)
    expect(s.balls[0]!.stuck).not.toBeNull()
    s = update(action(s), 20, never)
    expect(s.balls[0]!.stuck).toBeNull()
    expect(s.balls[0]!.dy).toBeLessThan(0)
  })

  it('láser: dispara dos rayos que rompen ladrillos', () => {
    // Los rayos salen de los bordes de la pala: el ladrillo está bajo el izquierdo
    let s = applyPower(arena([ball(20, 200, 0, -1)], [brick(120, 110)]), 'laser')
    s = { ...s, paddle: { ...s.paddle, x: 160 } }
    s = action(s)
    expect(s.bullets).toHaveLength(2)
    s = update(s, 1000, never)
    expect(s.bricks.find((b) => b.x === 120)).toBeUndefined()
  })

  it('las cápsulas se recogen con la pala', () => {
    const s0 = arena([ball(20, 200, 0, -1)], [], { capsules: [{ x: FIELD_W / 2, y: PADDLE_Y - 30, type: 'life' }] })
    const s = update(s0, 600, never)
    expect(s.capsules).toHaveLength(0)
    expect(s.lives).toBe(s0.lives + 1)
    expect(s.events.some((e) => e.type === 'power')).toBe(true)
  })

  it('el generador elige power-ups según su peso', () => {
    expect(pickPower(() => 0)).toBe('expand')
    expect(pickPower(() => 0.9999)).toBe('life')
  })
})

describe('estado inmutable', () => {
  it('update no modifica el estado anterior', () => {
    const s0 = arena([ball(115, 140, 0, -1)], [brick(100, 110)])
    const snapshot = JSON.stringify(s0)
    update(s0, 60, never)
    expect(JSON.stringify(s0)).toBe(snapshot)
  })
})
