import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BALL_R,
  CAPSULE_H,
  CAPSULE_W,
  FIELD_H,
  FIELD_W,
  PADDLE_H,
  POWER_COLORS,
  POWER_LETTERS,
  paddleWidth,
  type BrickBashState,
  type GameEvent,
} from '../logic'
import type { Phase } from '../useBrickBash'
import styles from '../BrickBash.module.css'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  color: string
  size: number
}

interface FloatText {
  x: number
  y: number
  text: string
  color: string
  life: number
}

interface Props {
  stateRef: RefObject<BrickBashState>
  fxQueue: RefObject<GameEvent[]>
  phase: Phase
  comboLabel: (n: number) => string
  children?: ReactNode
}

const PINK = '#ff5d8f'
const CYAN = '#4cc9f0'
const GREEN = '#5ad65a'
const TEXT = '#eef0ff'
const TRAIL = 7

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}

/**
 * Dibuja el juego en un canvas escalado desde las coordenadas lógicas.
 * Los efectos (partículas, textos, estela) son solo visuales y viven aquí.
 */
export function Board({ stateRef, fxQueue, phase, comboLabel, children }: Props) {
  const { t } = useTranslation('brick-bash')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phaseRef = useRef(phase)
  const comboRef = useRef(comboLabel)
  useEffect(() => {
    phaseRef.current = phase
    comboRef.current = comboLabel
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
    const texts: FloatText[] = []
    const trails: { x: number; y: number }[][] = []
    let last = performance.now()
    let raf = 0

    const spawnFx = (e: GameEvent) => {
      if (e.type === 'brick' && e.destroyed) {
        for (let i = 0; i < 10; i++) {
          const a = Math.random() * Math.PI * 2
          const v = 40 + Math.random() * 110
          particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0, max: 0.5 + Math.random() * 0.3, color: e.color, size: 2 + Math.random() * 2.5 })
        }
        texts.push({ x: e.x, y: e.y, text: `+${e.points}`, color: TEXT, life: 0 })
        if (e.combo > 0 && e.combo % 5 === 0) texts.push({ x: e.x, y: e.y - 14, text: comboRef.current(1 + Math.floor(e.combo / 5)), color: PINK, life: 0 })
      } else if (e.type === 'metal') {
        for (let i = 0; i < 4; i++) particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120, life: 0, max: 0.25, color: '#ffffff', size: 1.5 })
      } else if (e.type === 'power') {
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2
          particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0, max: 0.45, color: POWER_COLORS[e.power], size: 2.5 })
        }
      }
    }

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const s = stateRef.current
      const ph = phaseRef.current

      const queue = fxQueue.current
      while (queue.length) spawnFx(queue.shift()!)

      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      ctx.clearRect(0, 0, FIELD_W, FIELD_H)

      // Rejilla de puntos tipo LCD (como en los otros juegos)
      ctx.fillStyle = 'rgb(255 255 255 / 0.04)'
      for (let y = 8; y < FIELD_H; y += 16) for (let x = 8; x < FIELD_W; x += 16) ctx.fillRect(x - 1, y - 1, 2, 2)

      // Ladrillos
      for (const b of s.bricks) {
        if (b.hp === -1) {
          ctx.fillStyle = b.color
          rr(ctx, b.x, b.y, b.w, b.h, 3)
          ctx.fillStyle = 'rgb(255 255 255 / 0.35)'
          ctx.beginPath()
          ctx.moveTo(b.x + b.w * 0.25, b.y + b.h)
          ctx.lineTo(b.x + b.w * 0.45, b.y)
          ctx.lineTo(b.x + b.w * 0.55, b.y)
          ctx.lineTo(b.x + b.w * 0.35, b.y + b.h)
          ctx.fill()
          continue
        }
        ctx.fillStyle = b.color
        rr(ctx, b.x, b.y, b.w, b.h, 3)
        ctx.fillStyle = 'rgb(255 255 255 / 0.25)'
        rr(ctx, b.x + 2, b.y + 2, b.w - 4, 3, 1.5)
        if (b.maxHp > 1) {
          // Ladrillos duros: marco interior; al dañarse se oscurecen y se agrietan
          ctx.strokeStyle = 'rgb(15 16 32 / 0.45)'
          ctx.lineWidth = 1.5
          ctx.strokeRect(b.x + 2.5, b.y + 2.5, b.w - 5, b.h - 5)
          const damage = (b.maxHp - b.hp) / b.maxHp
          if (damage > 0) {
            ctx.fillStyle = `rgb(15 16 32 / ${0.15 + damage * 0.35})`
            rr(ctx, b.x, b.y, b.w, b.h, 3)
            ctx.strokeStyle = 'rgb(15 16 32 / 0.8)'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(b.x + b.w * 0.3, b.y)
            ctx.lineTo(b.x + b.w * 0.42, b.y + b.h * 0.5)
            ctx.lineTo(b.x + b.w * 0.35, b.y + b.h)
            if (damage > 0.5) {
              ctx.moveTo(b.x + b.w * 0.7, b.y)
              ctx.lineTo(b.x + b.w * 0.6, b.y + b.h * 0.6)
            }
            ctx.stroke()
          }
        }
      }

      // Cápsulas de power-up
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `700 9px 'Space Grotesk', system-ui, sans-serif`
      for (const c of s.capsules) {
        ctx.fillStyle = POWER_COLORS[c.type]
        rr(ctx, c.x - CAPSULE_W / 2, c.y - CAPSULE_H / 2, CAPSULE_W, CAPSULE_H, CAPSULE_H / 2)
        ctx.fillStyle = '#0f1020'
        ctx.fillText(POWER_LETTERS[c.type], c.x, c.y + 0.5)
      }

      // Rayos láser
      ctx.fillStyle = PINK
      for (const b of s.bullets) rr(ctx, b.x - 1.5, b.y - 6, 3, 10, 1.5)

      // Pala
      const pw = paddleWidth(s)
      const px = s.paddle.x - pw / 2
      const py = s.paddle.y - PADDLE_H / 2
      ctx.fillStyle = PINK
      rr(ctx, px, py, pw, PADDLE_H, PADDLE_H / 2)
      ctx.fillStyle = 'rgb(255 255 255 / 0.3)'
      rr(ctx, px + 4, py + 2, pw - 8, 2.5, 1.25)
      if (s.mode === 'laser') {
        ctx.fillStyle = CYAN
        rr(ctx, px + 1, py - 5, 6, 8, 2)
        rr(ctx, px + pw - 7, py - 5, 6, 8, 2)
      } else if (s.mode === 'catch') {
        ctx.fillStyle = GREEN
        rr(ctx, px + 6, py - 1.5, pw - 12, 3, 1.5)
      }

      // Bolas con estela
      if (ph === 'playing') {
        s.balls.forEach((b, i) => {
          const trail = (trails[i] ??= [])
          trail.unshift({ x: b.x, y: b.y })
          if (trail.length > TRAIL) trail.pop()
        })
        trails.length = s.balls.length
      } else if (ph === 'ready') {
        trails.length = 0
      }
      const ballColor = s.slowMs > 0 ? '#f59a3a' : TEXT
      s.balls.forEach((b, i) => {
        const trail = trails[i] ?? []
        trail.forEach((p, k) => {
          if (k === 0) return
          ctx.globalAlpha = 0.25 * (1 - k / TRAIL)
          ctx.fillStyle = ballColor
          ctx.beginPath()
          ctx.arc(p.x, p.y, BALL_R * (1 - k / (TRAIL * 1.6)), 0, Math.PI * 2)
          ctx.fill()
        })
        ctx.globalAlpha = 1
        ctx.fillStyle = ballColor
        ctx.beginPath()
        ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2)
        ctx.fill()
      })

      // Partículas y textos flotantes
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]!
        p.life += dt
        if (p.life >= p.max) {
          particles.splice(i, 1)
          continue
        }
        p.vy += 320 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        ctx.globalAlpha = 1 - p.life / p.max
        ctx.fillStyle = p.color
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
      }
      ctx.font = `700 10px 'Space Grotesk', system-ui, sans-serif`
      for (let i = texts.length - 1; i >= 0; i--) {
        const f = texts[i]!
        f.life += dt
        if (f.life >= 0.8) {
          texts.splice(i, 1)
          continue
        }
        ctx.globalAlpha = 1 - f.life / 0.8
        ctx.fillStyle = f.color
        ctx.fillText(f.text, f.x, f.y - f.life * 30)
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
    <div className={styles.board}>
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={t('board.label')} />
      {children}
    </div>
  )
}
