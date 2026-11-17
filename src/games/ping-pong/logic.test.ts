import { describe, expect, it } from 'vitest'
import {
  BALL_R,
  CPU,
  FIELD_H,
  FIELD_W,
  MAX_SPEED,
  PADDLE_W,
  PADDLE_Y,
  SERVE_MS,
  START_SPEED,
  bounceDirection,
  createGame,
  predictX,
  setDir,
  setTarget,
  update,
  type Ball,
  type PongState,
} from './logic'

const mid = () => 0.5 // saque recto y CPU sin error

/** Partida ya en juego (sin espera de saque) con la bola donde queramos. */
function inPlay(ball: Partial<Ball>, extra: Partial<PongState> = {}): PongState {
  const s = createGame({ mode: 'pvp' }, mid)
  const b = { ...s.ball, dx: 0, dy: 1, ...ball }
  const len = Math.hypot(b.dx, b.dy)
  return { ...s, serveMs: 0, ball: { ...b, dx: b.dx / len, dy: b.dy / len }, ...extra }
}

describe('saque', () => {
  it('la bola espera en el centro y luego sale hacia quien recibe', () => {
    const s0 = createGame({}, mid)
    const waiting = update(s0, SERVE_MS - 50, mid)
    expect(waiting.ball.dy).toBe(0)
    const served = update(waiting, 100, mid)
    expect(served.ball.dy).toBeGreaterThan(0) // hacia abajo: recibe el jugador
    expect(served.events.some((e) => e.type === 'serve')).toBe(true)
  })
})

describe('rebotes', () => {
  it('rebota en las paredes laterales', () => {
    const s = update(inPlay({ x: BALL_R + 1, y: 200, dx: -1, dy: 0.5 }), 20, mid)
    expect(s.ball.dx).toBeGreaterThan(0)
  })

  it('el ángulo depende del punto de la pala', () => {
    expect(bounceDirection(0, 'bottom').dx).toBeCloseTo(0)
    expect(bounceDirection(0, 'bottom').dy).toBeLessThan(0)
    expect(bounceDirection(PADDLE_W / 2, 'bottom').dx).toBeGreaterThan(0.75)
    expect(bounceDirection(0, 'top').dy).toBeGreaterThan(0)
  })

  it('la pala de abajo devuelve la bola, acelera y cuenta el rally', () => {
    const s0 = inPlay({ x: FIELD_W / 2, y: PADDLE_Y.bottom - 20, dx: 0, dy: 1 })
    const s = update(s0, 60, mid)
    expect(s.ball.dy).toBeLessThan(0)
    expect(s.ball.speed).toBeGreaterThan(START_SPEED)
    expect(s.rally).toBe(1)
    expect(s.bestRally).toBe(1)
  })

  it('la pala de arriba también', () => {
    const s0 = inPlay({ x: FIELD_W / 2, y: PADDLE_Y.top + 20, dx: 0, dy: -1 })
    expect(update(s0, 60, mid).ball.dy).toBeGreaterThan(0)
  })

  it('la velocidad tiene un máximo', () => {
    let s = inPlay({ x: FIELD_W / 2, y: PADDLE_Y.bottom - 20, dx: 0, dy: 1, speed: MAX_SPEED })
    s = update(s, 60, mid)
    expect(s.ball.speed).toBe(MAX_SPEED)
  })
})

describe('puntos', () => {
  it('si la bola pasa por abajo, punto para el de arriba, y saca hacia quien perdió', () => {
    const s = update(inPlay({ x: 20, y: FIELD_H - 2, dx: 0, dy: 1 }), 100, mid)
    expect(s.score).toEqual({ bottom: 0, top: 1 })
    expect(s.receiver).toBe('bottom')
    expect(s.serveMs).toBeGreaterThan(0)
    expect(s.rally).toBe(0)
  })

  it('si pasa por arriba, punto para el de abajo', () => {
    const s = update(inPlay({ x: 20, y: 2, dx: 0, dy: -1 }), 100, mid)
    expect(s.score).toEqual({ bottom: 1, top: 0 })
    expect(s.receiver).toBe('top')
  })

  it('gana quien llega primero a los puntos del partido', () => {
    const s = update(inPlay({ x: 20, y: 2, dx: 0, dy: -1 }, { target: 5, score: { bottom: 4, top: 3 } }), 100, mid)
    expect(s.status).toBe('over')
    expect(s.winner).toBe('bottom')
    expect(s.events.some((e) => e.type === 'win')).toBe(true)
  })
})

describe('controles', () => {
  it('cada pala sigue su dedo sin salirse de la mesa', () => {
    let s = setTarget(setTarget(createGame({ mode: 'pvp' }), 'bottom', 0), 'top', FIELD_W)
    s = update(s, 500, mid)
    expect(s.paddles.bottom.x).toBeCloseTo(PADDLE_W / 2)
    expect(s.paddles.top.x).toBeCloseTo(FIELD_W - PADDLE_W / 2)
  })

  it('teclado: mover con dirección', () => {
    const s = update(setDir(createGame({ mode: 'pvp' }), 'bottom', 1), 100, mid)
    expect(s.paddles.bottom.x).toBeGreaterThan(FIELD_W / 2)
  })
})

describe('CPU', () => {
  it('predice dónde llegará la bola teniendo en cuenta los rebotes', () => {
    const straight: Ball = { x: 100, y: 300, dx: 0, dy: -1, speed: 200 }
    expect(predictX(straight, 34)).toBeCloseTo(100)
    // Diagonal que rebota en la pared derecha
    const d = Math.SQRT1_2
    const diagonal: Ball = { x: 280, y: 300, dx: d, dy: -d, speed: 200 }
    const x = predictX(diagonal, 34)
    expect(x).toBeGreaterThanOrEqual(BALL_R)
    expect(x).toBeLessThanOrEqual(FIELD_W - BALL_R)
    expect(x).toBeLessThan(280) // ha rebotado hacia la izquierda
  })

  it('la CPU va a por la bola cuando viene hacia ella', () => {
    const s0 = { ...inPlay({ x: 260, y: 120, dx: 0, dy: -1 }), mode: 'cpu' as const, cpuError: 0 }
    const s = update(s0, 300, mid)
    expect(s.paddles.top.x).toBeGreaterThan(FIELD_W / 2 + 40)
  })

  it('la CPU difícil es más rápida y precisa que la fácil', () => {
    expect(CPU.hard.speed).toBeGreaterThan(CPU.easy.speed)
    expect(CPU.hard.error).toBeLessThan(CPU.easy.error)
  })

  it('en 2 jugadores la pala de arriba no se mueve sola', () => {
    const s = update(inPlay({ x: 260, y: 120, dx: 0, dy: -1 }), 300, mid)
    expect(s.paddles.top.x).toBe(FIELD_W / 2)
  })
})

describe('estado inmutable', () => {
  it('update no modifica el estado anterior', () => {
    const s0 = inPlay({ x: FIELD_W / 2, y: PADDLE_Y.bottom - 20, dx: 0, dy: 1 })
    const snapshot = JSON.stringify(s0)
    update(s0, 60, mid)
    expect(JSON.stringify(s0)).toBe(snapshot)
  })
})
