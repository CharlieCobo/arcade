import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { BALL_R, FIELD_H, FIELD_W, PADDLE_H, PADDLE_W, PADDLE_Y, type GameEvent, type PongState, type Side } from '../logic'
import type { Phase } from '../usePingPong'
import styles from '../PingPong.module.css'

interface Props {
  stateRef: RefObject<PongState>
  fxQueue: RefObject<GameEvent[]>
  phase: Phase
  /** En 2 jugadores, el marcador de arriba se dibuja girado hacia ese jugador */
  flipTop: boolean
  children?: ReactNode
}

const COLORS: Record<Side, string> = { bottom: '#ff5d8f', top: '#4cc9f0' }
const TEXT = '#eef0ff'
const TRAIL = 8

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  color: string
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}

/** Mesa dibujada en canvas a partir de las coordenadas lógicas; los efectos son solo visuales. */
export function Table({ stateRef, fxQueue, phase, flipTop, children }: Props) {
  const { t } = useTranslation('ping-pong')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const live = useRef({ phase, flipTop })
  useEffect(() => {
    live.current = { phase, flipTop }
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    let scale = 1
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      scale = canvas.width / FIELD_W
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const particles: Particle[] = []
    const trail: { x: number; y: number }[] = []
    const squash: Record<Side, number> = { bottom: 0, top: 0 }
    let flash: { side: Side; life: number } | null = null
    let last = performance.now()
    let raf = 0

    const onEvent = (e: GameEvent) => {
      if (e.type === 'hit') {
        squash[e.side] = 1
        const n = e.rally % 10 === 0 ? 24 : 8 // celebración cada 10 golpes de rally
        for (let i = 0; i < n; i++) {
          const a = (e.side === 'bottom' ? -Math.PI : 0) + Math.random() * Math.PI
          const v = 60 + Math.random() * (e.rally % 10 === 0 ? 200 : 90)
          particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.35 + Math.random() * 0.25, color: COLORS[e.side] })
        }
      } else if (e.type === 'point') {
        flash = { side: e.scorer, life: 0 }
        trail.length = 0
      } else if (e.type === 'serve') {
        trail.length = 0
      }
    }

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const s = stateRef.current
      const { phase: ph, flipTop: flip } = live.current
      const q = fxQueue.current
      while (q.length) onEvent(q.shift()!)

      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      ctx.clearRect(0, 0, FIELD_W, FIELD_H)

      // Rejilla LCD
      ctx.fillStyle = 'rgb(255 255 255 / 0.04)'
      for (let y = 10; y < FIELD_H; y += 16) for (let x = 8; x < FIELD_W; x += 16) ctx.fillRect(x - 1, y - 1, 2, 2)

      // Destello del lado que gana el punto
      if (flash) {
        flash.life += dt
        if (flash.life > 0.5) flash = null
        else {
          ctx.globalAlpha = 0.18 * (1 - flash.life / 0.5)
          ctx.fillStyle = COLORS[flash.side]
          ctx.fillRect(0, flash.side === 'bottom' ? FIELD_H / 2 : 0, FIELD_W, FIELD_H / 2)
          ctx.globalAlpha = 1
        }
      }

      // Red
      ctx.strokeStyle = 'rgb(139 143 184 / 0.45)'
      ctx.lineWidth = 2
      ctx.setLineDash([8, 8])
      ctx.beginPath()
      ctx.moveTo(6, FIELD_H / 2)
      ctx.lineTo(FIELD_W - 6, FIELD_H / 2)
      ctx.stroke()
      ctx.setLineDash([])

      // Marcador grande y tenue a cada lado de la red
      ctx.font = `700 64px 'Space Grotesk', system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = 'rgb(238 240 255 / 0.1)'
      ctx.fillText(String(s.score.bottom), FIELD_W / 2, FIELD_H / 2 + 52)
      ctx.save()
      ctx.translate(FIELD_W / 2, FIELD_H / 2 - 52)
      if (flip) ctx.rotate(Math.PI)
      ctx.fillText(String(s.score.top), 0, 0)
      ctx.restore()

      // Palas (se "aplastan" un instante al golpear)
      for (const side of ['bottom', 'top'] as Side[]) {
        squash[side] = Math.max(0, squash[side] - dt * 6)
        const k = squash[side]
        const w = PADDLE_W * (1 + 0.12 * k)
        const h = PADDLE_H * (1 - 0.3 * k)
        const x = s.paddles[side].x - w / 2
        const y = PADDLE_Y[side] - h / 2
        ctx.fillStyle = COLORS[side]
        rr(ctx, x, y, w, h, h / 2)
        ctx.fillStyle = 'rgb(255 255 255 / 0.3)'
        rr(ctx, x + 5, y + 2, w - 10, 2.5, 1.25)
      }

      // Bola: parpadea en el centro mientras espera el saque; con estela en juego
      const waiting = s.serveMs > 0
      if (ph === 'playing' && !waiting) {
        trail.unshift({ x: s.ball.x, y: s.ball.y })
        if (trail.length > TRAIL) trail.pop()
      }
      trail.forEach((p, i) => {
        if (i === 0) return
        ctx.globalAlpha = 0.22 * (1 - i / TRAIL)
        ctx.fillStyle = TEXT
        ctx.beginPath()
        ctx.arc(p.x, p.y, BALL_R * (1 - i / (TRAIL * 1.6)), 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.globalAlpha = waiting && ph === 'playing' ? 0.35 + 0.65 * Math.abs(Math.sin(now / 180)) : 1
      ctx.fillStyle = TEXT
      ctx.beginPath()
      ctx.arc(s.ball.x, s.ball.y, BALL_R, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1

      // Partículas
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]!
        p.life += dt
        if (p.life >= p.max) {
          particles.splice(i, 1)
          continue
        }
        p.x += p.vx * dt
        p.y += p.vy * dt
        ctx.globalAlpha = 1 - p.life / p.max
        ctx.fillStyle = p.color
        ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3)
      }
      ctx.globalAlpha = 1

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [stateRef, fxQueue])

  return (
    <div className={styles.table}>
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={t('board.label')} />
      {children}
    </div>
  )
}
