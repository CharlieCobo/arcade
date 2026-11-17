import { describe, expect, it } from 'vitest'
import {
  MAX_QUEUED_TURNS,
  createGame,
  freeCells,
  pointsPerFood,
  spawnFood,
  step,
  tickMs,
  turn,
  type Direction,
  type Point,
  type SnakeConfig,
  type SnakeState,
} from './logic'

const first = () => 0

/** Estado a medida: serpiente (cabeza primero), dirección y comida. */
function makeState(
  snake: Point[],
  direction: Direction,
  food: Point | null,
  config: Partial<SnakeConfig> = {},
): SnakeState {
  const base = createGame({ cols: 5, rows: 5, ...config }, first)
  return { ...base, snake, direction, food }
}

const FAR_FOOD = { x: 4, y: 4 }

describe('createGame', () => {
  it('empieza en el centro, mirando a la derecha, con 3 segmentos y comida libre', () => {
    const s = createGame({}, first)
    expect(s.snake).toEqual([
      { x: 8, y: 8 },
      { x: 7, y: 8 },
      { x: 6, y: 8 },
    ])
    expect(s.direction).toBe('right')
    expect(s.status).toBe('playing')
    expect(s.food).not.toBeNull()
    expect(s.snake.some((p) => p.x === s.food!.x && p.y === s.food!.y)).toBe(false)
  })

  it('limita el nivel entre 1 y 9', () => {
    expect(createGame({ level: 0 }).config.level).toBe(1)
    expect(createGame({ level: 42 }).config.level).toBe(9)
  })
})

describe('step', () => {
  it('avanza sin crecer', () => {
    const s = step(makeState([{ x: 2, y: 2 }, { x: 1, y: 2 }, { x: 0, y: 2 }], 'right', FAR_FOOD))
    expect(s.snake).toEqual([{ x: 3, y: 2 }, { x: 2, y: 2 }, { x: 1, y: 2 }])
  })

  it('crece y suma puntos al comer', () => {
    const s = step(makeState([{ x: 2, y: 2 }, { x: 1, y: 2 }], 'right', { x: 3, y: 2 }, { level: 4 }), first)
    expect(s.snake).toHaveLength(3)
    expect(s.score).toBe(4) // clásico: puntos = nivel
    expect(s.eaten).toBe(1)
    expect(s.food).not.toBeNull()
  })

  it('modo clásico: chocar con la pared termina la partida', () => {
    const s = step(makeState([{ x: 4, y: 2 }, { x: 3, y: 2 }], 'right', FAR_FOOD, { mode: 'classic' }))
    expect(s.status).toBe('over')
  })

  it('modo sin paredes: aparece por el lado contrario', () => {
    const s = step(makeState([{ x: 4, y: 2 }, { x: 3, y: 2 }], 'right', FAR_FOOD, { mode: 'no-walls' }))
    expect(s.status).toBe('playing')
    expect(s.snake[0]).toEqual({ x: 0, y: 2 })
    const up = step(makeState([{ x: 1, y: 0 }, { x: 1, y: 1 }], 'up', FAR_FOOD, { mode: 'no-walls' }))
    expect(up.snake[0]).toEqual({ x: 1, y: 4 })
  })

  it('chocar consigo misma termina la partida', () => {
    // Cabeza en (2,2) yendo hacia abajo, contra su propio cuerpo en (2,3)
    const snake = [
      { x: 2, y: 2 },
      { x: 1, y: 2 },
      { x: 1, y: 3 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
    ]
    expect(step(makeState(snake, 'down', FAR_FOOD)).status).toBe('over')
  })

  it('puede entrar en la casilla que la cola deja libre en ese paso', () => {
    // Cuadrado 2x2: la cabeza va a donde está la cola
    const snake = [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 1, y: 2 },
    ]
    const s = step(makeState(snake, 'down', FAR_FOOD))
    expect(s.status).toBe('playing')
    expect(s.snake[0]).toEqual({ x: 1, y: 2 })
  })

  it('pero no si la serpiente crece en ese paso (la cola no se mueve)', () => {
    const snake = [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 1, y: 2 },
    ]
    // La comida está justo en la cola: imposible en juego real, pero comprueba la regla
    expect(step(makeState(snake, 'down', { x: 1, y: 2 })).status).toBe('over')
  })

  it('gana al llenar el tablero', () => {
    // Tablero 2x2 con 3 segmentos y la comida en la última casilla
    const s = step(
      makeState([{ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 }], 'right', { x: 1, y: 1 }, { cols: 2, rows: 2 }),
    )
    expect(s.status).toBe('won')
    expect(s.food).toBeNull()
  })

  it('no hace nada si la partida ha terminado', () => {
    const over = { ...createGame(), status: 'over' as const }
    expect(step(over)).toBe(over)
  })
})

describe('turn', () => {
  const s = makeState([{ x: 2, y: 2 }, { x: 1, y: 2 }], 'right', FAR_FOOD)

  it('no permite girar 180° ni repetir dirección', () => {
    expect(turn(s, 'left').queue).toEqual([])
    expect(turn(s, 'right').queue).toEqual([])
  })

  it('encola giros válidos y los aplica uno por paso', () => {
    const q = turn(turn(s, 'up'), 'left')
    expect(q.queue).toEqual(['up', 'left'])
    const s1 = step(q)
    expect(s1.direction).toBe('up')
    expect(s1.snake[0]).toEqual({ x: 2, y: 1 })
    const s2 = step(s1)
    expect(s2.direction).toBe('left')
    expect(s2.snake[0]).toEqual({ x: 1, y: 1 })
  })

  it('valida contra el último giro encolado, no contra la dirección actual', () => {
    // up → down sería un 180° respecto al giro pendiente
    expect(turn(turn(s, 'up'), 'down').queue).toEqual(['up'])
  })

  it(`no encola más de ${MAX_QUEUED_TURNS} giros`, () => {
    const q = turn(turn(turn(s, 'up'), 'left'), 'down')
    expect(q.queue).toHaveLength(MAX_QUEUED_TURNS)
  })
})

describe('comida', () => {
  it('nunca aparece sobre la serpiente', () => {
    const snake = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }]
    for (const r of [0, 0.3, 0.6, 0.999]) {
      const food = spawnFood(snake, 3, 2, () => r)!
      expect(snake.some((p) => p.x === food.x && p.y === food.y)).toBe(false)
    }
  })

  it('devuelve null si no queda sitio', () => {
    const snake = freeCells([], 2, 1)
    expect(spawnFood(snake, 2, 1, first)).toBeNull()
  })
})

describe('velocidad y puntos', () => {
  it('clásico: más nivel, más rápido y más puntos', () => {
    const slow = createGame({ mode: 'classic', level: 1 })
    const fast = createGame({ mode: 'classic', level: 9 })
    expect(tickMs(slow)).toBeGreaterThan(tickMs(fast))
    expect(pointsPerFood(slow)).toBe(1)
    expect(pointsPerFood(fast)).toBe(9)
  })

  it('sin paredes: acelera cada 5 comidas, con un mínimo', () => {
    const base = createGame({ mode: 'no-walls' })
    expect(tickMs({ ...base, eaten: 5 })).toBeLessThan(tickMs(base))
    expect(tickMs({ ...base, eaten: 4 })).toBe(tickMs(base))
    expect(tickMs({ ...base, eaten: 1000 })).toBe(70)
    expect(pointsPerFood({ ...base, eaten: 0 })).toBe(1)
    expect(pointsPerFood({ ...base, eaten: 10 })).toBe(3)
  })
})
